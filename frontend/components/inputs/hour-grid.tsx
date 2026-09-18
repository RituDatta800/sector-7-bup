'use client';

import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Sun, Zap, Receipt } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ScenarioFormValues } from '@/lib/schemas';
import { hourLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

const COLUMNS = [
  { key: 'demand_kwh', label: 'Demand', unit: 'kWh', tone: 'demand', icon: Zap },
  { key: 'solar_kwh', label: 'Solar', unit: 'kWh', tone: 'solar', icon: Sun },
  { key: 'tariff_bdt_per_kwh', label: 'Tariff', unit: '৳/kWh', tone: 'tariff', icon: Receipt },
] as const;

import { NumericField } from './numeric-field';

/**
 * The 24×3 scenario editor. Rows are the hours of the day; the shaded bar in
 * each cell is scaled against the column maximum so the daily shape of demand,
 * solar and tariff is legible without leaving the form.
 */
export function HourGrid() {
  const { register, control, formState } = useFormContext<ScenarioFormValues>();
  const hours = useWatch({ control, name: 'hours' });

  const maxima = useMemo(() => {
    const safe = Array.isArray(hours) ? hours : [];
    return {
      demand_kwh: Math.max(1, ...safe.map((h) => Number(h?.demand_kwh) || 0)),
      solar_kwh: Math.max(1, ...safe.map((h) => Number(h?.solar_kwh) || 0)),
      tariff_bdt_per_kwh: Math.max(1, ...safe.map((h) => Number(h?.tariff_bdt_per_kwh) || 0)),
    };
  }, [hours]);

  const hourErrors = formState.errors.hours;

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="bg-muted/60 grid grid-cols-[52px_repeat(3,minmax(0,1fr))] items-center gap-2 border-b px-2.5 py-2">
        <span className="text-subtle-foreground text-[10px] font-medium tracking-wide uppercase">
          Hour
        </span>
        {COLUMNS.map((column) => (
          <Tooltip key={column.key}>
            <TooltipTrigger asChild>
              <span className="text-subtle-foreground flex cursor-help items-center justify-end gap-1 text-[10px] font-medium tracking-wide uppercase">
                <column.icon className="size-3" />
                {column.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {column.label} · {column.unit}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <ScrollArea className="h-[302px]" viewportClassName="px-2.5 py-1.5">
        <div className="space-y-1">
          {Array.from({ length: 24 }, (_, index) => {
            const rowError = hourErrors?.[index];

            return (
              <div
                key={index}
                className={cn(
                  'grid grid-cols-[52px_repeat(3,minmax(0,1fr))] items-center gap-2 rounded-md py-0.5',
                  'hover:bg-muted/50 transition-colors',
                )}
              >
                <span className="text-subtle-foreground tabular pl-1 text-[11px]">
                  {hourLabel(index)}
                </span>

                <input type="hidden" {...register(`hours.${index}.hour`, { valueAsNumber: true })} />

                {COLUMNS.map((column) => (
                  <NumericField
                    key={column.key}
                    tone={column.tone}
                    step={column.key === 'tariff_bdt_per_kwh' ? 0.1 : 1}
                    min={0}
                    intensity={(Number(hours?.[index]?.[column.key]) || 0) / maxima[column.key]}
                    invalid={Boolean(rowError?.[column.key])}
                    aria-label={`${column.label} at ${hourLabel(index)}`}
                    {...register(`hours.${index}.${column.key}`, { valueAsNumber: true })}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
