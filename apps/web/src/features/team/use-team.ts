'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SystemRoleCode } from '@recruitflow/types';
import { apiClient } from '@/lib/api-client';

export interface TeamMember {
  id: string;
  roleCode: SystemRoleCode;
  department: string | null;
  isActive: boolean;
  joinedAt: string;
  user: { id: string; name: string; email: string; image: string | null; jobTitle: string | null };
}

export interface Invitation {
  id: string;
  email: string;
  roleCode: SystemRoleCode;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  inviter: { id: string; name: string; email: string };
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team', 'members'],
    queryFn: async () => (await apiClient.get<TeamMember[]>('/organizations/members')).data,
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: ['team', 'invitations'],
    queryFn: async () => (await apiClient.get<Invitation[]>('/organizations/invitations')).data,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; roleCode: SystemRoleCode; department?: string }) =>
      (await apiClient.post<Invitation>('/organizations/invitations', input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'invitations'] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memberId: string; roleCode: SystemRoleCode; department?: string }) =>
      apiClient.patch(`/organizations/members/${input.memberId}`, {
        roleCode: input.roleCode,
        department: input.department,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => apiClient.delete(`/organizations/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] });
    },
  });
}
