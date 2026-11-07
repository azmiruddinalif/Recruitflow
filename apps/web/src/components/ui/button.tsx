import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => {
    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-[#4F46E5] text-white hover:bg-[#4338CA] border border-transparent shadow-sm focus:ring-2 focus:ring-indigo-500/20',
      secondary:
        'bg-[#EEF2FF] text-[#4F46E5] hover:bg-indigo-100 border border-indigo-200/80',
      outline:
        'bg-white text-slate-700 hover:bg-slate-50 border border-[#E2E8F0] shadow-xs',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      danger:
        'bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm',
    };

    const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'h-8 px-3 text-xs font-medium rounded-md gap-1.5',
      md: 'h-9 px-4 text-sm font-medium rounded-lg gap-2',
      lg: 'h-11 px-5 text-sm font-semibold rounded-lg gap-2',
    };

    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:pointer-events-none select-none',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
