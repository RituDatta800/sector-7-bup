/**
 * Single responsibility: Executes deterministic validation of LLM outputs against schemas and rules.
 * Falls back to a safe no_op directive if validation fails.
 */

import { Injectable } from '@nestjs/common';
import { DirectiveInterpretationEntry } from '../shared/types';
import { DIRECTIVE_TYPE, DIRECTIVE_TYPES } from '../shared/constants';
import { validateHoursRule } from './rules/hours-rule';
import { validateSolarFactorRule } from './rules/solar-factor-rule';
import { validateReserveRule } from './rules/reserve-rule';
import { validateGridCapRule } from './rules/grid-cap-rule';

@Injectable()
export class GuardrailsService {
  /**
   * Deterministically validates a raw LLM directive interpretation entry.
   * On any validation failure, falls back safely to no_op.
   */
  validateDirective(raw: DirectiveInterpretationEntry, batteryCapacity?: number): DirectiveInterpretationEntry {
    // Check directive_type is one of the six known types
    if (!raw.directive_type || !DIRECTIVE_TYPES.includes(raw.directive_type as typeof DIRECTIVE_TYPES[number])) {
      return this.makeNoOp(raw.note_index, `Unknown directive_type: ${raw.directive_type}. Falling back to no_op.`);
    }

    // no_op requires null structured_adjustment — nothing else to validate
    if (raw.directive_type === DIRECTIVE_TYPE.NO_OP) {
      return {
        note_index: raw.note_index,
        applies: false,
        directive_type: DIRECTIVE_TYPE.NO_OP,
        structured_adjustment: null,
        explanation: raw.explanation || 'No actionable directive.',
      };
    }

    const adj = raw.structured_adjustment;
    if (!adj || typeof adj !== 'object') {
      return this.makeNoOp(raw.note_index, `Missing or invalid structured_adjustment for ${raw.directive_type}. Falling back to no_op.`);
    }

    // Validate hours (required for all non-no_op directives)
    const hoursResult = validateHoursRule((adj as unknown as Record<string, unknown>).hours);
    if (!hoursResult.isValid) {
      return this.makeNoOp(raw.note_index, `Invalid hours: ${hoursResult.error}. Falling back to no_op.`);
    }

    // Type-specific validation
    switch (raw.directive_type) {
      case DIRECTIVE_TYPE.SOLAR_REDUCTION: {
        const factorResult = validateSolarFactorRule((adj as unknown as Record<string, unknown>).factor);
        if (!factorResult.isValid) {
          return this.makeNoOp(raw.note_index, `Invalid solar factor: ${factorResult.error}. Falling back to no_op.`);
        }
        return {
          note_index: raw.note_index,
          applies: true,
          directive_type: DIRECTIVE_TYPE.SOLAR_REDUCTION,
          structured_adjustment: {
            hours: (adj as { hours: number[] }).hours,
            factor: (adj as { factor: number }).factor,
          },
          explanation: raw.explanation || '',
        };
      }

      case DIRECTIVE_TYPE.MINIMUM_BATTERY_RESERVE: {
        const reserveResult = validateReserveRule(
          (adj as unknown as Record<string, unknown>).minimum_energy_kwh,
          batteryCapacity,
        );
        if (!reserveResult.isValid) {
          return this.makeNoOp(raw.note_index, `Invalid reserve: ${reserveResult.error}. Falling back to no_op.`);
        }
        return {
          note_index: raw.note_index,
          applies: true,
          directive_type: DIRECTIVE_TYPE.MINIMUM_BATTERY_RESERVE,
          structured_adjustment: {
            hours: (adj as { hours: number[] }).hours,
            minimum_energy_kwh: (adj as { minimum_energy_kwh: number }).minimum_energy_kwh,
          },
          explanation: raw.explanation || '',
        };
      }

      case DIRECTIVE_TYPE.NO_CHARGE_WINDOW: {
        return {
          note_index: raw.note_index,
          applies: true,
          directive_type: DIRECTIVE_TYPE.NO_CHARGE_WINDOW,
          structured_adjustment: {
            hours: (adj as { hours: number[] }).hours,
          },
          explanation: raw.explanation || '',
        };
      }

      case DIRECTIVE_TYPE.NO_DISCHARGE_WINDOW: {
        return {
          note_index: raw.note_index,
          applies: true,
          directive_type: DIRECTIVE_TYPE.NO_DISCHARGE_WINDOW,
          structured_adjustment: {
            hours: (adj as { hours: number[] }).hours,
          },
          explanation: raw.explanation || '',
        };
      }

      case DIRECTIVE_TYPE.MAX_GRID_WINDOW: {
        const gridCapResult = validateGridCapRule((adj as unknown as Record<string, unknown>).max_grid_kwh);
        if (!gridCapResult.isValid) {
          return this.makeNoOp(raw.note_index, `Invalid grid cap: ${gridCapResult.error}. Falling back to no_op.`);
        }
        return {
          note_index: raw.note_index,
          applies: true,
          directive_type: DIRECTIVE_TYPE.MAX_GRID_WINDOW,
          structured_adjustment: {
            hours: (adj as { hours: number[] }).hours,
            max_grid_kwh: (adj as { max_grid_kwh: number }).max_grid_kwh,
          },
          explanation: raw.explanation || '',
        };
      }

      default:
        return this.makeNoOp(raw.note_index, `Unhandled directive_type: ${raw.directive_type}. Falling back to no_op.`);
    }
  }

  private makeNoOp(noteIndex: number, explanation: string): DirectiveInterpretationEntry {
    return {
      note_index: noteIndex,
      applies: false,
      directive_type: DIRECTIVE_TYPE.NO_OP,
      structured_adjustment: null,
      explanation,
    };
  }
}
