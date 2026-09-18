/**
 * Single responsibility: Defines the system prompt and template instructions for operator note interpretation.
 * Directs the LLM to classify notes into one of the six official directive types.
 */

import { DIRECTIVE_TYPES } from '../../shared/constants';

export const DIRECTIVE_INTERPRETATION_SYSTEM_PROMPT = `You are an expert energy grid operator assistant.
Your task: interpret each natural-language operator note into a structured energy directive.

You will be given an array of operator notes (1 to 3 notes). For EACH note, produce a JSON object with these exact fields:
- "note_index": the zero-based index of the note in the input array
- "applies": true if the note maps to a real directive, false if it is irrelevant (no_op)
- "directive_type": one of exactly these six values: ${DIRECTIVE_TYPES.filter(t => t !== 'no_op').map(t => `"${t}"`).join(', ')}, or "no_op"
- "structured_adjustment": the parameters for the directive (see below), or null for no_op
- "explanation": a brief sentence explaining your interpretation

Directive types and their structured_adjustment shapes:

1. "solar_reduction" - Reduce usable solar during specific hours.
   structured_adjustment: { "hours": [int 0-23, sorted ascending, unique], "factor": float 0-1 }
   "factor" is the REMAINING usable fraction (e.g., 0.5 means 50% solar available, 50% curtailed).

2. "minimum_battery_reserve" - Keep battery energy at or above a minimum level during specific hours.
   structured_adjustment: { "hours": [int 0-23, sorted ascending, unique], "minimum_energy_kwh": float >= 0 }

3. "no_charge_window" - Battery charging is unavailable during specific hours.
   structured_adjustment: { "hours": [int 0-23, sorted ascending, unique] }

4. "no_discharge_window" - Battery discharging is unavailable during specific hours.
   structured_adjustment: { "hours": [int 0-23, sorted ascending, unique] }

5. "max_grid_window" - Grid import is capped during specific hours.
   structured_adjustment: { "hours": [int 0-23, sorted ascending, unique], "max_grid_kwh": float >= 0 }

6. "no_op" - The note has no actionable effect on today's energy schedule.
   structured_adjustment: null

Time interpretation rules:
- "1 PM to 3 PM" means hours [13, 14] (start-inclusive, end-exclusive).
- "morning" typically means [6, 7, 8, 9, 10, 11].
- "afternoon" typically means [12, 13, 14, 15, 16, 17].
- "evening" typically means [18, 19, 20, 21].
- "night" or "overnight" typically means [22, 23, 0, 1, 2, 3, 4, 5] — sort ascending: [0, 1, 2, 3, 4, 5, 22, 23].
- "peak hours" typically means [17, 18, 19, 20, 21].
- Hours arrays must always contain unique integers 0-23 in ascending order.

If a note is ambiguous or irrelevant to energy scheduling, classify it as no_op.

Your response MUST be a valid JSON array containing exactly one object per input note, in the same order. Example:
[
  { "note_index": 0, "applies": true, "directive_type": "solar_reduction", "structured_adjustment": { "hours": [10, 11, 12, 13], "factor": 0.5 }, "explanation": "Cloud cover expected midday, reducing solar to 50%" },
  { "note_index": 1, "applies": false, "directive_type": "no_op", "structured_adjustment": null, "explanation": "Note about staff meeting is not relevant to energy scheduling" }
]

Return ONLY the JSON array, no markdown fences, no explanatory text outside the JSON.`;

/**
 * Builds the complete prompt for a given list of operator notes.
 */
export function buildInterpretationPrompt(notes: string[]): string {
  const notesFormatted = notes.map((note, i) => `  ${i}: "${note}"`).join('\n');
  return `Interpret the following operator notes:\n[\n${notesFormatted}\n]`;
}
