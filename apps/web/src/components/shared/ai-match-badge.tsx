'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { cn, getMatchScoreStyle } from '@/lib/utils';

interface AIMatchBadgeProps {
  score: number | null;
  onClick?: () => void;
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function AIMatchBadge({ score, onClick, size = 'sm', loading }: AIMatchBadgeProps) {
  if (score === null) {
    return (
      <button
        type="button"
        onClick={onClick}
        title="Run AI candidate-job match analysis"
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 bg-slate-50 font-medium text-slate-500 transition-opacity hover:opacity-85',
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
          onClick ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <Sparkles className="h-3 w-3 shrink-0" />
        <span>{loading ? 'Evaluating…' : 'Run AI Match'}</span>
      </button>
    );
  }

  const style = getMatchScoreStyle(score);
  return (
    <button
      type="button"
      onClick={onClick}
      title="Click to inspect AI Match Breakdown"
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-mono font-semibold transition-opacity hover:opacity-85',
        style.bg,
        style.text,
        style.border,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <Sparkles className="h-3 w-3 shrink-0" />
      <span>{score}% Match</span>
    </button>
  );
}
