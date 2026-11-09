import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

export interface ResumeParseQueueJobData {
  organizationId: string;
  resumeId: string;
  userId?: string;
}

/**
 * Enqueues resume parsing onto the shared BullMQ "resume-parse" queue consumed
 * by the worker app. If Redis is unreachable, enqueueResumeParse returns false
 * so the caller can fall back to processing the AI call synchronously.
 */
@Injectable()
export class ResumeParseQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(ResumeParseQueueService.name);
  private queue: Queue | null = null;
  private connection: IORedis | null = null;
  private connectionUnavailable = false;

  private getQueue(): Queue | null {
    if (this.connectionUnavailable) return null;
    if (this.queue) return this.queue;

    this.connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null,
    });
    this.connection.on('error', (err) => {
      this.connectionUnavailable = true;
      this.logger.warn(`Redis unavailable for resume-parse queue, using synchronous fallback: ${err.message}`);
    });
    this.queue = new Queue('resume-parse', { connection: this.connection });
    return this.queue;
  }

  async enqueueResumeParse(data: ResumeParseQueueJobData): Promise<boolean> {
    const queue = this.getQueue();
    if (!queue) return false;

    try {
      await queue.add('parse', data, {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: 50,
      });
      return true;
    } catch (error) {
      this.connectionUnavailable = true;
      this.logger.warn(
        `Failed to enqueue resume-parse job, using synchronous fallback: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close().catch(() => undefined);
    await this.connection?.quit().catch(() => undefined);
  }
}
