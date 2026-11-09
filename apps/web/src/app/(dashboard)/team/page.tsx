'use client';

import React, { useState } from 'react';
import { Clock, Loader2, Mail, Plus, Shield, Trash2, Users } from 'lucide-react';
import { ROLE_PERMISSION_MATRIX } from '@recruitflow/shared';
import type { SystemRoleCode } from '@recruitflow/types';
import {
  useInvitations,
  useInviteMember,
  useRemoveMember,
  useTeamMembers,
} from '@/features/team/use-team';
import { useRecruitFlow } from '@/stores/recruitflow-store';
import { ApiClientError } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function TeamPage() {
  const { activeOrganization, can, pushToast } = useRecruitFlow();

  const [email, setEmail] = useState('');
  const [roleCode, setRoleCode] = useState<SystemRoleCode>('RECRUITER');
  const [department, setDepartment] = useState('');

  const membersQuery = useTeamMembers();
  const members = membersQuery.data ?? [];
  const invitationsQuery = useInvitations();
  const invitations = (invitationsQuery.data ?? []).filter((i) => i.status === 'PENDING');

  const inviteMember = useInviteMember();
  const removeMember = useRemoveMember();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await inviteMember.mutateAsync({ email: email.trim(), roleCode, department: department || undefined });
      pushToast('Invitation sent', `Invited ${email} as ${roleCode}.`, 'success');
      setEmail('');
    } catch (error) {
      pushToast(
        'Could not send invitation',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      await removeMember.mutateAsync(memberId);
      pushToast('Member removed', 'Workspace access has been revoked.', 'info');
    } catch (error) {
      pushToast(
        'Could not remove member',
        error instanceof ApiClientError ? error.message : 'Unknown error',
        'error',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Organization Team & Role-Based Access Control
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage members for <span className="font-semibold">{activeOrganization.name}</span> and inspect server-enforced RBAC permissions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                Workspace Members ({members.length})
              </h2>
              {membersQuery.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
            </div>
            <div className="divide-y divide-slate-100">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{member.user.name}</p>
                      <Badge variant="primary">{member.roleCode}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {member.user.email}
                      {member.user.jobTitle && <> • {member.user.jobTitle}</>}
                      {member.department && <> ({member.department})</>}
                    </p>
                  </div>
                  {can('members.manage') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(member.id)}
                      disabled={removeMember.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {invitations.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Pending Invitations ({invitations.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <div key={inv.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{inv.email}</p>
                      <p className="text-xs text-slate-500">
                        Invited by {inv.inviter.name} as {inv.roleCode} · expires{' '}
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="warning">PENDING</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Invite Member Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-600" />
            Invite Team Member
          </h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <Input
              label="Work Email"
              type="email"
              required
              placeholder="jordan@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              label="Organization Role"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value as SystemRoleCode)}
              options={[
                { value: 'ORG_ADMIN', label: 'Organization Admin' },
                { value: 'HIRING_MANAGER', label: 'Hiring Manager' },
                { value: 'RECRUITER', label: 'Recruiter' },
                { value: 'INTERVIEWER', label: 'Interviewer' },
              ]}
            />
            <Input
              label="Department (Optional)"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={!can('members.manage') || inviteMember.isPending}
            >
              <Plus className="h-4 w-4" />
              {inviteMember.isPending ? 'Sending...' : 'Send Organization Invitation'}
            </Button>
          </form>

          <div className="pt-3 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-indigo-600" />
              Granted Permissions for {roleCode}:
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {ROLE_PERMISSION_MATRIX[roleCode].map((perm) => (
                <span
                  key={perm}
                  className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
