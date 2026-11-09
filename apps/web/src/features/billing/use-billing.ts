'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthlyCents: number;
  priceYearlyCents: number;
  maxJobs: number;
  maxCandidates: number;
  maxMembers: number;
  aiCreditsMonthly: number;
  features: string[];
}

export interface CurrentSubscriptionResponse {
  subscription: {
    id: string;
    status: string;
    billingInterval: string;
    aiCreditsUsed: number;
    plan: SubscriptionPlan;
  } | null;
  stripeConfigured: boolean;
  mode: 'STRIPE_SAAS' | 'SELF_HOSTED';
  usage: {
    jobsUsed: number;
    jobsLimit: number;
    candidatesUsed: number;
    candidatesLimit: number;
    membersUsed: number;
    membersLimit: number;
    aiCreditsUsed: number;
    aiCreditsLimit: number;
  };
  payments: Array<{
    id: string;
    amountCents: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: async () => (await apiClient.get<SubscriptionPlan[]>('/subscriptions/plans')).data,
  });
}

export function useCurrentSubscription() {
  return useQuery({
    queryKey: ['billing', 'current'],
    queryFn: async () => (await apiClient.get<CurrentSubscriptionResponse>('/subscriptions/current')).data,
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { planCode: string; billingInterval?: 'MONTHLY' | 'YEARLY' }) =>
      (
        await apiClient.post<{ requiresCheckout: boolean; stripeConfigured: boolean; message?: string }>(
          '/subscriptions/change-plan',
          input,
        )
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'current'] });
    },
  });
}
