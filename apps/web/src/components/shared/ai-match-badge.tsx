'use client';

import * as React from 'react';
import { Sparkles } from 'lucide-react';
import { cn, getMatchScoreStyle } from '@/lib/utils';

interface AIMatchBadgeProps {
  score: number;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function AIMatchBadge({ score, onClick, size = 'sm' }: AIMatchBadgeProps) {
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
