'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AICandidateMatchResult, ApplicationStatus } from '@recruitflow/types';
import { apiClient } from '@/lib/api-client';

export interface KanbanCandidateSummary {
  id: string;
  fullName: string;
  email: string;
  currentTitle: string | null;
  currentCompany: string | null;
  totalExperienceYears: number | null;
  skills: Array<{ name: string }>;
}

export interface KanbanJobSummary {
  id: string;
  title: string;
  department: string;
}

export interface KanbanApplication {
  id: string;
  organizationId: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  stageOrder: number;
  source: string;
  appliedAt: string;
  updatedAt: string;
  expectedSalary?: number | null;
  assignedRecruiter: { id: string; name: string; image?: string | null } | null;
  aiMatch: { overallScore: number; skillsScore: number; matchingSkills: string[] } | null;
  candidate: KanbanCandidateSummary;
  job: KanbanJobSummary;
}

interface KanbanColumnResponse {
  status: ApplicationStatus;
  label: string;
  order: number;
  isTerminal: boolean;
  count: number;
  applications: KanbanApplication[];
}

const kanbanKey = (filters: { jobId?: string; search?: string }) => ['applications', 'kanban', filters];

export function useApplicationsKanban(filters: { jobId?: string; search?: string } = {}) {
  return useQuery({
    queryKey: kanbanKey(filters),
    queryFn: async () => {
      const res = await apiClient.get<{ totalApplications: number; columns: KanbanColumnResponse[] }>(
        '/applications/kanban',
        { params: { jobId: filters.jobId || undefined, search: filters.search || undefined } },
      );
      return res.data.columns.flatMap((col) => col.applications);
    },
    placeholderData: (prev) => prev,
  });
}

export interface ApplicationDetail extends KanbanApplication {
  aiMatch: AICandidateMatchResult & { id: string } | null;
  statusHistory: Array<{
    id: string;
    fromStatus: ApplicationStatus | null;
    toStatus: ApplicationStatus;
    reason: string | null;
    createdAt: string;
    changedBy: { id: string; name: string } | null;
  }>;
  notes: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string } | null;
  }>;
}

export function useApplicationDetail(applicationId: string | null) {
  return useQuery({
    queryKey: ['applications', 'detail', applicationId],
    queryFn: async () => (await apiClient.get<ApplicationDetail>(`/applications/${applicationId}`)).data,
    enabled: Boolean(applicationId),
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      jobId: string;
      candidateId: string;
      source: string;
      expectedSalary?: number;
    }) => (await apiClient.post<{ id: string }>('/applications', input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'kanban'] });
    },
  });
}

function patchKanbanCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  updates: Array<{ applicationId: string; status: ApplicationStatus; stageOrder: number }>,
) {
  const matches = queryClient.getQueriesData<KanbanApplication[]>({ queryKey: ['applications', 'kanban'] });
  const snapshots: Array<{ key: unknown; data: KanbanApplication[] | undefined }> = [];

  for (const [key, data] of matches) {
    snapshots.push({ key, data });
    if (!data) continue;
    const next = data.map((app) => {
      const update = updates.find((u) => u.applicationId === app.id);
      if (!update) return app;
      return { ...app, status: update.status, stageOrder: update.stageOrder, updatedAt: new Date().toISOString() };
    });
    queryClient.setQueryData(key as readonly unknown[], next);
  }

  return snapshots;
}

function restoreKanbanCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  snapshots: Array<{ key: unknown; data: KanbanApplication[] | undefined }>,
) {
  for (const { key, data } of snapshots) {
    queryClient.setQueryData(key as readonly unknown[], data);
  }
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      applicationId: string;
      status: ApplicationStatus;
      stageOrder: number;
      reason?: string;
    }) =>
      apiClient.patch(`/applications/${input.applicationId}/status`, {
        status: input.status,
        stageOrder: input.stageOrder,
        reason: input.reason,
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['applications', 'kanban'] });
      const snapshots = patchKanbanCaches(queryClient, [input]);
      return { snapshots };
    },
    onError: (_err, _input, context) => {
      if (context?.snapshots) restoreKanbanCaches(queryClient, context.snapshots);
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'detail', input.applicationId] });
    },
  });
}

export function useReorderApplications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Array<{ applicationId: string; status: ApplicationStatus; stageOrder: number }>) =>
      Promise.all(
        updates.map((u) =>
          apiClient.patch(`/applications/${u.applicationId}/status`, {
            status: u.status,
            stageOrder: u.stageOrder,
          }),
        ),
      ),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['applications', 'kanban'] });
      const snapshots = patchKanbanCaches(queryClient, updates);
      return { snapshots };
    },
    onError: (_err, _updates, context) => {
      if (context?.snapshots) restoreKanbanCaches(queryClient, context.snapshots);
    },
  });
}

export function useAddApplicationNote(applicationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) =>
      apiClient.post(`/applications/${applicationId}/notes`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'detail', applicationId] });
    },
  });
}
