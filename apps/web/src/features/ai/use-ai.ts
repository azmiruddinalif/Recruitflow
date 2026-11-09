'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AICandidateMatchResult,
  AICandidateSummaryResult,
  AIEmailDraftResult,
  AIInterviewQuestionsResult,
  AIJobDescriptionResult,
  AIProviderStatus,
  AIProviderType,
  ParsedResumeData,
} from '@recruitflow/types';
import { apiClient } from '@/lib/api-client';

export function useAIProviderStatus() {
  return useQuery({
    queryKey: ['ai', 'status'],
    queryFn: async () => (await apiClient.get<AIProviderStatus>('/ai/status')).data,
    staleTime: 15_000,
  });
}

interface ResumeParseResponse {
  resumeId: string;
  parseStatus: 'PROCESSING' | 'PENDING_REVIEW' | 'FAILED' | 'APPROVED';
  extractedData?: ParsedResumeData | null;
  provider?: AIProviderType | null;
  model?: string | null;
  parseError?: string | null;
  queued?: boolean;
}

export function useParseResume() {
  return useMutation({
    mutationFn: async (input: {
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
      rawText: string;
      candidateId?: string;
    }) => (await apiClient.post<ResumeParseResponse>('/ai/parse-resume', input)).data,
  });
}

export function useResumeParseStatus(resumeId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['ai', 'resume-status', resumeId],
    queryFn: async () =>
      (await apiClient.get<ResumeParseResponse>(`/ai/parse-resume/${resumeId}`)).data,
    enabled: Boolean(resumeId) && enabled,
    refetchInterval: (query) =>
      query.state.data?.parseStatus === 'PROCESSING' ? 2500 : false,
  });
}

export function useApproveParsedResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      resumeId,
      approvedData,
    }: {
      resumeId: string;
      approvedData: ParsedResumeData;
    }) => (await apiClient.post(`/ai/parse-resume/${resumeId}/approve`, approvedData)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export function useMatchCandidate() {
  return useMutation({
    mutationFn: async (input: { jobId: string; candidateId: string; applicationId?: string }) =>
      (await apiClient.post<AICandidateMatchResult>('/ai/match-candidate', input)).data,
  });
}

export function useGenerateJobDescription() {
  return useMutation({
    mutationFn: async (input: {
      title: string;
      department: string;
      experienceLevel: string;
      employmentType?: string;
      workLocationType?: string;
      tone?: string;
      requiredSkills: string[];
      preferredSkills?: string[];
    }) => (await apiClient.post<AIJobDescriptionResult>('/ai/generate-job-description', input)).data,
  });
}

export function useGenerateInterviewQuestions() {
  return useMutation({
    mutationFn: async (input: {
      jobTitle: string;
      experienceLevel: string;
      skills: string[];
      interviewType?: string;
    }) =>
      (await apiClient.post<AIInterviewQuestionsResult>('/ai/interview-questions', input)).data,
  });
}

export function useGenerateEmailDraft() {
  return useMutation({
    mutationFn: async (input: {
      purpose: 'INTERVIEW_INVITE' | 'STATUS_UPDATE' | 'FOLLOW_UP' | 'OFFER' | 'REJECTION';
      candidateName: string;
      jobTitle: string;
      companyName?: string;
      tone?: string;
      additionalContext?: string;
    }) => (await apiClient.post<AIEmailDraftResult>('/ai/generate-email', input)).data,
  });
}

export function useGenerateCandidateSummary() {
  return useMutation({
    mutationFn: async (input: { candidateId: string }) =>
      (await apiClient.post<AICandidateSummaryResult>('/ai/candidate-summary', input)).data,
  });
}

export interface OrganizationAIProvider {
  id: string;
  provider: AIProviderType;
  displayName: string;
  apiKeyEncrypted: string | null;
  defaultModel: string;
  isEnabled: boolean;
  isDefault: boolean;
}

export function useOrganizationAIProviders() {
  return useQuery({
    queryKey: ['settings', 'ai-providers'],
    queryFn: async () =>
      (await apiClient.get<OrganizationAIProvider[]>('/settings/ai-providers')).data,
  });
}

export function useUpsertOrganizationAIProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      provider: AIProviderType;
      displayName: string;
      apiKey?: string;
      defaultModel: string;
      isEnabled: boolean;
      isDefault?: boolean;
    }) => (await apiClient.put<OrganizationAIProvider>('/settings/ai-providers', input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'ai-providers'] });
      queryClient.invalidateQueries({ queryKey: ['ai', 'status'] });
    },
  });
}
