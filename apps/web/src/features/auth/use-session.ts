'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthenticatedOrganizationContext, AuthenticatedUser, SystemRoleCode } from '@recruitflow/types';
import { apiClient, ApiClientError } from '@/lib/api-client';

export interface SessionOrganizationSummary {
  organizationId: string;
  name: string;
  slug: string;
  logo: string | null;
  roleCode: SystemRoleCode;
  memberId: string;
}

export interface SessionPayload {
  user: AuthenticatedUser;
  organizations: SessionOrganizationSummary[];
  activeOrganization: AuthenticatedOrganizationContext | null;
}

const SESSION_KEY = ['session'];

export function useSession() {
  return useQuery<SessionPayload | null>({
    queryKey: SESSION_KEY,
    queryFn: async () => {
      try {
        const res = await apiClient.get<SessionPayload>('/auth/get-session');
        return res.data;
      } catch (error) {
        if (error instanceof ApiClientError && error.statusCode === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) =>
      (await apiClient.post<SessionPayload>('/auth/sign-in/email', input)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(SESSION_KEY, data);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      email: string;
      password: string;
      organizationName?: string;
    }) => (await apiClient.post<SessionPayload>('/auth/register', input)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(SESSION_KEY, data);
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => apiClient.post('/auth/sign-out'),
    onSuccess: () => {
      queryClient.setQueryData(SESSION_KEY, null);
      queryClient.clear();
    },
  });
}

export function useSwitchOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (organizationId: string) =>
      (await apiClient.post('/organizations/switch', { organizationId })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_KEY });
    },
  });
}
