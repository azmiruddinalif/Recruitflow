import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { AIFeatureType, AIProviderType } from '@recruitflow/types';
import { PrismaService } from '../../database/prisma.service';
import {
  AIProviderConfig,
  AIProviderInterface,
  AIProviderResult,
  StructuredGenerationOptions,
  TextGenerationOptions,
} from './providers/ai-provider.interface';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { AIUsageService } from './services/ai-usage.service';

export interface ExecuteAICallContext {
  organizationId: string;
  userId?: string;
  feature: AIFeatureType;
  preferredProvider?: AIProviderType;
}

@Injectable()
export class AIFactory {
  private readonly providers: Record<AIProviderType, AIProviderInterface>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiUsageService: AIUsageService,
    private readonly openAIProvider: OpenAIProvider,
    private readonly geminiProvider: GeminiProvider,
    private readonly anthropicProvider: AnthropicProvider,
  ) {
    this.providers = {
      OPENAI: this.openAIProvider,
      GEMINI: this.geminiProvider,
      ANTHROPIC: this.anthropicProvider,
    };
  }

  async getProviderStatus(organizationId: string): Promise<{
    isConfigured: boolean;
    activeProvider: AIProviderType | null;
    activeModel: string | null;
    availableProviders: Array<{
      provider: AIProviderType;
      displayName: string;
      model: string;
      isConfigured: boolean;
      source: 'organization' | 'global' | 'env' | 'none';
    }>;
  }> {
    const dbProviders = await this.prisma.aIProvider.findMany({
      where: {
        OR: [{ organizationId }, { organizationId: null }],
      },
      orderBy: [{ organizationId: 'desc' }, { isDefault: 'desc' }],
    });

    const checkProvider = (
      type: AIProviderType,
      displayName: string,
      envKey: string | undefined,
      defaultModel: string,
    ) => {
      const orgRecord = dbProviders.find(
        (p) => p.organizationId === organizationId && p.provider === type && p.isEnabled && p.apiKeyEncrypted,
      );
      if (orgRecord && orgRecord.apiKeyEncrypted) {
        return {
          provider: type,
          displayName,
          model: orgRecord.defaultModel || defaultModel,
          isConfigured: true,
          source: 'organization' as const,
        };
      }

      const globalRecord = dbProviders.find(
        (p) => p.organizationId === null && p.provider === type && p.isEnabled && p.apiKeyEncrypted,
      );
      if (globalRecord && globalRecord.apiKeyEncrypted) {
        return {
          provider: type,
          displayName,
          model: globalRecord.defaultModel || defaultModel,
          isConfigured: true,
          source: 'global' as const,
        };
      }

      if (envKey && envKey.trim().length > 0) {
        return {
          provider: type,
          displayName,
          model: defaultModel,
          isConfigured: true,
          source: 'env' as const,
        };
      }

      return {
        provider: type,
        displayName,
        model: defaultModel,
        isConfigured: false,
        source: 'none' as const,
      };
    };

    const availableProviders = [
      checkProvider(
        'OPENAI',
        'OpenAI (GPT-4o)',
        process.env.OPENAI_API_KEY,
        process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
      ),
      checkProvider(
        'GEMINI',
        'Google Gemini',
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash',
      ),
      checkProvider(
        'ANTHROPIC',
        'Anthropic Claude',
        process.env.ANTHROPIC_API_KEY,
        process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-latest',
      ),
    ];

    const firstConfigured = availableProviders.find((p) => p.isConfigured) ?? null;

    return {
      isConfigured: Boolean(firstConfigured),
      activeProvider: firstConfigured?.provider ?? null,
      activeModel: firstConfigured?.model ?? null,
      availableProviders,
    };
  }

  async resolveProviderConfig(
    organizationId: string,
    preferredProvider?: AIProviderType,
  ): Promise<AIProviderConfig> {
    const orgSettings = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
    });

    const targetProvider =
      preferredProvider ??
      orgSettings?.defaultAIProvider ??
      (process.env.DEFAULT_AI_PROVIDER as AIProviderType | undefined);

    const dbProviders = await this.prisma.aIProvider.findMany({
      where: {
        OR: [{ organizationId }, { organizationId: null }],
        isEnabled: true,
      },
      orderBy: [{ organizationId: 'desc' }, { isDefault: 'desc' }],
    });

    if (targetProvider) {
      const matchedDb = dbProviders.find(
        (p) => p.provider === targetProvider && p.apiKeyEncrypted && p.apiKeyEncrypted.trim().length > 0,
      );
      if (matchedDb && matchedDb.apiKeyEncrypted) {
        return {
          provider: matchedDb.provider,
          apiKey: matchedDb.apiKeyEncrypted,
          model: matchedDb.defaultModel,
          timeoutMs: matchedDb.timeoutMs,
          maxRetries: matchedDb.maxRetries,
        };
      }

      const envConfig = this.resolveFromEnv(targetProvider);
      if (envConfig) {
        return envConfig;
      }
    }

    const anyEnabledDb = dbProviders.find(
      (p) => p.apiKeyEncrypted && p.apiKeyEncrypted.trim().length > 0,
    );
    if (anyEnabledDb && anyEnabledDb.apiKeyEncrypted) {
      return {
        provider: anyEnabledDb.provider,
        apiKey: anyEnabledDb.apiKeyEncrypted,
        model: anyEnabledDb.defaultModel,
        timeoutMs: anyEnabledDb.timeoutMs,
        maxRetries: anyEnabledDb.maxRetries,
      };
    }

    for (const candidate of ['OPENAI', 'GEMINI', 'ANTHROPIC'] as AIProviderType[]) {
      const envConfig = this.resolveFromEnv(candidate);
      if (envConfig) {
        return envConfig;
      }
    }

    throw new ServiceUnavailableException({
      message:
        'No AI provider is configured. Configure an OpenAI, Google Gemini, or Anthropic API key in Super Admin AI Settings or environment variables.',
      errors: [
        {
          code: 'AI_PROVIDER_NOT_CONFIGURED',
          message:
            'No active AI provider API key is configured for this organization or platform.',
        },
      ],
    });
  }

  async generateStructured<T>(
    context: ExecuteAICallContext,
    options: StructuredGenerationOptions<T>,
  ): Promise<AIProviderResult<T>> {
    await this.aiUsageService.verifyQuotaAvailable(context.organizationId);
    const config = await this.resolveProviderConfig(
      context.organizationId,
      context.preferredProvider,
    );
    const providerImpl = this.providers[config.provider];
    const startTime = Date.now();

    try {
      const result = await providerImpl.generateStructured(config, options);
      await this.aiUsageService.logUsage({
        organizationId: context.organizationId,
        userId: context.userId,
        provider: result.provider,
        model: result.model,
        feature: context.feature,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        estimatedCostUsd: result.estimatedCostUsd,
        latencyMs: result.latencyMs,
        success: true,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.aiUsageService.logUsage({
        organizationId: context.organizationId,
        userId: context.userId,
        provider: config.provider,
        model: config.model,
        feature: context.feature,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: Date.now() - startTime,
        success: false,
        errorMessage,
      });
      throw error;
    }
  }

  async generateText(
    context: ExecuteAICallContext,
    options: TextGenerationOptions,
  ): Promise<AIProviderResult<string>> {
    await this.aiUsageService.verifyQuotaAvailable(context.organizationId);
    const config = await this.resolveProviderConfig(
      context.organizationId,
      context.preferredProvider,
    );
    const providerImpl = this.providers[config.provider];
    const startTime = Date.now();

    try {
      const result = await providerImpl.generateText(config, options);
      await this.aiUsageService.logUsage({
        organizationId: context.organizationId,
        userId: context.userId,
        provider: result.provider,
        model: result.model,
        feature: context.feature,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        estimatedCostUsd: result.estimatedCostUsd,
        latencyMs: result.latencyMs,
        success: true,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.aiUsageService.logUsage({
        organizationId: context.organizationId,
        userId: context.userId,
        provider: config.provider,
        model: config.model,
        feature: context.feature,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        latencyMs: Date.now() - startTime,
        success: false,
        errorMessage,
      });
      throw error;
    }
  }

  private resolveFromEnv(provider: AIProviderType): AIProviderConfig | null {
    if (provider === 'OPENAI' && process.env.OPENAI_API_KEY?.trim()) {
      return {
        provider: 'OPENAI',
        apiKey: process.env.OPENAI_API_KEY.trim(),
        model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
        timeoutMs: 30000,
        maxRetries: 2,
      };
    }

    if (provider === 'GEMINI' && process.env.GEMINI_API_KEY?.trim()) {
      return {
        provider: 'GEMINI',
        apiKey: process.env.GEMINI_API_KEY.trim(),
        model: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash',
        timeoutMs: 30000,
        maxRetries: 2,
      };
    }

    if (provider === 'ANTHROPIC' && process.env.ANTHROPIC_API_KEY?.trim()) {
      return {
        provider: 'ANTHROPIC',
        apiKey: process.env.ANTHROPIC_API_KEY.trim(),
        model: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-latest',
        timeoutMs: 30000,
        maxRetries: 2,
      };
    }

    return null;
  }
}
