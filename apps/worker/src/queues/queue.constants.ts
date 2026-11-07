export const QUEUE_NAMES = {
  RESUME_PARSE: 'resume-parse',
  CANDIDATE_MATCH: 'candidate-match',
  EMAIL_NOTIFICATION: 'email-notification',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface ResumeParseJobData {
  organizationId: string;
  resumeId: string;
  userId?: string;
}

export interface CandidateMatchJobData {
  organizationId: string;
  applicationId: string;
  jobId: string;
  candidateId: string;
  userId?: string;
}

export interface EmailNotificationJobData {
  organizationId?: string;
  notificationId?: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}
