'use client';

import { useFormContext, useWatch } from 'react-hook-form';
import { BatteryCharging } from 'lucide-react';
import { Label } from '@/components/ui/label';
import type { ScenarioFormValues } from '@/lib/schemas';
import { formatKwh } from '@/lib/format';
import { NumericField } from './numeric-field';

const FIELDS = [
  { key: 'capacity_kwh', label: 'Capacity', unit: 'kWh' },
  { key: 'initial_energy_kwh', label: 'Starting charge', unit: 'kWh' },
  { key: 'minimum_energy_kwh', label: 'Minimum reserve', unit: 'kWh' },
  { key: 'max_charge_kwh_per_hour', label: 'Max charge rate', unit: 'kWh/h' },
  { key: 'max_discharge_kwh_per_hour', label: 'Max discharge rate', unit: 'kWh/h' },
] as const;

/**
 * Battery limits, with a live gauge of where the pack starts relative to its
 * reserve floor — the pair of numbers most likely to make a scenario
 * infeasible before the solver ever sees it.
 */
export function BatteryPanel() {
  const { register, control, formState } = useFormContext<ScenarioFormValues>();
  const battery = useWatch({ control, name: 'battery' });
  const errors = formState.errors.battery;

  const capacity = Number(battery?.capacity_kwh) || 0;
  const initial = Number(battery?.initial_energy_kwh) || 0;
  const minimum = Number(battery?.minimum_energy_kwh) || 0;

  const initialPct = capacity > 0 ? Math.min(100, (initial / capacity) * 100) : 0;
  const minimumPct = capacity > 0 ? Math.min(100, (minimum / capacity) * 100) : 0;
  const usable = Math.max(0, initial - minimum);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <BatteryCharging className="size-3.5" />
          Battery limits
        </span>
        <span className="text-subtle-foreground tabular text-[11px]">
          {formatKwh(usable)} usable at start
        </span>
      </div>

      {/* Reserve floor vs starting charge, on the pack's own scale. */}
      <div className="bg-muted relative h-2 overflow-hidden rounded-full">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${initialPct}%`,
            background: 'color-mix(in oklab, var(--viz-battery) 70%, transparent)',
          }}
        />
        <div
          className="absolute inset-y-0 w-0.5"
          style={{ left: `${minimumPct}%`, background: 'var(--status-critical)' }}
          title="Minimum reserve"
        />
      </div>

      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-x-3 gap-y-2.5">
        {FIELDS.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={`battery-${field.key}`} className="text-subtle-foreground">
              {field.label}
              <span className="text-subtle-foreground/70 font-normal">{field.unit}</span>
            </Label>
            <NumericField
              id={`battery-${field.key}`}
              tone="neutral"
              min={0}
              step={5}
              invalid={Boolean(errors?.[field.key])}
              {...register(`battery.${field.key}`, { valueAsNumber: true })}
            />
            {errors?.[field.key] ? (
              <p className="text-destructive text-[10px] leading-tight">
                {errors[field.key]?.message}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
