/**
 * Single responsibility: Defines the canonical Zod schema and TypeScript type for the POST /optimize-energy request.
 * Field names match the exact API contract.
 */

import { z } from 'zod';
import { hourEntrySchema, batterySpecSchema } from '../../shared/types';

export const optimizeEnergyRequestSchema = z.object({
  scenario_id: z.string(),
  operator_notes: z.array(z.string()).min(1).max(3),
  hours: z.array(hourEntrySchema).length(24),
  battery: batterySpecSchema,
});

export type OptimizeEnergyRequestDto = z.infer<typeof optimizeEnergyRequestSchema>;
