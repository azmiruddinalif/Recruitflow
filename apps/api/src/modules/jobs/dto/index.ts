import { createJobSchema, updateJobSchema } from '@recruitflow/validation';
import { z } from 'zod';

export { createJobSchema, updateJobSchema };

export const listJobsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED']).optional(),
  department: z.string().optional(),
  workLocationType: z.enum(['ONSITE', 'REMOTE', 'HYBRID']).optional(),
  employmentType: z
    .enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP', 'FREELANCE'])
    .optional(),
  experienceLevel: z
    .enum(['ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE'])
    .optional(),
  sortBy: z.enum(['createdAt', 'title', 'publishedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateJobStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED']),
});

export const updateJobPipelineConfigSchema = z.object({
  stages: z.array(
    z.object({
      status: z.string().min(1),
      label: z.string().min(1),
      order: z.number().int().min(0),
      isTerminal: z.boolean().optional().default(false),
    }),
  ),
});

export type CreateJobDto = z.infer<typeof createJobSchema>;
export type UpdateJobDto = z.infer<typeof updateJobSchema>;
export type ListJobsQueryDto = z.infer<typeof listJobsQuerySchema>;
export type UpdateJobStatusDto = z.infer<typeof updateJobStatusSchema>;
export type UpdateJobPipelineConfigDto = z.infer<typeof updateJobPipelineConfigSchema>;
