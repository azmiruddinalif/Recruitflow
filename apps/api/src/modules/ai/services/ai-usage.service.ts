import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AIFeatureType, AIProviderType } from '@recruitflow/types';
import { PrismaService } from '../../../database/prisma.service';

export interface LogAIUsageInput {
  organizationId: string;
  userId?: string;
  provider: AIProviderType;
  model: string;
  feature: AIFeatureType;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class AIUsageService {
  constructor(private readonly prisma: PrismaService) {}

  async verifyQuotaAvailable(organizationId: string): Promise<{
    creditsUsed: number;
    creditsLimit: number;
  }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });

    if (!subscription || !subscription.plan) {
      return { creditsUsed: 0, creditsLimit: 50 };
    }

    const creditsLimit = subscription.plan.aiCreditsMonthly;
    const creditsUsed = subscription.aiCreditsUsed;

    if (creditsLimit > 0 && creditsUsed >= creditsLimit) {
      throw new ForbiddenException({
        message: `Monthly AI credit quota (${creditsLimit} credits) reached for your current subscription plan. Upgrade your plan to continue using AI features.`,
        errors: [
          {
            code: 'AI_QUOTA_EXCEEDED',
            message: `Monthly AI credit quota (${creditsLimit}) reached.`,
          },
        ],
      });
    }

    return { creditsUsed, creditsLimit };
  }

  async logUsage(input: LogAIUsageInput): Promise<void> {
    await this.prisma.aIUsageLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        provider: input.provider,
        model: input.model,
        feature: input.feature,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens: input.totalTokens,
        estimatedCostUsd: input.estimatedCostUsd,
        latencyMs: input.latencyMs,
        success: input.success,
        errorMessage: input.errorMessage ?? null,
      },
    });

    if (input.success) {
      await this.prisma.subscription
        .updateMany({
          where: { organizationId: input.organizationId },
          data: {
            aiCreditsUsed: { increment: 1 },
          },
        })
        .catch(() => undefined);
    }
  }

  async getOrganizationUsageSummary(organizationId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [logsCount, aggregates, subscription] = await Promise.all([
      this.prisma.aIUsageLog.count({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth },
          success: true,
        },
      }),
      this.prisma.aIUsageLog.aggregate({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth },
        },
        _sum: {
          totalTokens: true,
          estimatedCostUsd: true,
        },
        _avg: {
          latencyMs: true,
        },
      }),
      this.prisma.subscription.findUnique({
        where: { organizationId },
        include: { plan: true },
      }),
    ]);

    return {
      monthlyCalls: logsCount,
      totalTokensThisMonth: aggregates._sum.totalTokens ?? 0,
      estimatedCostUsdThisMonth: Number((aggregates._sum.estimatedCostUsd ?? 0).toFixed(4)),
      averageLatencyMs: Math.round(aggregates._avg.latencyMs ?? 0),
      creditsUsed: subscription?.aiCreditsUsed ?? logsCount,
      creditsLimit: subscription?.plan?.aiCreditsMonthly ?? 50,
    };
  }
}
