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
export class AnthropicProvider implements AIProviderInterface {
  readonly providerType: AIProviderType = 'ANTHROPIC';

  async generateStructured<T>(
    config: AIProviderConfig,
    options: StructuredGenerationOptions<T>,
  ): Promise<AIProviderResult<T>> {
    const startTime = Date.now();
    const rawResponse = await this.executeWithRetry(config, {
      model: config.model,
      max_tokens: 4096,
      system: `${options.systemPrompt}\nReturn ONLY valid JSON matching the requested schema without markdown code fences or extra commentary.`,
      messages: [{ role: 'user', content: options.userPrompt }],
      temperature: options.temperature ?? 0.2,
    });

    const cleaned = cleanJsonFence(rawResponse.content);
    const parsedJson = JSON.parse(cleaned);
    const validatedData = options.schema.parse(parsedJson);
    const latencyMs = Date.now() - startTime;

    return {
      data: validatedData,
      provider: 'ANTHROPIC',
      model: config.model,
      promptTokens: rawResponse.promptTokens,
      completionTokens: rawResponse.completionTokens,
      totalTokens: rawResponse.totalTokens,
      latencyMs,
      estimatedCostUsd: Number(((rawResponse.totalTokens / 1000) * 0.003).toFixed(6)),
    };
  }

  async generateText(
    config: AIProviderConfig,
    options: TextGenerationOptions,
  ): Promise<AIProviderResult<string>> {
    const startTime = Date.now();
    const rawResponse = await this.executeWithRetry(config, {
      model: config.model,
      max_tokens: 4096,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userPrompt }],
      temperature: options.temperature ?? 0.4,
    });

    const latencyMs = Date.now() - startTime;

    return {
      data: rawResponse.content.trim(),
      provider: 'ANTHROPIC',
      model: config.model,
      promptTokens: rawResponse.promptTokens,
      completionTokens: rawResponse.completionTokens,
      totalTokens: rawResponse.totalTokens,
      latencyMs,
      estimatedCostUsd: Number(((rawResponse.totalTokens / 1000) * 0.003).toFixed(6)),
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
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
        }

        const json = (await response.json()) as {
          content?: Array<{ type?: string; text?: string }>;
          usage?: {
            input_tokens?: number;
            output_tokens?: number;
          };
        };

        const content = json.content?.find((c) => c.type === 'text' || c.text)?.text;
        if (!content) {
          throw new Error('Anthropic returned an empty message response');
        }

        const promptTokens = json.usage?.input_tokens ?? 0;
        const completionTokens = json.usage?.output_tokens ?? 0;
        const totalTokens = promptTokens + completionTokens;

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

    throw lastError ?? new Error('Anthropic request failed after retries');
  }
}
