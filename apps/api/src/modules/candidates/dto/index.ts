import {
  candidateCertificationSchema,
  candidateEducationSchema,
  candidateExperienceSchema,
  candidateSkillSchema,
  createCandidateSchema,
  updateCandidateSchema,
} from '@recruitflow/validation';
import { z } from 'zod';

export {
  candidateCertificationSchema,
  candidateEducationSchema,
  candidateExperienceSchema,
  candidateSkillSchema,
  createCandidateSchema,
  updateCandidateSchema,
};

export const listCandidatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  source: z
    .enum([
      'DIRECT_APPLY',
      'LINKEDIN',
      'REFERRAL',
      'AGENCY',
      'JOB_BOARD',
      'AI_RESUME_IMPORT',
      'INTERNAL',
      'OTHER',
    ])
    .optional(),
  skill: z.string().optional(),
  tag: z.string().optional(),
  location: z.string().optional(),
  minExperience: z.coerce.number().min(0).optional(),
  maxExperience: z.coerce.number().min(0).optional(),
  sortBy: z.enum(['createdAt', 'fullName', 'totalExperienceYears']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const addCandidateNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(5000),
  isPrivate: z.boolean().default(false),
});

export const uploadResumePayloadSchema = z.object({
  fileName: z.string().min(1).default('resume.pdf'),
  mimeType: z.string().default('application/pdf'),
  contentBase64: z.string().optional(),
  extractedText: z.string().optional(),
  isPrimary: z.boolean().default(true),
});

export type CreateCandidateDto = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateDto = z.infer<typeof updateCandidateSchema>;
export type ListCandidatesQueryDto = z.infer<typeof listCandidatesQuerySchema>;
export type AddCandidateNoteDto = z.infer<typeof addCandidateNoteSchema>;
export type UploadResumePayloadDto = z.infer<typeof uploadResumePayloadSchema>;
