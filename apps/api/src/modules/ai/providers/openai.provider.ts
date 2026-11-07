import { Injectable } from '@nestjs/common';
import type { AIProviderType } from '@recruitflow/types';
import {
  AIProviderConfig,
  AIProviderInterface,
  AIProviderResult,
  cleanJsonFence,
  StructuredGenerationOptions,
  TextGenerationOptions,
} from './ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProviderInterface {
  readonly providerType: AIProviderType = 'OPENAI';

  async generateStructured<T>(
    config: AIProviderConfig,
    options: StructuredGenerationOptions<T>,
  ): Promise<AIProviderResult<T>> {
    const startTime = Date.now();
    const rawResponse = await this.executeWithRetry(config, {
      model: config.model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `${options.systemPrompt}\nAlways respond with valid JSON matching the requested schema.`,
        },
        { role: 'user', content: options.userPrompt },
      ],
      temperature: options.temperature ?? 0.2,
    });

    const cleaned = cleanJsonFence(rawResponse.content);
    const parsedJson = JSON.parse(cleaned);
    const validatedData = options.schema.parse(parsedJson);
    const latencyMs = Date.now() - startTime;

    return {
      data: validatedData,
      provider: 'OPENAI',
      model: config.model,
      promptTokens: rawResponse.promptTokens,
      completionTokens: rawResponse.completionTokens,
      totalTokens: rawResponse.totalTokens,
      latencyMs,
      estimatedCostUsd: Number(((rawResponse.totalTokens / 1000) * 0.0015).toFixed(6)),
    };
  }

  async generateText(
    config: AIProviderConfig,
    options: TextGenerationOptions,
  ): Promise<AIProviderResult<string>> {
    const startTime = Date.now();
    const rawResponse = await this.executeWithRetry(config, {
      model: config.model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      temperature: options.temperature ?? 0.4,
    });

    const latencyMs = Date.now() - startTime;

    return {
      data: rawResponse.content.trim(),
      provider: 'OPENAI',
      model: config.model,
      promptTokens: rawResponse.promptTokens,
      completionTokens: rawResponse.completionTokens,
      totalTokens: rawResponse.totalTokens,
      latencyMs,
      estimatedCostUsd: Number(((rawResponse.totalTokens / 1000) * 0.0015).toFixed(6)),
    };
  }

  private async executeWithRetry(
    config: AIProviderConfig,
    payload: Record<string, unknown>,
  ): Promise<{
    content: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }> {
    const maxRetries = config.maxRetries ?? 2;
    const timeoutMs = config.timeoutMs ?? 30000;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
        }

        const json = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            total_tokens?: number;
          };
        };

        const content = json.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('OpenAI returned an empty completion response');
        }

        const promptTokens = json.usage?.prompt_tokens ?? 0;
        const completionTokens = json.usage?.completion_tokens ?? 0;
        const totalTokens = json.usage?.total_tokens ?? promptTokens + completionTokens;

        return { content, promptTokens, completionTokens, totalTokens };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new Error('OpenAI request failed after retries');
  }
}
