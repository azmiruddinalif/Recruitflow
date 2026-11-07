import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import {
  QUEUE_NAMES,
  ResumeParseJobData,
  CandidateMatchJobData,
  EmailNotificationJobData,
} from './queues/queue.constants';
import { processResumeParseJob } from './processors/resume-parse.processor';
import { processCandidateMatchJob } from './processors/candidate-match.processor';
import { processEmailNotificationJob } from './processors/email-notification.processor';

const prisma = new PrismaClient();
const concurrency = Number(process.env.WORKER_CONCURRENCY || 5);

async function bootstrapWorker(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  console.info(`[RecruitFlow Worker] Starting background worker process...`);

  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) {
        return null;
      }
      return Math.min(times * 500, 2000);
    },
  });

  connection.on('error', (err) => {
    console.warn(`[RecruitFlow Worker] Redis connection warning: ${err.message}`);
  });

  try {
    await connection.connect();
    await connection.ping();
    console.info(`[RecruitFlow Worker] Connected to Redis at ${redisUrl}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[RecruitFlow Worker] Redis is offline (${message}). Running in standby mode without active BullMQ consumers; synchronous API fallbacks remain operational.`,
    );
    await connection.disconnect();
    // Keep process alive cleanly during local dev `pnpm dev` if Redis isn't running
    const keepAlive = setInterval(() => {}, 60_000);
    process.on('SIGINT', async () => {
      clearInterval(keepAlive);
      await prisma.$disconnect();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      clearInterval(keepAlive);
      await prisma.$disconnect();
      process.exit(0);
    });
    return;
  }

  const resumeWorker = new Worker<ResumeParseJobData>(
    QUEUE_NAMES.RESUME_PARSE,
    async (job) => processResumeParseJob(job, prisma),
    { connection, concurrency },
  );

  const matchWorker = new Worker<CandidateMatchJobData>(
    QUEUE_NAMES.CANDIDATE_MATCH,
    async (job) => processCandidateMatchJob(job, prisma),
    { connection, concurrency },
  );

  const emailWorker = new Worker<EmailNotificationJobData>(
    QUEUE_NAMES.EMAIL_NOTIFICATION,
    async (job) => processEmailNotificationJob(job, prisma),
    { connection, concurrency },
  );

  const workers = [resumeWorker, matchWorker, emailWorker];

  for (const w of workers) {
    w.on('completed', (job) => {
      console.info(`[RecruitFlow Worker] Completed job ${job.id} on queue "${w.name}"`);
    });
    w.on('failed', (job, error) => {
      console.error(
        `[RecruitFlow Worker] Failed job ${job?.id} on queue "${w.name}": ${error.message}`,
      );
    });
  }

  console.info(
    `[RecruitFlow Worker] Active queues: ${ Object.values(QUEUE_NAMES).join(', ') } (concurrency=${concurrency})`,
  );

  const shutdown = async (signal: string) => {
    console.info(`[RecruitFlow Worker] Received ${signal}, shutting down gracefully...`);
    await Promise.all(workers.map((w) => w.close()));
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrapWorker().catch((error) => {
  console.error('[RecruitFlow Worker] Fatal startup error:', error);
  process.exit(1);
});
