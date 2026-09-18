/**
 * Single responsibility: Defines Zod schemas for all six official directive types and their
 * directive_interpretation entry shape as specified in the API contract.
 *
 * Each entry has: note_index, applies, directive_type, structured_adjustment, explanation.
 * The six directive_type values:
 * 1. solar_reduction → { hours: number[], factor: number }
 * 2. minimum_battery_reserve → { hours: number[], minimum_energy_kwh: number }
 * 3. no_charge_window → { hours: number[] }
 * 4. no_discharge_window → { hours: number[] }
 * 5. max_grid_window → { hours: number[], max_grid_kwh: number }
 * 6. no_op → structured_adjustment: null
 */

import { z } from 'zod';
import { DIRECTIVE_TYPE } from '../../shared/constants';

export const solarReductionAdjustmentSchema = z.object({
  hours: z.array(z.number().int().min(0).max(23)),
  factor: z.number().min(0).max(1),
});

export const minimumBatteryReserveAdjustmentSchema = z.object({
  hours: z.array(z.number().int().min(0).max(23)),
  minimum_energy_kwh: z.number().nonnegative(),
});

export const noChargeWindowAdjustmentSchema = z.object({
  hours: z.array(z.number().int().min(0).max(23)),
});

export const noDischargeWindowAdjustmentSchema = z.object({
  hours: z.array(z.number().int().min(0).max(23)),
});

export const maxGridWindowAdjustmentSchema = z.object({
  hours: z.array(z.number().int().min(0).max(23)),
  max_grid_kwh: z.number().nonnegative(),
});

/**
 * Schema for a single directive_interpretation entry in the API response.
 * Uses discriminatedUnion on directive_type to validate the correct structured_adjustment shape.
 */

const baseFields = {
  note_index: z.number().int().nonnegative(),
  applies: z.boolean(),
  explanation: z.string(),
};

export const solarReductionDirectiveSchema = z.object({
  ...baseFields,
  directive_type: z.literal(DIRECTIVE_TYPE.SOLAR_REDUCTION),
  structured_adjustment: solarReductionAdjustmentSchema,
});

export const minimumBatteryReserveDirectiveSchema = z.object({
  ...baseFields,
  directive_type: z.literal(DIRECTIVE_TYPE.MINIMUM_BATTERY_RESERVE),
  structured_adjustment: minimumBatteryReserveAdjustmentSchema,
});

export const noChargeWindowDirectiveSchema = z.object({
  ...baseFields,
  directive_type: z.literal(DIRECTIVE_TYPE.NO_CHARGE_WINDOW),
  structured_adjustment: noChargeWindowAdjustmentSchema,
});

export const noDischargeWindowDirectiveSchema = z.object({
  ...baseFields,
  directive_type: z.literal(DIRECTIVE_TYPE.NO_DISCHARGE_WINDOW),
  structured_adjustment: noDischargeWindowAdjustmentSchema,
});

export const maxGridWindowDirectiveSchema = z.object({
  ...baseFields,
  directive_type: z.literal(DIRECTIVE_TYPE.MAX_GRID_WINDOW),
  structured_adjustment: maxGridWindowAdjustmentSchema,
});

export const noOpDirectiveSchema = z.object({
  ...baseFields,
  directive_type: z.literal(DIRECTIVE_TYPE.NO_OP),
  structured_adjustment: z.null(),
});

export const directiveInterpretationEntrySchema = z.discriminatedUnion('directive_type', [
  solarReductionDirectiveSchema,
  minimumBatteryReserveDirectiveSchema,
  noChargeWindowDirectiveSchema,
  noDischargeWindowDirectiveSchema,
  maxGridWindowDirectiveSchema,
  noOpDirectiveSchema,
]);

export type DirectiveInterpretationEntrySchema = z.infer<typeof directiveInterpretationEntrySchema>;
