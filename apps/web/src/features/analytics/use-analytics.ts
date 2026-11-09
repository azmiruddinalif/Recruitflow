'use client';

import { useQuery } from '@tanstack/react-query';
import type { DashboardMetrics } from '@recruitflow/types';
import { apiClient } from '@/lib/api-client';

export function useDashboardMetrics(params: {
  range: '7d' | '30d' | '90d' | '1y' | 'custom';
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ['analytics', 'dashboard', params],
    queryFn: async () =>
      (
        await apiClient.get<DashboardMetrics>('/analytics/dashboard', {
          params: { range: params.range, from: params.from, to: params.to },
        })
      ).data,
  });
}

export interface DetailedReports {
  averageTimeToHireDays: number;
  applicationsPerJob: Array<{
    jobId: string;
    title: string;
    department: string;
    status: string;
    applicationsCount: number;
  }>;
  sourceEffectiveness: Array<{ source: string; applications: number }>;
  interviewConversion: Array<{ status: string; count: number }>;
}

export function useDetailedReports() {
  return useQuery({
    queryKey: ['analytics', 'reports'],
    queryFn: async () => (await apiClient.get<DetailedReports>('/analytics/reports')).data,
  });
}
