'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface CurrentOrganization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  description: string | null;
  createdAt: string;
  settings: {
    defaultTimezone: string;
    defaultCurrency: string;
    brandPrimaryColor: string;
    allowAIResumeParsing: boolean;
    allowAICandidateMatching: boolean;
    emailNotificationsEnabled: boolean;
    pipelineStagesJson?: unknown;
  } | null;
  subscription: { plan: { name: string; code: string } } | null;
  _count: { members: number; jobs: number; candidates: number; applications: number };
}

export function useCurrentOrganization() {
  return useQuery({
    queryKey: ['organizations', 'current'],
    queryFn: async () => (await apiClient.get<CurrentOrganization>('/organizations/current')).data,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) =>
      (await apiClient.patch<CurrentOrganization>('/organizations/current', patch)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });
}
