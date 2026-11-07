import { createAuthClient } from 'better-auth/react';
import type { SystemRoleCode } from '@recruitflow/types';

export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

export interface DemoAccountPreset {
  id: string;
  name: string;
  email: string;
  password: string;
  role: SystemRoleCode;
  title: string;
  organizationSlug: string;
  badgeColor: string;
}

export const DEMO_ACCOUNTS: DemoAccountPreset[] = [
  {
    id: 'usr_superadmin',
    name: 'Elena Vance',
    email: 'superadmin@recruitflow.io',
    password: 'Password123!',
    role: 'SUPER_ADMIN',
    title: 'VP of Platform Engineering',
    organizationSlug: 'acme-cloud',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    id: 'usr_orgadmin',
    name: 'Marcus Sterling',
    email: 'admin@acmecloud.io',
    password: 'Password123!',
    role: 'ORG_ADMIN',
    title: 'Head of Talent Acquisition',
    organizationSlug: 'acme-cloud',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'usr_hm',
    name: 'Dr. Priya Patel',
    email: 'hiring@acmecloud.io',
    password: 'Password123!',
    role: 'HIRING_MANAGER',
    title: 'Director of AI Infrastructure',
    organizationSlug: 'acme-cloud',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    id: 'usr_recruiter',
    name: 'Jordan Rivera',
    email: 'recruiter@acmecloud.io',
    password: 'Password123!',
    role: 'RECRUITER',
    title: 'Lead Technical Recruiter',
    organizationSlug: 'acme-cloud',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'usr_interviewer',
    name: 'Liam Chen',
    email: 'interviewer@acmecloud.io',
    password: 'Password123!',
    role: 'INTERVIEWER',
    title: 'Staff Distributed Systems Engineer',
    organizationSlug: 'acme-cloud',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
];
