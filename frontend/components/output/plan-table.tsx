'use client';

import { useMemo } from 'react';
import { Download, TableProperties } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { ChartRow, DirectiveWindow } from '@/lib/chart-data';
import { buildDirectiveHourIndex } from '@/lib/chart-data';
import {
  batteryActionLabel,
  directiveLabel,
  formatNumber,
  hourLabel,
} from '@/lib/format';
import { cn } from '@/lib/utils';

const HEADERS = [
  'Hour',
  'Demand',
  'Solar used',
  'Grid',
  'Battery',
  'Flow',
  'SoC',
  'Tariff',
  'Cost',
  'Δ cost',
] as const;

function toCsv(rows: readonly ChartRow[]): string {
  const header = [
    'hour',
    'demand_kwh',
    'solar_available_kwh',
    'solar_used_kwh',
    'grid_kwh',
    'battery_action',
    'battery_kwh',
    'battery_energy_after_kwh',
    'tariff_bdt_per_kwh',
    'cost_bdt',
  ].join(',');

  const body = rows.map((row) =>
    [
      row.hour,
      row.demand_kwh,
      row.solar_available_kwh,
      row.solar_used_kwh,
      row.grid_kwh,
      row.battery_action,
      row.battery_charge_kwh > 0 ? row.battery_charge_kwh : Math.abs(row.battery_discharge_kwh),
      row.battery_energy_after_kwh,
      row.tariff_bdt_per_kwh,
      row.cost_bdt.toFixed(2),
    ].join(','),
  );

  return [header, ...body].join('\n');
}

/**
 * The table twin of the chart.
 *
 * Every value the plot encodes as position or colour is also readable here as
 * text, which is what keeps the visualisation from being the only way to get at
 * the numbers.
 */
export function PlanTable({
  rows,
  baselineRows,
  directiveWindows,
  scenarioId,
  className,
}: {
  rows: readonly ChartRow[];
  baselineRows: readonly ChartRow[];
  directiveWindows: readonly DirectiveWindow[];
  scenarioId: string;
  className?: string;
}) {
  const directivesByHour = useMemo(
    () => buildDirectiveHourIndex(directiveWindows),
    [directiveWindows],
  );

  function downloadCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${scenarioId || 'scenario'}-hourly-plan.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TableProperties className="size-3.5" />
          Hourly plan
        </CardTitle>
        <CardDescription>
          The full 24-hour dispatch as numbers. Δ cost compares each hour against the baseline
          dispatch.
        </CardDescription>
        <CardAction>
          <Button type="button" size="sm" variant="outline" onClick={downloadCsv}>
            <Download />
            CSV
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="px-0 pt-3 pb-0">
        <ScrollArea className="h-[340px]" viewportClassName="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-[11px]">
            <caption className="sr-only">
              Hourly energy plan for scenario {scenarioId}: demand, solar used, grid import,
              battery action, state of charge, tariff and cost for each hour.
            </caption>
            <thead>
              <tr>
                {HEADERS.map((header, index) => (
                  <th
                    key={header}
                    scope="col"
                    className={cn(
                      'bg-card text-subtle-foreground sticky top-0 z-10 border-b px-2 py-2 text-[10px] font-medium tracking-wide whitespace-nowrap uppercase',
                      index === 0 ? 'pl-5 text-left' : 'text-right',
                      index === HEADERS.length - 1 && 'pr-5',
                    )}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const baseline = baselineRows.find((candidate) => candidate.hour === row.hour);
                const delta = baseline ? row.cost_bdt - baseline.cost_bdt : 0;
                const directives = directivesByHour.get(row.hour) ?? [];
                const flow =
                  row.battery_charge_kwh > 0
                    ? row.battery_charge_kwh
                    : Math.abs(row.battery_discharge_kwh);

                return (
                  <tr
                    key={row.hour}
                    className={cn(
                      'hover:bg-muted/50 transition-colors',
                      directives.length > 0 && 'bg-primary/[0.04]',
                    )}
                  >
                    <th
                      scope="row"
                      className="tabular border-b py-1.5 pl-5 text-left font-normal whitespace-nowrap"
                    >
                      <span className="flex items-center gap-1.5">
                        {hourLabel(row.hour)}
                        {directives.length > 0 ? (
                          <span
                            aria-label={directives
                              .map((window) => directiveLabel(window.directiveType))
                              .join(', ')}
                            title={directives
                              .map((window) => directiveLabel(window.directiveType))
                              .join(', ')}
                            className="size-1.5 rounded-full"
                            style={{ background: 'var(--viz-highlight-edge)' }}
                          />
                        ) : null}
                      </span>
                    </th>
                    <td className="tabular border-b px-2 py-1.5 text-right">
                      {formatNumber(row.demand_kwh)}
                    </td>
                    <td className="tabular border-b px-2 py-1.5 text-right">
                      {formatNumber(row.solar_used_kwh)}
                    </td>
                    <td className="tabular border-b px-2 py-1.5 text-right font-medium">
                      {formatNumber(row.grid_kwh)}
                    </td>
                    <td className="border-b px-2 py-1.5 text-right">
                      <Badge
                        variant={row.battery_action === 'idle' ? 'outline' : 'secondary'}
                        className="font-normal"
                      >
                        {batteryActionLabel(row.battery_action)}
                      </Badge>
                    </td>
                    <td className="tabular border-b px-2 py-1.5 text-right">
                      {flow > 0 ? formatNumber(flow) : '—'}
                    </td>
                    <td className="tabular border-b px-2 py-1.5 text-right">
                      {formatNumber(row.battery_energy_after_kwh)}
                    </td>
                    <td className="tabular text-muted-foreground border-b px-2 py-1.5 text-right">
                      {formatNumber(row.tariff_bdt_per_kwh, 2)}
                    </td>
                    <td className="tabular border-b px-2 py-1.5 text-right">
                      {formatNumber(row.cost_bdt, 0)}
                    </td>
                    <td
                      className="tabular border-b px-2 py-1.5 pr-5 text-right"
                      style={{
                        color:
                          Math.abs(delta) < 0.5
                            ? 'var(--subtle-foreground)'
                            : delta < 0
                              ? 'var(--status-good)'
                              : 'var(--status-serious)',
                      }}
                    >
                      {Math.abs(delta) < 0.5
                        ? '—'
                        : `${delta < 0 ? '−' : '+'}${formatNumber(Math.abs(delta), 0)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
