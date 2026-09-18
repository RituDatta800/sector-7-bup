/**
 * Seed scenarios for the console. Figures are representative of a mid-sized
 * Dhaka university campus on a time-of-use commercial tariff: an overnight
 * off-peak band, a daytime shoulder, and an evening peak.
 */

import type { HourEntry, OptimizeEnergyRequest } from '@/lib/schemas';
import { HOURS_IN_DAY } from '@/lib/schemas';

interface ScenarioShape {
  /** kWh drawn by the campus, indexed by hour. */
  demand: readonly number[];
  /** kWh available at the array under this day's sky, indexed by hour. */
  solar: readonly number[];
  /** BDT per kWh, indexed by hour. */
  tariff: readonly number[];
}

const TOU_TARIFF: readonly number[] = [
  8.2, 8.2, 8.2, 8.2, 8.2, 8.2, 10.4, 10.4, 10.4, 10.4, 10.4, 10.4, 10.4, 10.4, 10.4, 10.4, 10.4,
  13.8, 13.8, 13.8, 13.8, 13.8, 10.4, 8.2,
];

const PEAK_HEAVY_TARIFF: readonly number[] = TOU_TARIFF.map((rate, hour) =>
  hour >= 17 && hour <= 22 ? 16.5 : rate,
);

const CLEAR_SKY_SOLAR: readonly number[] = [
  0, 0, 0, 0, 0, 0, 4, 22, 58, 96, 128, 148, 156, 149, 130, 99, 61, 24, 5, 0, 0, 0, 0, 0,
];

function buildHours({ demand, solar, tariff }: ScenarioShape): HourEntry[] {
  return Array.from({ length: HOURS_IN_DAY }, (_, hour) => ({
    hour,
    demand_kwh: demand[hour] ?? 0,
    solar_kwh: solar[hour] ?? 0,
    tariff_bdt_per_kwh: tariff[hour] ?? 0,
  }));
}

export interface ScenarioPreset {
  id: string;
  name: string;
  blurb: string;
  request: OptimizeEnergyRequest;
}

const TYPICAL_WEEKDAY_DEMAND: readonly number[] = [
  62, 58, 55, 54, 56, 64, 82, 118, 164, 196, 214, 222, 208, 214, 219, 206, 178, 152, 144, 138, 126,
  108, 88, 71,
];

const MONSOON_DEMAND: readonly number[] = [
  74, 70, 67, 66, 68, 77, 96, 132, 178, 211, 232, 244, 231, 238, 241, 228, 199, 171, 160, 151, 137,
  118, 97, 82,
];

const EXAM_WEEK_DEMAND: readonly number[] = [
  68, 63, 59, 57, 60, 70, 90, 126, 172, 203, 221, 228, 216, 223, 229, 218, 196, 184, 192, 188, 174,
  151, 122, 88,
];

export const SCENARIO_PRESETS: readonly ScenarioPreset[] = [
  {
    id: 'campus-weekday-clear',
    name: 'Clear weekday',
    blurb: 'Full sun, standard time-of-use tariff, ordinary teaching load.',
    request: {
      scenario_id: 'campus-weekday-clear',
      operator_notes: ['Keep at least 120 kWh in the battery between 6 PM and 10 PM.'],
      hours: buildHours({
        demand: TYPICAL_WEEKDAY_DEMAND,
        solar: CLEAR_SKY_SOLAR,
        tariff: TOU_TARIFF,
      }),
      battery: {
        capacity_kwh: 400,
        initial_energy_kwh: 160,
        minimum_energy_kwh: 60,
        max_charge_kwh_per_hour: 90,
        max_discharge_kwh_per_hour: 90,
      },
    },
  },
  {
    id: 'campus-monsoon-overcast',
    name: 'Monsoon overcast',
    blurb: 'Array output down ~60%, cooling load up. Grid does the heavy lifting.',
    request: {
      scenario_id: 'campus-monsoon-overcast',
      operator_notes: [
        'Panels are washed out today, assume 35% of forecast output from 10 AM to 4 PM.',
        'Do not charge the battery during the evening peak.',
      ],
      hours: buildHours({
        demand: MONSOON_DEMAND,
        solar: CLEAR_SKY_SOLAR.map((kwh) => Math.round(kwh * 0.38)),
        tariff: TOU_TARIFF,
      }),
      battery: {
        capacity_kwh: 400,
        initial_energy_kwh: 220,
        minimum_energy_kwh: 80,
        max_charge_kwh_per_hour: 90,
        max_discharge_kwh_per_hour: 90,
      },
    },
  },
  {
    id: 'campus-exam-week-peak',
    name: 'Exam week peak',
    blurb: 'Libraries open late, punitive evening tariff, tight grid ceiling.',
    request: {
      scenario_id: 'campus-exam-week-peak',
      operator_notes: [
        'Cap grid import at 150 kWh per hour between 6 PM and 9 PM.',
        'Hold 140 kWh of reserve through the evening.',
        'No battery charging from 5 PM to 10 PM.',
      ],
      hours: buildHours({
        demand: EXAM_WEEK_DEMAND,
        solar: CLEAR_SKY_SOLAR.map((kwh) => Math.round(kwh * 0.92)),
        tariff: PEAK_HEAVY_TARIFF,
      }),
      battery: {
        capacity_kwh: 500,
        initial_energy_kwh: 300,
        minimum_energy_kwh: 100,
        max_charge_kwh_per_hour: 110,
        max_discharge_kwh_per_hour: 110,
      },
    },
  },
] as const;

export const DEFAULT_PRESET: ScenarioPreset = SCENARIO_PRESETS[0]!;

/** Short, clickable note suggestions surfaced next to the operator-notes editor. */
export const NOTE_SUGGESTIONS: readonly string[] = [
  'Reduce solar to 20% from 1 PM to 3 PM for panel cleaning.',
  'Keep at least 150 kWh in the battery between 6 PM and 10 PM.',
  'No battery charging between 5 PM and 9 PM.',
  'Do not discharge the battery before noon.',
  'Cap grid import at 160 kWh per hour during the evening peak.',
  'Nothing unusual today.',
];
