/**
 * Single responsibility: Central orchestrator coordinating the sequential pipeline:
 * Interpretation (LLM) -> Guardrails (Validation) -> Optimizer (LP Solver).
 * Contains no direct math, prompt formatting, or validation rule logic.
 *
 * Returns the exact API contract response shape with top-level fields:
 * scenario_id, directive_interpretation, hourly_plan, total_grid_kwh, total_cost_bdt, peak_grid_kwh, plan_summary
 */

import { Injectable } from '@nestjs/common';
import { InterpretationService } from '../interpretation';
import { GuardrailsService } from '../guardrails';
import { OptimizerService } from '../optimizer';
import { OptimizeEnergyRequestDto, OptimizeEnergyResponseDto } from './dto';

@Injectable()
export class OptimizeEnergyOrchestrator {
  constructor(
    private readonly interpretationService: InterpretationService,
    private readonly guardrailsService: GuardrailsService,
    private readonly optimizerService: OptimizerService,
  ) {}

  /**
   * Executes the end-to-end optimization pipeline:
   * 1. Interprets operator notes into raw directives via LLM.
   * 2. Validates directives deterministically through guardrails.
   * 3. Runs the LP solver optimizer to produce the 24-hour schedule.
   */
  async execute(request: OptimizeEnergyRequestDto): Promise<OptimizeEnergyResponseDto> {
    // 1. Interpretation: Call LLM to interpret operator notes
    const rawDirectives = await this.interpretationService.interpretNotes(request.operator_notes);

    // 2. Guardrails: Deterministically validate each directive, falling back to no_op on failure
    const validatedDirectives = rawDirectives.map((raw) =>
      this.guardrailsService.validateDirective(raw, request.battery.capacity_kwh),
    );

    // 3. Optimizer: Solve dispatch schedule honoring validated directives
    const result = this.optimizerService.buildSchedule(
      {
        scenario_id: request.scenario_id,
        hours: request.hours,
        battery: request.battery,
      },
      validatedDirectives,
    );

    // Return the exact API contract response shape (flat top-level fields, NOT nested totals)
    return {
      scenario_id: request.scenario_id,
      directive_interpretation: validatedDirectives as any,
      hourly_plan: result.hourly_plan,
      total_grid_kwh: result.total_grid_kwh,
      total_cost_bdt: result.total_cost_bdt,
      peak_grid_kwh: result.peak_grid_kwh,
      plan_summary: result.plan_summary,
    };
  }
}
