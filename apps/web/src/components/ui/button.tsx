import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
  {
    variants: {
      variant: {
        primary:
          'bg-[#4F46E5] text-white hover:bg-[#4338CA] border border-transparent shadow-sm focus-visible:ring-indigo-500/30',
        secondary:
          'bg-[#EEF2FF] text-[#4F46E5] hover:bg-indigo-100 border border-indigo-200/80',
        outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-[#E2E8F0] shadow-xs',
        ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        danger: 'bg-red-600 text-white hover:bg-red-700 border border-transparent shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-xs font-medium rounded-md gap-1.5',
        md: 'h-9 px-4 text-sm font-medium rounded-lg gap-2',
        lg: 'h-11 px-5 text-sm font-semibold rounded-lg gap-2',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
