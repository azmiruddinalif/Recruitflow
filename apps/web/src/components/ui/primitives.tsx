'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-[88px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
>(({ className, label, ...props }, ref) => (
  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-sm text-slate-700">
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600/30',
        className,
      )}
      {...props}
    />
    {label && <span>{label}</span>}
  </label>
));
Checkbox.displayName = 'Checkbox';

export const Radio = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
>(({ className, label, ...props }, ref) => (
  <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-sm text-slate-700">
    <input
      ref={ref}
      type="radio"
      className={cn(
        'h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-600/30',
        className,
      )}
      {...props}
    />
    {label && <span>{label}</span>}
  </label>
));
Radio.displayName = 'Radio';

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const sizes = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-sm',
  };
  return src ? (
    <img
      src={src}
      alt={name}
      className={cn('rounded-full object-cover border border-slate-200', sizes[size], className)}
    />
  ) : (
    <div
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200',
        sizes[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}

export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100 z-50"
      >
        {content}
      </span>
    </span>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl border-l border-slate-200"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function Dropdown({
  label,
  items,
}: {
  label: React.ReactNode;
  items: Array<{ label: string; onClick: () => void; danger?: boolean }>;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        {label}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-1.5 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={cn(
                'block w-full px-3.5 py-2 text-left text-xs font-medium hover:bg-slate-50',
                item.danger ? 'text-red-600' : 'text-slate-700',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FormField({
  label,
  helperText,
  error,
  required,
  children,
}: {
  label: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      {children}
      {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
