'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HiringRecommendation, InterviewStatus, InterviewType } from '@recruitflow/types';
import { apiClient } from '@/lib/api-client';

export interface InterviewFeedbackEntry {
  id: string;
  overallRating: number;
  technicalScore: number | null;
  communicationScore: number | null;
  problemSolvingScore: number | null;
  cultureFitScore: number | null;
  recommendation: HiringRecommendation;
  strengths: string | null;
  concerns: string | null;
  notes: string | null;
  createdAt: string;
  reviewer: { id: string; name: string } | null;
}

export interface InterviewItem {
  id: string;
  applicationId: string;
  title: string;
  type: InterviewType;
  status: InterviewStatus;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  locationOrLink: string | null;
  application: {
    candidate: { id: string; fullName: string; email: string; currentTitle: string | null };
    job: { id: string; title: string; department: string };
  };
  participants: Array<{ user: { id: string; name: string; email: string } }>;
  feedbacks: InterviewFeedbackEntry[];
}

export function useInterviewsList(filters: { status?: InterviewStatus } = {}) {
  return useQuery({
    queryKey: ['interviews', 'list', filters],
    queryFn: async () =>
      (
        await apiClient.get<InterviewItem[]>('/interviews', {
          params: { status: filters.status, limit: 100 },
        })
      ).data,
  });
}

export function useScheduleInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      applicationId: string;
      title: string;
      type: InterviewType;
      scheduledAt: string;
      durationMinutes: number;
      timezone: string;
      locationOrLink?: string;
      agendaNotes?: string;
      participantUserIds: string[];
    }) => (await apiClient.post<InterviewItem>('/interviews', input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['applications', 'kanban'] });
    },
  });
}

export function useSubmitInterviewFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      interviewId: string;
      overallRating: number;
      technicalScore?: number;
      communicationScore?: number;
      problemSolvingScore?: number;
      cultureFitScore?: number;
      strengths?: string;
      concerns?: string;
      notes?: string;
      recommendation: HiringRecommendation;
    }) => {
      const { interviewId, ...body } = input;
      return apiClient.post(`/interviews/${interviewId}/feedback`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', 'list'] });
    },
  });
}
