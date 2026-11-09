'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JobStatus, PaginationMeta } from '@recruitflow/types';
import { apiClient } from '@/lib/api-client';

export interface JobSkill {
  id?: string;
  name: string;
  isRequired: boolean;
  weight?: number;
}

export interface JobListItem {
  id: string;
  organizationId: string;
  title: string;
  slug: string;
  code: string;
  department: string;
  location: string;
  workLocationType: string;
  employmentType: string;
  experienceLevel: string;
  minExperienceYears: number;
  maxExperienceYears?: number | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency: string;
  showSalary: boolean;
  status: JobStatus;
  openingsCount: number;
  skills: JobSkill[];
  _count?: { applications: number };
  createdAt: string;
  publishedAt?: string | null;
}

export interface JobDetail extends JobListItem {
  description: string;
  responsibilities: string[];
  qualifications: string[];
  benefits: string[];
  educationRequirement?: string | null;
  aiGenerated: boolean;
  hiringManager: { id: string; name: string; email: string } | null;
  pipelineConfigJson?: unknown;
}

export function useJobsList(params: { search?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ['jobs', 'list', params],
    queryFn: async () => {
      const res = await apiClient.get<JobListItem[]>('/jobs', {
        params: {
          search: params.search || undefined,
          status: params.status && params.status !== 'ALL' ? params.status : undefined,
          limit: 100,
        },
      });
      return { data: res.data, meta: res.meta as PaginationMeta };
    },
    placeholderData: (prev) => prev,
  });
}

export function useJobDetail(jobId: string | null) {
  return useQuery({
    queryKey: ['jobs', 'detail', jobId],
    queryFn: async () => (await apiClient.get<JobDetail>(`/jobs/${jobId}`)).data,
    enabled: Boolean(jobId),
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) =>
      (await apiClient.post<JobDetail>('/jobs', input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
    },
  });
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: JobStatus }) =>
      (await apiClient.patch<JobDetail>(`/jobs/${jobId}/status`, { status })).data,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'detail', variables.jobId] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (jobId: string) => apiClient.delete(`/jobs/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', 'list'] });
    },
  });
}
