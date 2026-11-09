'use client';

import * as React from 'react';
import { CalendarDays, X } from 'lucide-react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type DatePresetId = '7d' | '30d' | '90d' | '1y' | 'custom';

const PRESETS: Array<{ id: Exclude<DatePresetId, 'custom'>; label: string }> = [
  { id: '7d', label: 'Last 7d' },
  { id: '30d', label: 'Last 30d' },
  { id: '90d', label: 'Last 90d' },
  { id: '1y', label: 'This Year' },
];

function parseIsoDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function DateRangeFilter({
  value,
  customFrom,
  customTo,
  onPresetChange,
  onCustomRangeChange,
}: {
  value: DatePresetId;
  customFrom?: string;
  customTo?: string;
  onPresetChange: (preset: Exclude<DatePresetId, 'custom'>) => void;
  onCustomRangeChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draftRange, setDraftRange] = React.useState<DateRange | undefined>(
    value === 'custom' ? { from: parseIsoDate(customFrom), to: parseIsoDate(customTo) } : undefined,
  );

  React.useEffect(() => {
    if (open) {
      setDraftRange(
        value === 'custom' ? { from: parseIsoDate(customFrom), to: parseIsoDate(customTo) } : undefined,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const customLabel =
    value === 'custom' && customFrom && customTo
      ? `${format(parseIsoDate(customFrom)!, 'MMM d, yyyy')} – ${format(parseIsoDate(customTo)!, 'MMM d, yyyy')}`
      : 'Custom range';

  const handleApply = () => {
    if (!draftRange?.from || !draftRange?.to) return;
    onCustomRangeChange(toIsoDate(draftRange.from), toIsoDate(draftRange.to));
    setOpen(false);
  };

  const handleClear = () => {
    setDraftRange(undefined);
    onPresetChange('30d');
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-1">
        {PRESETS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onPresetChange(opt.id)}
            className={cn(
              'whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition',
              value === opt.id ? 'bg-[#4F46E5] text-white' : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={value === 'custom' ? 'primary' : 'outline'}
            size="sm"
            className="shrink-0 gap-1.5 whitespace-nowrap"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {customLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto">
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={draftRange?.from}
            selected={draftRange}
            onSelect={setDraftRange}
          />
          <div className="flex items-center justify-between gap-2 border-t border-[#E2E8F0] p-3">
            <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!draftRange?.from || !draftRange?.to}
              onClick={handleApply}
            >
              Apply Range
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
