import {
  scheduleInterviewSchema,
  submitInterviewFeedbackSchema,
} from '@recruitflow/validation';
import { z } from 'zod';

export { scheduleInterviewSchema, submitInterviewFeedbackSchema };

export const listInterviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  applicationId: z.string().optional(),
  jobId: z.string().optional(),
  status: z
    .enum(['SCHEDULED', 'RESCHEDULED', 'COMPLETED', 'CANCELED', 'NO_SHOW'])
    .optional(),
  type: z
    .enum(['PHONE_SCREEN', 'VIDEO', 'TECHNICAL', 'BEHAVIORAL', 'PANEL', 'ONSITE', 'FINAL'])
    .optional(),
  upcomingOnly: z
    .string()
    .transform((v) => v === 'true')
    .optional(),
});

export const rescheduleInterviewSchema = z.object({
  scheduledAt: z.string().min(1, 'New scheduled date and time is required'),
  durationMinutes: z.number().int().min(15).max(480).optional(),
  timezone: z.string().optional(),
  locationOrLink: z.string().max(500).optional(),
  agendaNotes: z.string().max(4000).optional(),
  participantUserIds: z.array(z.string()).optional(),
});

export const cancelInterviewSchema = z.object({
  cancelReason: z.string().max(1000).optional(),
});

export type ScheduleInterviewDto = z.infer<typeof scheduleInterviewSchema>;
export type RescheduleInterviewDto = z.infer<typeof rescheduleInterviewSchema>;
export type CancelInterviewDto = z.infer<typeof cancelInterviewSchema>;
export type SubmitInterviewFeedbackDto = z.infer<typeof submitInterviewFeedbackSchema>;
export type ListInterviewsQueryDto = z.infer<typeof listInterviewsQuerySchema>;
