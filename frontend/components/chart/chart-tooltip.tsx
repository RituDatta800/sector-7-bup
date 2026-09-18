'use client';

import { Fragment } from 'react';
import type { ChartRow, DirectiveWindow } from '@/lib/chart-data';
import {
  batteryActionLabel,
  directiveLabel,
  formatBdtPrecise,
  formatKwhPrecise,
  formatTariff,
  hourRangeLabel,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import { SERIES } from './series';

/**
 * Recharts hands the tooltip its payload as a loosely-typed array. Rather than
 * casting at the call site, the row is extracted and guarded here.
 */
function extractRow(payload: unknown): ChartRow | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;

  const first: unknown = payload[0];
  if (typeof first !== 'object' || first === null || !('payload' in first)) return null;

  const row = (first as { payload?: unknown }).payload;
  if (typeof row !== 'object' || row === null || !('hour' in row)) return null;

  return row as ChartRow;
}

export interface EnergyTooltipProps {
  active?: boolean;
  payload?: unknown;
  directivesByHour: Map<number, DirectiveWindow[]>;
  /** Battery capacity, so state of charge can be shown as a share of the pack. */
  capacityKwh: number;
  /** Baseline row for the same hour, when a solved plan is on screen. */
  compareRows?: readonly ChartRow[] | null;
}

function Row({
  swatch,
  label,
  value,
  muted,
}: {
  swatch?: string;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-2">
        {swatch ? (
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-[2px]"
            style={{ background: swatch }}
          />
        ) : (
          <span aria-hidden className="size-2 shrink-0" />
        )}
        <span className={cn('text-[11px]', muted ? 'text-subtle-foreground' : 'text-muted-foreground')}>
          {label}
        </span>
      </span>
      <span className="tabular text-[11px] font-medium">{value}</span>
    </div>
  );
}

/**
 * Custom HTML tooltip. Every figure here is also reachable from the plan table,
 * so the tooltip enhances the chart rather than gating its values.
 */
export function EnergyTooltip({
  active,
  payload,
  directivesByHour,
  capacityKwh,
  compareRows,
}: EnergyTooltipProps) {
  const row = extractRow(payload);
  if (!active || !row) return null;

  const directives = directivesByHour.get(row.hour) ?? [];
  const baseline = compareRows?.find((candidate) => candidate.hour === row.hour) ?? null;
  const costDelta = baseline ? row.cost_bdt - baseline.cost_bdt : null;
  const curtailed = Math.max(0, row.solar_available_kwh - row.solar_used_kwh);
  const socPct = capacityKwh > 0 ? (row.battery_energy_after_kwh / capacityKwh) * 100 : 0;

  const batteryFlow =
    row.battery_charge_kwh > 0
      ? row.battery_charge_kwh
      : row.battery_discharge_kwh < 0
        ? Math.abs(row.battery_discharge_kwh)
        : 0;

  return (
    <div
      role="tooltip"
      className="bg-popover/98 text-popover-foreground pointer-events-none min-w-60 rounded-lg border p-3 shadow-lg backdrop-blur-sm"
    >
      <div className="mb-2.5 flex items-baseline justify-between gap-4">
        <span className="tabular text-xs font-semibold">{hourRangeLabel(row.hour)}</span>
        <span className="text-subtle-foreground tabular text-[11px]">
          {formatTariff(row.tariff_bdt_per_kwh)}
        </span>
      </div>

      <div className="space-y-1.5">
        {SERIES.map((spec) => {
          if (spec.key === 'battery_charge_kwh' || spec.key === 'battery_discharge_kwh') return null;
          return (
            <Row
              key={spec.key}
              swatch={spec.color}
              label={spec.label}
              value={formatKwhPrecise(row[spec.key])}
            />
          );
        })}

        {curtailed > 0.01 ? (
          <Row label="Solar curtailed" value={formatKwhPrecise(curtailed)} muted />
        ) : null}
      </div>

      <div className="my-2.5 border-t" />

      <div className="space-y-1.5">
        <Row
          swatch={
            row.battery_action === 'discharge' ? 'var(--viz-discharge)' : 'var(--viz-battery)'
          }
          label={batteryActionLabel(row.battery_action)}
          value={batteryFlow > 0 ? formatKwhPrecise(batteryFlow) : '—'}
        />
        <Row
          label="State of charge"
          value={`${formatKwhPrecise(row.battery_energy_after_kwh)} · ${socPct.toFixed(0)}%`}
          muted
        />
      </div>

      <div className="my-2.5 border-t" />

      <div className="flex items-baseline justify-between gap-6">
        <span className="text-muted-foreground text-[11px]">Hour cost</span>
        <span className="flex items-baseline gap-2">
          <span className="tabular text-xs font-semibold">{formatBdtPrecise(row.cost_bdt)}</span>
          {costDelta !== null && Math.abs(costDelta) >= 0.01 ? (
            <span
              className="tabular text-[10px] font-medium"
              style={{
                color: costDelta < 0 ? 'var(--status-good)' : 'var(--status-serious)',
              }}
            >
              {costDelta < 0 ? '▼' : '▲'} {formatBdtPrecise(Math.abs(costDelta))}
            </span>
          ) : null}
        </span>
      </div>

      {directives.length > 0 ? (
        <div className="mt-2.5 space-y-1 border-t pt-2.5">
          {directives.map((window) => (
            <Fragment key={window.key}>
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-[3px] size-2 shrink-0 rounded-full"
                  style={{ background: 'var(--viz-highlight-edge)' }}
                />
                <span className="text-[11px] leading-snug">
                  <span className="font-medium">{directiveLabel(window.directiveType)}</span>
                  <span className="text-subtle-foreground"> · note {window.noteIndex + 1}</span>
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}
