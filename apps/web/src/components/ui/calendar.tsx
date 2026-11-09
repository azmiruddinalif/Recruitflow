'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: 'w-fit',
        months: 'relative flex flex-col sm:flex-row gap-4',
        month: 'flex flex-col gap-3',
        month_caption: 'flex justify-center pt-1 relative items-center h-8',
        caption_label: 'text-[13px] font-semibold text-slate-900',
        nav: 'flex items-center justify-between absolute inset-x-0 top-0 h-8 px-0.5',
        button_previous: cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'h-7 w-7 p-0 text-slate-400 hover:text-slate-700',
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'h-7 w-7 p-0 text-slate-400 hover:text-slate-700',
        ),
        month_grid: 'w-full border-collapse mt-1',
        weekdays: 'flex',
        weekday: 'text-slate-400 w-8 font-medium text-[10px] uppercase tracking-wide',
        week: 'flex w-full mt-0.5',
        day: 'p-0 text-center text-[13px]',
        day_button: cn(
          'relative flex h-8 w-8 items-center justify-center rounded-md font-normal text-slate-700 transition-colors',
          'hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
        ),
        selected: '[&>button]:bg-[#4F46E5] [&>button]:text-white [&>button]:hover:bg-[#4338CA]',
        range_start:
          'bg-[#4F46E5] rounded-l-md [&>button]:!bg-[#4F46E5] [&>button]:!text-white [&>button]:hover:!bg-[#4338CA]',
        range_end:
          'bg-[#4F46E5] rounded-r-md [&>button]:!bg-[#4F46E5] [&>button]:!text-white [&>button]:hover:!bg-[#4338CA]',
        range_middle:
          'bg-indigo-50 [&>button]:!bg-transparent [&>button]:!text-[#4F46E5] [&>button]:hover:!bg-indigo-100 [&>button]:!rounded-none [&>button]:!font-medium',
        today: 'font-semibold [&>button]:text-[#4F46E5]',
        outside: 'text-slate-300 aria-selected:text-slate-400',
        disabled: 'text-slate-300 opacity-50 pointer-events-none',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...chevronProps }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" {...chevronProps} />
          ) : (
            <ChevronRight className="h-4 w-4" {...chevronProps} />
          ),
      }}
      {...props}
    />
  );
}
