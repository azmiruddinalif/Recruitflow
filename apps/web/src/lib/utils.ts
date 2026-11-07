import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type {
  ApplicationStatus,
  HiringRecommendation,
  InterviewStatus,
  JobStatus,
  SystemRoleCode,
} from '@recruitflow/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount?: number | null, currency = 'USD'): string {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSalaryRange(
  min?: number | null,
  max?: number | null,
  currency = 'USD',
): string {
  if (!min && !max) return 'Competitive';
  if (min && max) return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
  if (min) return `From ${formatCurrency(min, currency)}`;
  return `Up to ${formatCurrency(max, currency)}`;
}

export function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (Number.isNaN(date.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateStr?: string | Date | null): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (Number.isNaN(date.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function getApplicationStageStyle(status: ApplicationStatus): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
} {
  switch (status) {
    case 'HIRED':
      return {
        bg: 'bg-[#F0FDF4]',
        text: 'text-[#15803D]',
        border: 'border-[#BBF7D0]',
        dot: 'bg-[#15803D]',
        label: 'Hired',
      };
    case 'OFFER':
      return {
        bg: 'bg-[#F5F3FF]',
        text: 'text-[#6D28D9]',
        border: 'border-[#DDD6FE]',
        dot: 'bg-[#6D28D9]',
        label: 'Offer Extended',
      };
    case 'INTERVIEW':
    case 'SHORTLISTED':
      return {
        bg: 'bg-[#EFF6FF]',
        text: 'text-[#1D4ED8]',
        border: 'border-[#BFDBFE]',
        dot: 'bg-[#1D4ED8]',
        label: status === 'INTERVIEW' ? 'Interview' : 'Shortlisted',
      };
    case 'ASSESSMENT':
      return {
        bg: 'bg-[#FFFBEB]',
        text: 'text-[#B45309]',
        border: 'border-[#FDE68A]',
        dot: 'bg-[#B45309]',
        label: 'Assessment',
      };
    case 'REJECTED':
      return {
        bg: 'bg-[#FEF2F2]',
        text: 'text-[#B91C1C]',
        border: 'border-[#FECACA]',
        dot: 'bg-[#B91C1C]',
        label: 'Rejected',
      };
    case 'WITHDRAWN':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
        label: 'Withdrawn',
      };
    case 'SCREENING':
      return {
        bg: 'bg-[#F8FAFC]',
        text: 'text-[#334155]',
        border: 'border-[#E2E8F0]',
        dot: 'bg-indigo-500',
        label: 'Screening',
      };
    case 'NEW':
    default:
      return {
        bg: 'bg-[#F8FAFC]',
        text: 'text-[#334155]',
        border: 'border-[#E2E8F0]',
        dot: 'bg-slate-500',
        label: 'New',
      };
  }
}

export function getJobStatusStyle(status: JobStatus): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (status) {
    case 'PUBLISHED':
      return {
        bg: 'bg-[#F0FDF4]',
        text: 'text-[#15803D]',
        border: 'border-[#BBF7D0]',
        label: 'Published',
      };
    case 'DRAFT':
      return {
        bg: 'bg-[#F8FAFC]',
        text: 'text-[#334155]',
        border: 'border-[#E2E8F0]',
        label: 'Draft',
      };
    case 'PAUSED':
      return {
        bg: 'bg-[#FFFBEB]',
        text: 'text-[#B45309]',
        border: 'border-[#FDE68A]',
        label: 'Paused',
      };
    case 'CLOSED':
      return {
        bg: 'bg-[#FEF2F2]',
        text: 'text-[#B91C1C]',
        border: 'border-[#FECACA]',
        label: 'Closed',
      };
    case 'ARCHIVED':
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        border: 'border-slate-200',
        label: 'Archived',
      };
  }
}

export function getMatchScoreStyle(score: number): {
  bg: string;
  text: string;
  border: string;
  tier: string;
} {
  if (score >= 80) {
    return {
      bg: 'bg-[#F0FDF4]',
      text: 'text-[#15803D]',
      border: 'border-[#BBF7D0]',
      tier: 'Strong Match',
    };
  }
  if (score >= 50) {
    return {
      bg: 'bg-[#FFFBEB]',
      text: 'text-[#B45309]',
      border: 'border-[#FDE68A]',
      tier: 'Moderate Match',
    };
  }
  return {
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    border: 'border-[#FECACA]',
    tier: 'Low Match',
  };
}

export function getInterviewStatusStyle(status: InterviewStatus): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (status) {
    case 'COMPLETED':
      return {
        bg: 'bg-[#F0FDF4]',
        text: 'text-[#15803D]',
        border: 'border-[#BBF7D0]',
        label: 'Completed',
      };
    case 'SCHEDULED':
    case 'RESCHEDULED':
      return {
        bg: 'bg-[#EFF6FF]',
        text: 'text-[#1D4ED8]',
        border: 'border-[#BFDBFE]',
        label: status === 'RESCHEDULED' ? 'Rescheduled' : 'Scheduled',
      };
    case 'CANCELED':
    case 'NO_SHOW':
    default:
      return {
        bg: 'bg-[#FEF2F2]',
        text: 'text-[#B91C1C]',
        border: 'border-[#FECACA]',
        label: status === 'NO_SHOW' ? 'No Show' : 'Canceled',
      };
  }
}

export function formatRoleLabel(role: SystemRoleCode): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'ORG_ADMIN':
      return 'Organization Admin';
    case 'HIRING_MANAGER':
      return 'Hiring Manager';
    case 'RECRUITER':
      return 'Recruiter';
    case 'INTERVIEWER':
      return 'Interviewer';
  }
}

export function formatRecommendationLabel(rec: HiringRecommendation): string {
  switch (rec) {
    case 'STRONG_HIRE':
      return 'Strong Hire';
    case 'HIRE':
      return 'Hire';
    case 'NEUTRAL':
      return 'Neutral';
    case 'NO_HIRE':
      return 'No Hire';
    case 'STRONG_NO_HIRE':
      return 'Strong No Hire';
  }
}
