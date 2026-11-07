'use client';

import React, { useState } from 'react';
import { Mail, Plus, Shield, Trash2, Users } from 'lucide-react';
import { ROLE_PERMISSION_MATRIX } from '@recruitflow/shared';
import type { SystemRoleCode } from '@recruitflow/types';
import { useRecruitFlow } from '@/stores/recruitflow-store';

export default function TeamPage() {
  const { activeOrganization, teamMembers, can, inviteTeamMember, removeTeamMember } =
    useRecruitFlow();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [roleCode, setRoleCode] = useState<SystemRoleCode>('RECRUITER');
  const [department, setDepartment] = useState('Talent Acquisition');
  const [jobTitle, setJobTitle] = useState('Senior Technical Recruiter');

  const orgMembers = teamMembers.filter((m) => m.organizationId === activeOrganization.id);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    await inviteTeamMember({ email, name, roleCode, department, jobTitle });
    setEmail('');
    setName('');
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
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              Workspace Members ({orgMembers.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {orgMembers.map((member) => (
              <div
                key={member.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                    <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                      {member.roleCode}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-medium ${
                        member.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {member.email} • {member.jobTitle} ({member.department})
                  </p>
                </div>
                {can('members.manage') && (
                  <button
                    type="button"
                    onClick={() => removeTeamMember(member.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Invite Member Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-600" />
            Invite Team Member
          </h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="Jordan Taylor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Work Email</label>
              <input
                type="email"
                required
                placeholder="jordan@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Organization Role
              </label>
              <select
                value={roleCode}
                onChange={(e) => setRoleCode(e.target.value as SystemRoleCode)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="ORG_ADMIN">Organization Admin</option>
                <option value="HIRING_MANAGER">Hiring Manager</option>
                <option value="RECRUITER">Recruiter</option>
                <option value="INTERVIEWER">Interviewer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!can('members.manage')}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Send Organization Invitation
            </button>
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
