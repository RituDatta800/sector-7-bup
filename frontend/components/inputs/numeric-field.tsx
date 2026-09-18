'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface NumericFieldProps extends React.ComponentPropsWithoutRef<'input'> {
  /** 0–1. Drives the magnitude bar behind the field. */
  intensity?: number;
  tone?: 'demand' | 'solar' | 'tariff' | 'neutral';
  invalid?: boolean;
}

const TONE_COLOR: Record<NonNullable<NumericFieldProps['tone']>, string> = {
  demand: 'var(--viz-demand)',
  solar: 'var(--viz-solar)',
  tariff: 'var(--ramp-4)',
  neutral: 'var(--muted-foreground)',
};

/**
 * A number input with a magnitude bar washed behind it.
 *
 * With 72 numbers on screen, the bar is what makes a mistyped digit visible —
 * an out-of-place value breaks the shape of the column at a glance.
 */
export const NumericField = forwardRef<HTMLInputElement, NumericFieldProps>(function NumericField(
  { intensity = 0, tone = 'neutral', invalid, className, ...props },
  ref,
) {
  const width = Math.max(0, Math.min(1, Number.isFinite(intensity) ? intensity : 0)) * 100;

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 rounded-[5px] transition-[width] duration-200"
        style={{
          width: `${width}%`,
          background: `color-mix(in oklab, ${TONE_COLOR[tone]} 16%, transparent)`,
        }}
      />
      <input
        ref={ref}
        type="number"
        inputMode="decimal"
        aria-invalid={invalid || undefined}
        className={cn(
          'tabular border-input bg-transparent relative h-8 w-full rounded-[6px] border px-2 text-right text-xs outline-none',
          'transition-[border-color,box-shadow]',
          'focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/25 aria-invalid:ring-[3px]',
          className,
        )}
        {...props}
      />
    </div>
  );
});
