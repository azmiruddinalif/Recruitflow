import {
  addApplicationNoteSchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
} from '@recruitflow/validation';
import { z } from 'zod';

export {
  addApplicationNoteSchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
};

export const listApplicationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  jobId: z.string().optional(),
  candidateId: z.string().optional(),
  status: z
    .enum([
      'NEW',
      'SCREENING',
      'SHORTLISTED',
      'INTERVIEW',
      'ASSESSMENT',
      'OFFER',
      'HIRED',
      'REJECTED',
      'WITHDRAWN',
    ])
    .optional(),
  assignedRecruiterId: z.string().optional(),
  search: z.string().optional(),
  minMatchScore: z.coerce.number().int().min(0).max(100).optional(),
  sortBy: z.enum(['appliedAt', 'matchScore', 'updatedAt']).default('appliedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const kanbanQuerySchema = z.object({
  jobId: z.string().optional(),
  assignedRecruiterId: z.string().optional(),
  search: z.string().optional(),
});

export const assignRecruiterSchema = z.object({
  assignedRecruiterId: z.string().nullable(),
});

export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationStatusDto = z.infer<typeof updateApplicationStatusSchema>;
export type AddApplicationNoteDto = z.infer<typeof addApplicationNoteSchema>;
export type ListApplicationsQueryDto = z.infer<typeof listApplicationsQuerySchema>;
export type KanbanQueryDto = z.infer<typeof kanbanQuerySchema>;
export type AssignRecruiterDto = z.infer<typeof assignRecruiterSchema>;
