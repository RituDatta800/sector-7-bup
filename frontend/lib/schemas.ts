/**
 * Canonical Zod schemas + TypeScript types for the POST /optimize-energy contract.
 *
 * These mirror `backend/src/optimize-energy/dto/*` and `backend/src/guardrails/schemas/*`
 * field-for-field. The response is parsed with these on arrival, so a backend that
 * drifts from the contract fails loudly in the UI instead of rendering NaN.
 */

import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Directive types                                                            */
/* -------------------------------------------------------------------------- */

export const DIRECTIVE_TYPES = [
  'solar_reduction',
  'minimum_battery_reserve',
  'no_charge_window',
  'no_discharge_window',
  'max_grid_window',
  'no_op',
] as const;

export type DirectiveType = (typeof DIRECTIVE_TYPES)[number];

export const HOURS_IN_DAY = 24;
export const MAX_OPERATOR_NOTES = 3;

const hourIndex = z.number().int().min(0).max(23);
const hourList = z.array(hourIndex);

/* -------------------------------------------------------------------------- */
/* Request                                                                     */
/* -------------------------------------------------------------------------- */

export const hourEntrySchema = z.object({
  hour: hourIndex,
  demand_kwh: z.number().nonnegative(),
  solar_kwh: z.number().nonnegative(),
  tariff_bdt_per_kwh: z.number().nonnegative(),
});

export const batterySpecSchema = z.object({
  capacity_kwh: z.number().positive(),
  initial_energy_kwh: z.number().nonnegative(),
  minimum_energy_kwh: z.number().nonnegative(),
  max_charge_kwh_per_hour: z.number().positive(),
  max_discharge_kwh_per_hour: z.number().positive(),
});

export const optimizeEnergyRequestSchema = z.object({
  scenario_id: z.string().min(1),
  operator_notes: z.array(z.string()).min(1).max(MAX_OPERATOR_NOTES),
  hours: z.array(hourEntrySchema).length(HOURS_IN_DAY),
  battery: batterySpecSchema,
});

export type HourEntry = z.infer<typeof hourEntrySchema>;
export type BatterySpec = z.infer<typeof batterySpecSchema>;
export type OptimizeEnergyRequest = z.infer<typeof optimizeEnergyRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Response                                                                    */
/* -------------------------------------------------------------------------- */

export const solarReductionAdjustmentSchema = z.object({
  hours: hourList,
  factor: z.number().min(0).max(1),
});

export const minimumBatteryReserveAdjustmentSchema = z.object({
  hours: hourList,
  minimum_energy_kwh: z.number().nonnegative(),
});

export const noChargeWindowAdjustmentSchema = z.object({ hours: hourList });
export const noDischargeWindowAdjustmentSchema = z.object({ hours: hourList });

export const maxGridWindowAdjustmentSchema = z.object({
  hours: hourList,
  max_grid_kwh: z.number().nonnegative(),
});

const directiveBase = {
  note_index: z.number().int().nonnegative(),
  applies: z.boolean(),
  explanation: z.string(),
};

export const directiveInterpretationEntrySchema = z.discriminatedUnion('directive_type', [
  z.object({
    ...directiveBase,
    directive_type: z.literal('solar_reduction'),
    structured_adjustment: solarReductionAdjustmentSchema,
  }),
  z.object({
    ...directiveBase,
    directive_type: z.literal('minimum_battery_reserve'),
    structured_adjustment: minimumBatteryReserveAdjustmentSchema,
  }),
  z.object({
    ...directiveBase,
    directive_type: z.literal('no_charge_window'),
    structured_adjustment: noChargeWindowAdjustmentSchema,
  }),
  z.object({
    ...directiveBase,
    directive_type: z.literal('no_discharge_window'),
    structured_adjustment: noDischargeWindowAdjustmentSchema,
  }),
  z.object({
    ...directiveBase,
    directive_type: z.literal('max_grid_window'),
    structured_adjustment: maxGridWindowAdjustmentSchema,
  }),
  z.object({
    ...directiveBase,
    directive_type: z.literal('no_op'),
    structured_adjustment: z.null(),
  }),
]);

export const BATTERY_ACTIONS = ['charge', 'discharge', 'idle'] as const;
export type BatteryAction = (typeof BATTERY_ACTIONS)[number];

export const hourlyPlanItemSchema = z.object({
  hour: hourIndex,
  grid_kwh: z.number().nonnegative(),
  solar_used_kwh: z.number().nonnegative(),
  battery_action: z.enum(BATTERY_ACTIONS),
  battery_kwh: z.number().nonnegative(),
  battery_energy_after_kwh: z.number().nonnegative(),
});

export const optimizeEnergyResponseSchema = z.object({
  scenario_id: z.string(),
  directive_interpretation: z.array(directiveInterpretationEntrySchema),
  hourly_plan: z.array(hourlyPlanItemSchema).length(HOURS_IN_DAY),
  total_grid_kwh: z.number().nonnegative(),
  total_cost_bdt: z.number(),
  peak_grid_kwh: z.number().nonnegative(),
  plan_summary: z.string(),
});

