/**
 * Single responsibility: Defines the canonical Zod schema and TypeScript type for the POST /optimize-energy response.
 * Top-level fields match the exact API contract:
 *   scenario_id, directive_interpretation, hourly_plan, total_grid_kwh, total_cost_bdt, peak_grid_kwh, plan_summary
 */

import { z } from 'zod';
import { directiveInterpretationEntrySchema } from '../../guardrails/schemas';

export const hourlyPlanItemSchema = z.object({
  hour: z.number().int().min(0).max(23),
  grid_kwh: z.number().nonnegative(),
  solar_used_kwh: z.number().nonnegative(),
  battery_action: z.enum(['charge', 'discharge', 'idle']),
  battery_kwh: z.number().nonnegative(),
  battery_energy_after_kwh: z.number().nonnegative(),
});

export const optimizeEnergyResponseSchema = z.object({
  scenario_id: z.string(),
  directive_interpretation: z.array(directiveInterpretationEntrySchema),
  hourly_plan: z.array(hourlyPlanItemSchema).length(24),
  total_grid_kwh: z.number().nonnegative(),
  total_cost_bdt: z.number(),
  peak_grid_kwh: z.number().nonnegative(),
  plan_summary: z.string(),
});

export type OptimizeEnergyResponseDto = z.infer<typeof optimizeEnergyResponseSchema>;
export type HourlyPlanItem = z.infer<typeof hourlyPlanItemSchema>;
