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
      temperature: options?.temperature ?? 0.0,
      response_format: options?.responseFormat === 'json_object'
        ? { type: 'json_object' }
        : undefined,
    };

    let response: Response | undefined;
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
        });

        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
          await new Promise(res => setTimeout(res, waitTime + Math.random() * 500));
          retries--;
          delay *= 2;
          continue;
        }

        break; // Success or non-429 error
      } catch (error) {
        if (retries === 1) {
          throw new LlmFailureError(
            `Network error calling Groq API: ${error instanceof Error ? error.message : String(error)}`,
            'groq',
            error,
          );
        }
        await new Promise(res => setTimeout(res, delay + Math.random() * 500));
        retries--;
        delay *= 2;
      }
    }

    if (!response || !response.ok) {
      let errorBody = '';
      try {
        errorBody = await response?.text() || 'Unknown error';
      } catch { /* ignore */ }
      throw new LlmFailureError(
        `Groq API returned HTTP ${response?.status}: ${errorBody}`,
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
