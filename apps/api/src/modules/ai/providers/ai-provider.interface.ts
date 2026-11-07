import type { AIProviderType } from '@recruitflow/types';
import type { ZodType, ZodTypeDef } from 'zod';

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface StructuredGenerationOptions<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T, ZodTypeDef, unknown>;
  temperature?: number;
}

export interface TextGenerationOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

export interface AIProviderResult<T> {
  data: T;
  provider: AIProviderType;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
}

export interface AIProviderInterface {
  readonly providerType: AIProviderType;
  generateStructured<T>(
    config: AIProviderConfig,
    options: StructuredGenerationOptions<T>,
  ): Promise<AIProviderResult<T>>;
  generateText(
    config: AIProviderConfig,
    options: TextGenerationOptions,
  ): Promise<AIProviderResult<string>>;
}

export function cleanJsonFence(rawText: string): string {
  const trimmed = rawText.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }
  return trimmed;
}
