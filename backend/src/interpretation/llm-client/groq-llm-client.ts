/**
 * Single responsibility: Concrete Groq provider implementation of LlmClient interface.
 * Calls Groq's chat completion API with JSON output mode.
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { LlmClient, LlmCompletionOptions } from './llm-client.interface';
import { LlmFailureError } from '../../shared/errors';

@Injectable()
export class GroqLlmClient implements LlmClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://api.groq.com/openai/v1/chat/completions';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.llmApiKey;
    this.model = this.configService.llmModel;
  }

  /**
   * Executes prompt completion against the Groq API endpoint.
   */
  async completePrompt(systemPrompt: string, userPrompt: string, options?: LlmCompletionOptions): Promise<string> {
    const body = {
      model: options?.model ?? this.model,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ],
      temperature: options?.temperature ?? 0.1,
      response_format: options?.responseFormat === 'json_object'
        ? { type: 'json_object' }
        : undefined,
    };

    let response: Response;
    try {
      response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new LlmFailureError(
        `Network error calling Groq API: ${error instanceof Error ? error.message : String(error)}`,
        'groq',
        error,
      );
    }

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch { /* ignore */ }
      throw new LlmFailureError(
        `Groq API returned HTTP ${response.status}: ${errorBody}`,
        'groq',
      );
    }

    let data: { choices?: Array<{ message?: { content?: string } }> };
    try {
      data = await response.json() as typeof data;
    } catch (error) {
      throw new LlmFailureError(
        'Failed to parse Groq API response as JSON',
        'groq',
        error,
      );
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new LlmFailureError(
        'Groq API returned empty or missing content in response',
        'groq',
      );
    }

    return content.trim();
  }
}
