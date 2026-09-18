/**
 * Single responsibility: Orchestrates LLM prompt execution to interpret operator notes into
 * raw directive interpretation entries. No validation logic here — validation is in Layer 3 Guardrails.
 */

import { Injectable, Inject } from '@nestjs/common';
import { LLM_CLIENT, LlmClient } from './llm-client';
import { DIRECTIVE_INTERPRETATION_SYSTEM_PROMPT, buildInterpretationPrompt } from './prompts';
import { DirectiveInterpretationEntry } from '../shared/types';
import { LlmFailureError } from '../shared/errors';
import { DIRECTIVE_TYPE } from '../shared/constants';

@Injectable()
export class InterpretationService {
  constructor(
    @Inject(LLM_CLIENT)
    private readonly llmClient: LlmClient,
  ) {}

  /**
   * Translates an array of operator notes into raw directive interpretation entries using the LLM.
   */
  async interpretNotes(notes: string[]): Promise<DirectiveInterpretationEntry[]> {
    const userPrompt = buildInterpretationPrompt(notes);

    let rawContent: string;
    try {
      rawContent = await this.llmClient.completePrompt(
        DIRECTIVE_INTERPRETATION_SYSTEM_PROMPT,
        userPrompt,
        { temperature: 0.1, responseFormat: 'json_object' },
      );
    } catch (error) {
      // On LLM failure, return all no_op entries so the pipeline can still produce a schedule
      return notes.map((note, i) => ({
        note_index: i,
        applies: false,
        directive_type: DIRECTIVE_TYPE.NO_OP,
        structured_adjustment: null,
        explanation: `LLM call failed: ${error instanceof Error ? error.message : 'unknown error'}. Defaulting to no_op.`,
      }));
    }

    // Try to parse the JSON response
    let parsed: unknown;
    try {
      // Strip markdown code fences if present
      let cleaned = rawContent.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch {
      // If JSON parsing fails, return all no_op
      return notes.map((note, i) => ({
        note_index: i,
        applies: false,
        directive_type: DIRECTIVE_TYPE.NO_OP,
        structured_adjustment: null,
        explanation: `Failed to parse LLM response as JSON. Defaulting to no_op.`,
      }));
    }

    // Ensure it's an array with the right length
    if (!Array.isArray(parsed)) {
      // Sometimes the LLM wraps in an object like { "directives": [...] }
      const obj = parsed as Record<string, unknown>;
      const arrKey = Object.keys(obj).find(k => Array.isArray(obj[k]));
      if (arrKey) {
        parsed = obj[arrKey];
      } else {
        return notes.map((note, i) => ({
          note_index: i,
          applies: false,
          directive_type: DIRECTIVE_TYPE.NO_OP,
          structured_adjustment: null,
          explanation: 'LLM response was not an array. Defaulting to no_op.',
        }));
      }
    }

    const results = parsed as Record<string, unknown>[];

    // Ensure we have one entry per note, padding with no_op if needed
    return notes.map((note, i) => {
      const entry = results[i];
      if (!entry || typeof entry !== 'object') {
        return {
          note_index: i,
          applies: false,
          directive_type: DIRECTIVE_TYPE.NO_OP,
          structured_adjustment: null,
          explanation: 'No LLM interpretation for this note. Defaulting to no_op.',
        };
      }
      return {
        note_index: i,
        applies: entry.applies === true || (entry.directive_type !== 'no_op' && entry.applies !== false),
        directive_type: (entry.directive_type as string) || 'no_op',
        structured_adjustment: (entry.structured_adjustment as object | null) ?? null,
        explanation: (entry.explanation as string) || '',
      } as DirectiveInterpretationEntry;
    });
  }
}
