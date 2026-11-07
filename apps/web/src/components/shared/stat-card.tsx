import * as React from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
}

export function StatCard({
  label,
  value,
  delta,
  deltaType = 'positive',
  icon,
  subtitle,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 transition-colors hover:border-slate-300">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4F46E5]">
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2.5">
        <span className="text-2xl font-semibold tracking-tight text-slate-900">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-xs font-medium',
              deltaType === 'positive' && 'bg-[#F0FDF4] text-[#15803D]',
              deltaType === 'negative' && 'bg-[#FEF2F2] text-[#B91C1C]',
              deltaType === 'neutral' && 'bg-slate-100 text-slate-600',
            )}
          >
            {delta}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}
