'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AICandidateMatchResult, PaginationMeta } from '@recruitflow/types';
import { apiClient } from '@/lib/api-client';

export interface CandidateSkill {
  id?: string;
  name: string;
  proficiency?: string | null;
  yearsOfExperience?: number | null;
}

export interface CandidateListItem {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  location: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  totalExperienceYears: number | null;
  source: string;
  skills: CandidateSkill[];
  _count?: { applications: number; notes: number };
  createdAt: string;
}

export interface CandidateNote {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; email: string } | null;
}

export interface CandidateDetail extends CandidateListItem {
  summary: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  expectedSalaryMin?: number | null;
  expectedSalaryMax?: number | null;
  salaryCurrency: string;
  noticePeriodDays?: number | null;
  tags: string[];
  languages: string[];
  experiences: Array<{
    id?: string;
    company: string;
    title: string;
    location?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    isCurrent?: boolean;
    description?: string | null;
  }>;
  educations: Array<{
    id?: string;
    institution: string;
    degree: string;
    fieldOfStudy?: string | null;
  }>;
  certifications: Array<{ id?: string; name: string; issuingOrg: string }>;
  attachments: Array<{ id: string; fileName: string; fileSizeBytes: number; mimeType: string }>;
  notes: CandidateNote[];
  applications: Array<{
    id: string;
    status: string;
    appliedAt: string;
    job: { id: string; title: string; department: string } | null;
    aiMatch: AICandidateMatchResult & { id: string } | null;
  }>;
}

export function useCandidatesList(params: { search?: string; source?: string }) {
  return useQuery({
    queryKey: ['candidates', 'list', params],
    queryFn: async () => {
      const res = await apiClient.get<CandidateListItem[]>('/candidates', {
        params: {
          search: params.search || undefined,
          source: params.source && params.source !== 'ALL' ? params.source : undefined,
          limit: 100,
        },
      });
      return { data: res.data, meta: res.meta as PaginationMeta };
    },
    placeholderData: (prev) => prev,
  });
}

export function useCandidateDetail(candidateId: string | null) {
  return useQuery({
    queryKey: ['candidates', 'detail', candidateId],
    queryFn: async () =>
      (await apiClient.get<CandidateDetail>(`/candidates/${candidateId}`)).data,
    enabled: Boolean(candidateId),
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) =>
      (await apiClient.post<CandidateDetail>('/candidates', input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', 'list'] });
    },
  });
}

export function useAddCandidateNote(candidateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) =>
      (await apiClient.post(`/candidates/${candidateId}/notes`, { content })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', 'detail', candidateId] });
      queryClient.invalidateQueries({ queryKey: ['candidates', 'list'] });
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (candidateId: string) => apiClient.delete(`/candidates/${candidateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates', 'list'] });
    },
  });
}
