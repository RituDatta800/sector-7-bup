/**
 * Single responsibility: Defines the canonical Zod schema and TypeScript type for an hourly scenario entry.
 * Field names match the exact API contract: hour, demand_kwh, solar_kwh, tariff_bdt_per_kwh.
 */

import { z } from 'zod';

export const hourEntrySchema = z.object({
  hour: z.number().int().min(0).max(23),
  demand_kwh: z.number().nonnegative(),
  solar_kwh: z.number().nonnegative(),
  tariff_bdt_per_kwh: z.number().nonnegative(),
});

export type HourEntry = z.infer<typeof hourEntrySchema>;
