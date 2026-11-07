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
export class GeminiProvider implements AIProviderInterface {
  readonly providerType: AIProviderType = 'GEMINI';

  async generateStructured<T>(
    config: AIProviderConfig,
    options: StructuredGenerationOptions<T>,
  ): Promise<AIProviderResult<T>> {
    const startTime = Date.now();
    const rawResponse = await this.executeWithRetry(config, {
      systemInstruction: {
        parts: [
          {
            text: `${options.systemPrompt}\nAlways respond with valid JSON matching the requested schema.`,
          },
        ],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: options.userPrompt }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: options.temperature ?? 0.2,
      },
    });

    const cleaned = cleanJsonFence(rawResponse.content);
    const parsedJson = JSON.parse(cleaned);
    const validatedData = options.schema.parse(parsedJson);
    const latencyMs = Date.now() - startTime;

    return {
      data: validatedData,
      provider: 'GEMINI',
      model: config.model,
      promptTokens: rawResponse.promptTokens,
      completionTokens: rawResponse.completionTokens,
      totalTokens: rawResponse.totalTokens,
      latencyMs,
      estimatedCostUsd: Number(((rawResponse.totalTokens / 1000) * 0.001).toFixed(6)),
    };
  }

  async generateText(
    config: AIProviderConfig,
    options: TextGenerationOptions,
  ): Promise<AIProviderResult<string>> {
    const startTime = Date.now();
    const rawResponse = await this.executeWithRetry(config, {
      systemInstruction: {
        parts: [{ text: options.systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: options.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.4,
      },
    });

    const latencyMs = Date.now() - startTime;

    return {
      data: rawResponse.content.trim(),
      provider: 'GEMINI',
      model: config.model,
      promptTokens: rawResponse.promptTokens,
      completionTokens: rawResponse.completionTokens,
      totalTokens: rawResponse.totalTokens,
      latencyMs,
      estimatedCostUsd: Number(((rawResponse.totalTokens / 1000) * 0.001).toFixed(6)),
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

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      config.model,
    )}:generateContent?key=${encodeURIComponent(config.apiKey)}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
        }

        const json = (await response.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
          usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
            totalTokenCount?: number;
          };
        };

        const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
          throw new Error('Gemini returned an empty generation response');
        }

        const promptTokens = json.usageMetadata?.promptTokenCount ?? 0;
        const completionTokens = json.usageMetadata?.candidatesTokenCount ?? 0;
        const totalTokens = json.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;

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

    throw lastError ?? new Error('Gemini request failed after retries');
  }
}