export type DirectiveInterpretationEntry = z.infer<typeof directiveInterpretationEntrySchema>;
export type StructuredAdjustment = DirectiveInterpretationEntry['structured_adjustment'];
export type HourlyPlanItem = z.infer<typeof hourlyPlanItemSchema>;
export type OptimizeEnergyResponse = z.infer<typeof optimizeEnergyResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Form schema                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The form schema is deliberately separate from the wire schema. Fields are
 * registered with `valueAsNumber`, so a blank box arrives as NaN and is
 * reported as "must be a number" rather than as a type error; the cross-field
 * battery invariants live here too, since the wire contract only constrains
 * fields individually.
 */

const numberField = (label: string) =>
  z.number({
    required_error: `${label} is required`,
    invalid_type_error: `${label} must be a number`,
  });

const nonNegative = (label: string) =>
  numberField(label)
    .finite(`${label} must be a number`)
    .min(0, `${label} cannot be negative`);

const positive = (label: string) =>
  numberField(label)
    .finite(`${label} must be a number`)
    .gt(0, `${label} must be greater than 0`);

export const hourFormSchema = z.object({
  hour: z.number().int().min(0).max(23),
  demand_kwh: nonNegative('Demand'),
  solar_kwh: nonNegative('Solar'),
  tariff_bdt_per_kwh: nonNegative('Tariff'),
});

export const batteryFormSchema = z
  .object({
    capacity_kwh: positive('Capacity'),
    initial_energy_kwh: nonNegative('Initial energy'),
    minimum_energy_kwh: nonNegative('Minimum reserve'),
    max_charge_kwh_per_hour: positive('Max charge rate'),
    max_discharge_kwh_per_hour: positive('Max discharge rate'),
  })
  .superRefine((battery, ctx) => {
    if (battery.initial_energy_kwh > battery.capacity_kwh) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['initial_energy_kwh'],
        message: 'Initial energy cannot exceed capacity',
      });
    }
    if (battery.minimum_energy_kwh > battery.capacity_kwh) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minimum_energy_kwh'],
        message: 'Minimum reserve cannot exceed capacity',
      });
    }
    if (battery.minimum_energy_kwh > battery.initial_energy_kwh) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minimum_energy_kwh'],
        message: 'Reserve is above the starting charge — the plan starts infeasible',
      });
    }
  });

export const scenarioFormSchema = z.object({
  scenario_id: z
    .string()
    .trim()
    .min(1, 'Scenario ID is required')
    .max(64, 'Scenario ID is too long'),
  hours: z.array(hourFormSchema).length(HOURS_IN_DAY, 'A scenario needs all 24 hours'),
  battery: batteryFormSchema,
  operator_notes: z
    .array(z.object({ value: z.string().trim() }))
    .min(1, 'Add at least one operator note')
    .max(MAX_OPERATOR_NOTES, `At most ${MAX_OPERATOR_NOTES} notes`)
    .refine((notes) => notes.some((note) => note.value.length > 0), {
      message: 'At least one note must have text',
    }),
});

export type ScenarioFormValues = z.infer<typeof scenarioFormSchema>;

/** Form state → wire payload. Blank notes are dropped rather than sent as "". */
export function toRequestPayload(values: ScenarioFormValues): OptimizeEnergyRequest {
  return optimizeEnergyRequestSchema.parse({
    scenario_id: values.scenario_id,
    operator_notes: values.operator_notes
      .map((note) => note.value.trim())
      .filter((note) => note.length > 0),
    hours: values.hours.map((hour) => ({
      hour: hour.hour,
      demand_kwh: hour.demand_kwh,
      solar_kwh: hour.solar_kwh,
      tariff_bdt_per_kwh: hour.tariff_bdt_per_kwh,
    })),
    battery: {
      capacity_kwh: values.battery.capacity_kwh,
      initial_energy_kwh: values.battery.initial_energy_kwh,
      minimum_energy_kwh: values.battery.minimum_energy_kwh,
      max_charge_kwh_per_hour: values.battery.max_charge_kwh_per_hour,
      max_discharge_kwh_per_hour: values.battery.max_discharge_kwh_per_hour,
    },
  });
}

/** Wire payload → form state, used by the JSON import tab and the presets. */
export function toFormValues(request: OptimizeEnergyRequest): ScenarioFormValues {
  return {
    scenario_id: request.scenario_id,
    hours: request.hours,
    battery: request.battery,
    operator_notes: request.operator_notes.map((value) => ({ value })),
  };
}

/**
 * Schema for the raw-JSON editor tab. Accepts a full request payload so an
 * operator can paste a captured request body straight in.
 */
export const jsonScenarioSchema = optimizeEnergyRequestSchema.extend({
  operator_notes: z.array(z.string()).max(MAX_OPERATOR_NOTES).default([]),
});
