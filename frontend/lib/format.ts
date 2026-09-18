/** Shared number/label formatting. Everything the user reads as a figure comes from here. */

const kwhFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const kwhPreciseFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const bdtFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const bdtPreciseFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function formatKwh(value: number): string {
  return `${kwhFormatter.format(value)} kWh`;
}

export function formatKwhPrecise(value: number): string {
  return `${kwhPreciseFormatter.format(value)} kWh`;
}

export function formatNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

export function formatBdt(value: number): string {
  return `৳${bdtFormatter.format(value)}`;
}

export function formatBdtPrecise(value: number): string {
  return `৳${bdtPreciseFormatter.format(value)}`;
}

export function formatTariff(value: number): string {
  return `৳${kwhPreciseFormatter.format(value)}/kWh`;
}

export function formatPercent(value: number, maximumFractionDigits = 1): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value)}%`;
}

export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatPercent(value)}`;
}

/** Hour index → wall-clock label for the start of that hour. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** Hour index → the interval it represents, e.g. 13 → "13:00–14:00". */
export function hourRangeLabel(hour: number): string {
  return `${hourLabel(hour)}–${hourLabel((hour + 1) % 24)}`;
}

/** Collapse a sparse hour list into contiguous runs: [1,2,3,7] → [[1,3],[7,7]]. */
export function toHourRuns(hours: readonly number[]): Array<[number, number]> {
  const sorted = [...new Set(hours)].sort((a, b) => a - b);
  const runs: Array<[number, number]> = [];

  for (const hour of sorted) {
    const last = runs[runs.length - 1];
    if (last && hour === last[1] + 1) {
      last[1] = hour;
    } else {
      runs.push([hour, hour]);
    }
  }

  return runs;
}

/** Human label for an hour set: [13,14,15] → "13:00–16:00". */
export function formatHourSet(hours: readonly number[]): string {
  const runs = toHourRuns(hours);
  if (runs.length === 0) return '—';

  return runs
    .map(([start, end]) => `${hourLabel(start)}–${hourLabel((end + 1) % 24)}`)
    .join(', ');
}

const DIRECTIVE_LABELS: Record<string, string> = {
  solar_reduction: 'Solar reduction',
  minimum_battery_reserve: 'Minimum battery reserve',
  no_charge_window: 'No-charge window',
  no_discharge_window: 'No-discharge window',
  max_grid_window: 'Grid import cap',
  no_op: 'No operation',
};

export function directiveLabel(directiveType: string): string {
  return DIRECTIVE_LABELS[directiveType] ?? directiveType;
}

const BATTERY_ACTION_LABELS: Record<string, string> = {
  charge: 'Charging',
  discharge: 'Discharging',
  idle: 'Idle',
};

export function batteryActionLabel(action: string): string {
  return BATTERY_ACTION_LABELS[action] ?? action;
}
