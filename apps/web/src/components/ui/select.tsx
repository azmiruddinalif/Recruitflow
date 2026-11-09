'use client';

import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (event: { target: { value: string } }) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  id?: string;
  name?: string;
}

// Keeps the original native-<select>-shaped API (value / onChange(e) / options)
// so every existing call site works unchanged, while rendering a real Radix
// Select underneath for proper keyboard nav, focus management, and a11y.
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    { className, label, options, value, defaultValue, onChange, placeholder, disabled, id, name, ...rest },
    ref,
  ) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-xs font-medium text-slate-700">
            {label}
          </label>
        )}
        <SelectPrimitive.Root
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          name={name}
          onValueChange={(next) => onChange?.({ target: { value: next } })}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={id}
            aria-label={rest['aria-label'] ?? label}
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-slate-900',
              'focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-indigo-500/15',
              'disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-slate-400',
              className,
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>
          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={4}
              className="z-50 max-h-72 min-w-[8rem] overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white text-sm text-slate-900 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
              style={{ width: 'var(--radix-select-trigger-width)' }}
            >
              <SelectPrimitive.Viewport className="p-1">
                {options.map((opt) => (
                  <SelectPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className="relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 pl-7 pr-2 text-xs text-slate-700 outline-none data-[highlighted]:bg-indigo-50 data-[highlighted]:text-[#4F46E5] data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <Check className="h-3.5 w-3.5" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      </div>
    );
  },
);

Select.displayName = 'Select';
