import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'violet';
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-[#F8FAFC] text-[#334155] border-[#E2E8F0]',
    primary: 'bg-[#EEF2FF] text-[#4F46E5] border-indigo-200',
    success: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    warning: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    danger: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    info: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
    violet: 'bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-4',
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
