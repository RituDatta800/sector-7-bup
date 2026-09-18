/**
 * Single responsibility: Defines the canonical Zod schema and TypeScript type for battery specifications.
 * Field names match the exact API contract.
 */

import { z } from 'zod';

export const batterySpecSchema = z.object({
  capacity_kwh: z.number().positive(),
  initial_energy_kwh: z.number().nonnegative(),
  minimum_energy_kwh: z.number().nonnegative(),
  max_charge_kwh_per_hour: z.number().positive(),
  max_discharge_kwh_per_hour: z.number().positive(),
});

export type BatterySpec = z.infer<typeof batterySpecSchema>;
