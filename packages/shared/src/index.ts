import type { ApplicationStatus, PermissionCode, SystemRoleCode } from '@recruitflow/types';

export const ALL_PERMISSIONS: ReadonlyArray<{
  code: PermissionCode;
  module: string;
  description: string;
}> = [
  { code: 'candidates.read', module: 'candidates', description: 'View candidates and profiles' },
  { code: 'candidates.create', module: 'candidates', description: 'Create candidates and upload resumes' },
  { code: 'candidates.update', module: 'candidates', description: 'Edit candidate details, notes, and tags' },
  { code: 'candidates.delete', module: 'candidates', description: 'Archive or delete candidate records' },
  { code: 'jobs.read', module: 'jobs', description: 'View job requisitions and requirements' },
  { code: 'jobs.create', module: 'jobs', description: 'Create new job requisitions' },
  { code: 'jobs.update', module: 'jobs', description: 'Edit, publish, or archive jobs' },
  { code: 'jobs.delete', module: 'jobs', description: 'Delete job requisitions' },
  { code: 'applications.read', module: 'applications', description: 'View job applications and history' },
  { code: 'applications.create', module: 'applications', description: 'Apply candidates to jobs' },
  { code: 'applications.update', module: 'applications', description: 'Move pipeline stages and add notes' },
  { code: 'applications.delete', module: 'applications', description: 'Delete job applications' },
  { code: 'interviews.read', module: 'interviews', description: 'View scheduled interviews' },
  { code: 'interviews.schedule', module: 'interviews', description: 'Schedule, reschedule, or cancel interviews' },
  { code: 'interviews.feedback', module: 'interviews', description: 'Submit interview scorecards and feedback' },
  { code: 'ai.resume_parse', module: 'ai', description: 'Parse uploaded resumes using AI' },
  { code: 'ai.candidate_match', module: 'ai', description: 'Run AI candidate-to-job matching' },
  { code: 'ai.job_generate', module: 'ai', description: 'Generate job descriptions with AI' },
  { code: 'ai.interview_assist', module: 'ai', description: 'Generate interview questions and summaries with AI' },
  { code: 'ai.email_assist', module: 'ai', description: 'Generate recruitment email drafts with AI' },
  { code: 'analytics.read', module: 'analytics', description: 'View recruitment analytics and reports' },
  { code: 'organization.read', module: 'organization', description: 'View organization profile and settings' },
  { code: 'organization.manage', module: 'organization', description: 'Manage organization profile and settings' },
  { code: 'members.read', module: 'members', description: 'View organization team members' },
  { code: 'members.manage', module: 'members', description: 'Invite, update roles, or remove members' },
  { code: 'billing.read', module: 'billing', description: 'View subscription plan and billing history' },
  { code: 'billing.manage', module: 'billing', description: 'Manage subscription plan and billing checkout' },
  { code: 'admin.organizations', module: 'admin', description: 'Manage all platform organizations' },
  { code: 'admin.users', module: 'admin', description: 'Manage all platform users' },
  { code: 'admin.plans', module: 'admin', description: 'Manage subscription plans' },
  { code: 'admin.ai', module: 'admin', description: 'Configure global AI providers and usage' },
  { code: 'admin.system', module: 'admin', description: 'View system health and audit logs' },
] as const;

export const ROLE_PERMISSION_MATRIX: Record<SystemRoleCode, PermissionCode[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS.map((p) => p.code),
  ORG_ADMIN: ALL_PERMISSIONS.filter((p) => !p.code.startsWith('admin.')).map((p) => p.code),
  HIRING_MANAGER: [
    'candidates.read',
    'candidates.create',
    'candidates.update',
    'jobs.read',
    'jobs.create',
    'jobs.update',
    'jobs.delete',
    'applications.read',
    'applications.create',
    'applications.update',
    'interviews.read',
    'interviews.schedule',
    'interviews.feedback',
    'ai.resume_parse',
    'ai.candidate_match',
    'ai.job_generate',
    'ai.interview_assist',
    'ai.email_assist',
    'analytics.read',
    'organization.read',
    'members.read',
  ],
  RECRUITER: [
    'candidates.read',
    'candidates.create',
    'candidates.update',
    'jobs.read',
    'jobs.create',
    'jobs.update',
    'applications.read',
    'applications.create',
    'applications.update',
    'interviews.read',
    'interviews.schedule',
    'interviews.feedback',
    'ai.resume_parse',
    'ai.candidate_match',
    'ai.job_generate',
    'ai.interview_assist',
    'ai.email_assist',
    'analytics.read',
    'organization.read',
    'members.read',
  ],
  INTERVIEWER: [
    'candidates.read',
    'jobs.read',
    'applications.read',
    'interviews.read',
    'interviews.feedback',
    'ai.interview_assist',
    'organization.read',
    'members.read',
  ],
};

export const APPLICATION_PIPELINE_STAGES: ReadonlyArray<{
  status: ApplicationStatus;
  label: string;
  order: number;
  isTerminal: boolean;
}> = [
  { status: 'NEW', label: 'New', order: 0, isTerminal: false },
  { status: 'SCREENING', label: 'Screening', order: 1, isTerminal: false },
  { status: 'SHORTLISTED', label: 'Shortlisted', order: 2, isTerminal: false },
  { status: 'INTERVIEW', label: 'Interview', order: 3, isTerminal: false },
  { status: 'ASSESSMENT', label: 'Assessment', order: 4, isTerminal: false },
  { status: 'OFFER', label: 'Offer', order: 5, isTerminal: false },
  { status: 'HIRED', label: 'Hired', order: 6, isTerminal: true },
  { status: 'REJECTED', label: 'Rejected', order: 7, isTerminal: true },
  { status: 'WITHDRAWN', label: 'Withdrawn', order: 8, isTerminal: true },
];

export function hasPermission(
  roleCode: SystemRoleCode,
  requiredPermission: PermissionCode,
  customPermissions?: PermissionCode[],
): boolean {
  if (roleCode === 'SUPER_ADMIN') return true;
  const effective = customPermissions ?? ROLE_PERMISSION_MATRIX[roleCode] ?? [];
  return effective.includes(requiredPermission);
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

