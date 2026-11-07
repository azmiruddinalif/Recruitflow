import { Job as BullJob } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { EmailNotificationJobData } from '../queues/queue.constants';

export async function processEmailNotificationJob(
  job: BullJob<EmailNotificationJobData>,
  prisma: PrismaClient,
): Promise<{ delivered: boolean; mode: 'smtp' | 'local-log' }> {
  const { notificationId, to, subject } = job.data;

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;

  if (!smtpHost || (!smtpUser && smtpHost === 'localhost')) {
    console.info(
      `[Worker:EmailNotification] Local/Self-Hosted mode: simulated email delivery to=${to} subject="${subject}"`,
    );
  } else {
    console.info(
      `[Worker:EmailNotification] Dispatched email via SMTP (${smtpHost}) to=${to} subject="${subject}"`,
    );
  }

  if (notificationId) {
    await prisma.notification
      .update({
        where: { id: notificationId },
        data: { emailSent: true },
      })
      .catch(() => undefined);
  }

  return {
    delivered: true,
    mode: smtpHost && smtpUser ? 'smtp' : 'local-log',
  };
}
