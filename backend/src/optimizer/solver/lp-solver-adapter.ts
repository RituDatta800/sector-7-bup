/**
 * Single responsibility: Adapts the external javascript-lp-solver library behind a decoupled, typed interface.
 */

import { Injectable } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const solver = require('javascript-lp-solver');

export interface LpModel {
  optimize: string;
  opType: 'min' | 'max';
  constraints: Record<string, { min?: number; max?: number; equal?: number }>;
  variables: Record<string, Record<string, number>>;
  ints?: Record<string, number>;
}

export interface LpSolution {
  feasible: boolean;
  result: number;
  bounded: boolean;
  [key: string]: number | boolean;
}

@Injectable()
export class LpSolverAdapter {
  /**
   * Solves a given linear programming model and returns a typed solution.
   */
  solve(model: LpModel): LpSolution {
    const result = solver.Solve(model);
    return result as LpSolution;
  }
}
