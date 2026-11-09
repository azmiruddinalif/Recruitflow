'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AIProviderType } from '@recruitflow/types';
import { apiClient } from '@/lib/api-client';

export interface AdminOverview {
  metrics: {
    organizationsCount: number;
    usersCount: number;
    candidatesCount: number;
    jobsCount: number;
    applicationsCount: number;
    aiCallsCount: number;
  };
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: string;
    _count?: { members: number };
  }>;
  users: Array<{ id: string; name: string; email: string; isSuperAdmin: boolean; isActive: boolean }>;
  aiProviders: Array<{
    id: string;
    provider: AIProviderType;
    displayName: string;
    apiKeyEncrypted: string | null;
    defaultModel: string;
    isEnabled: boolean;
    isDefault: boolean;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    description: string;
    createdAt: string;
    actor: { name: string; email: string } | null;
    organization: { name: string } | null;
  }>;
}

export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => (await apiClient.get<AdminOverview>('/admin/overview')).data,
  });
}

export function useUpsertGlobalAIProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      provider: AIProviderType;
      displayName: string;
      apiKey?: string;
      defaultModel: string;
      isEnabled: boolean;
      isDefault?: boolean;
    }) => (await apiClient.put('/admin/ai-providers', input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
}

export function useToggleOrganizationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { organizationId: string; isActive: boolean }) =>
      apiClient.patch(`/admin/organizations/${input.organizationId}/status`, {
        isActive: input.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
}

export interface AdminPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  currency: string;
  maxJobs: number;
  maxCandidates: number;
  maxMembers: number;
  aiCreditsMonthly: number;
  features: string[];
  isPublic: boolean;
  isActive: boolean;
  sortOrder: number;
}

export function useAdminPlans() {
  return useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: async () => (await apiClient.get<AdminPlan[]>('/admin/plans')).data,
  });
}

export function useUpdateAdminPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { planId: string } & Partial<Omit<AdminPlan, 'id' | 'code' | 'currency'>>) => {
      const { planId, ...patch } = input;
      return (await apiClient.patch<AdminPlan>(`/admin/plans/${planId}`, patch)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
      queryClient.invalidateQueries({ queryKey: ['billing', 'plans'] });
    },
  });
}
