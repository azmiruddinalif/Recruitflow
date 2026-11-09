import { createAuthClient } from 'better-auth/react';
import type { SystemRoleCode } from '@recruitflow/types';

export const authClient = createAuthClient({
  baseURL:
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

export interface DemoAccountPreset {
  name: string;
  email: string;
  password: string;
  role: SystemRoleCode;
  title: string;
  badgeColor: string;
}

// These must match the real accounts seeded by prisma/seed.ts — this list is
// display metadata for the login screen only; actual authentication always
// goes through the real POST /auth/sign-in/email endpoint.
export const DEMO_ACCOUNTS: DemoAccountPreset[] = [
  {
    name: 'Alex Morgan',
    email: 'admin@recruitflow.io',
    password: 'RecruitFlow@2026!',
    role: 'SUPER_ADMIN',
    title: 'Principal Platform Administrator',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  {
    name: 'Sarah Chen',
    email: 'sarah.chen@talentscale.io',
    password: 'RecruitFlow@2026!',
    role: 'ORG_ADMIN',
    title: 'VP of Talent Acquisition',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    name: 'Marcus Vance',
    email: 'marcus.vance@talentscale.io',
    password: 'RecruitFlow@2026!',
    role: 'HIRING_MANAGER',
    title: 'Director of Engineering',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  {
    name: 'Elena Rostova',
    email: 'elena.rostova@talentscale.io',
    password: 'RecruitFlow@2026!',
    role: 'RECRUITER',
    title: 'Senior Technical Recruiter',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    name: 'David Kim',
    email: 'david.kim@talentscale.io',
    password: 'RecruitFlow@2026!',
    role: 'INTERVIEWER',
    title: 'Staff Systems Architect',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
];
