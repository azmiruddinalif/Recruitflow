import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getCurrentSubscription(organizationId: string) {
    const [subscription, jobsCount, candidatesCount, membersCount, payments] = await Promise.all([
      this.prisma.subscription.findUnique({
        where: { organizationId },
        include: { plan: true },
      }),
      this.prisma.job.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.candidate.count({ where: { organizationId, deletedAt: null } }),
      this.prisma.organizationMember.count({ where: { organizationId, isActive: true } }),
      this.prisma.payment.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());

    return {
      subscription,
      stripeConfigured,
      mode: stripeConfigured ? 'STRIPE_SAAS' : 'SELF_HOSTED',
      usage: {
        jobsUsed: jobsCount,
        jobsLimit: subscription?.plan.maxJobs ?? 50,
        candidatesUsed: candidatesCount,
        candidatesLimit: subscription?.plan.maxCandidates ?? 2500,
        membersUsed: membersCount,
        membersLimit: subscription?.plan.maxMembers ?? 25,
        aiCreditsUsed: subscription?.aiCreditsUsed ?? 0,
        aiCreditsLimit: subscription?.plan.aiCreditsMonthly ?? 500,
      },
      payments,
    };
  }

  async changePlan(params: {
    organizationId: string;
    userId: string;
    planCode: string;
    billingInterval?: 'MONTHLY' | 'YEARLY';
  }) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { code: params.planCode },
    });
    if (!plan) {
      throw new NotFoundException(`Subscription plan ${params.planCode} not found.`);
    }

    const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
    if (stripeSecret && plan.priceMonthlyCents > 0) {
      return {
        requiresCheckout: true,
        stripeConfigured: true,
        message: 'Stripe Checkout session required for paid tier upgrade.',
        planCode: plan.code,
      };
    }

    const updated = await this.prisma.subscription.upsert({
      where: { organizationId: params.organizationId },
      update: {
        planId: plan.id,
        status: 'SELF_HOSTED',
        billingInterval: params.billingInterval ?? 'MONTHLY',
      },
      create: {
        organizationId: params.organizationId,
        planId: plan.id,
        status: 'SELF_HOSTED',
        billingInterval: params.billingInterval ?? 'MONTHLY',
      },
      include: { plan: true },
    });

    await this.prisma.activityLog.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.userId,
        entityType: 'SUBSCRIPTION',
        entityId: updated.id,
        action: 'PLAN_UPDATED',
        description: `Updated organization plan to ${plan.name} (Self-Hosted Mode)`,
      },
    });

    return {
      requiresCheckout: false,
      stripeConfigured: false,
      subscription: updated,
    };
  }

  async handleStripeWebhook(signature: string | undefined, payload: Record<string, unknown>) {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new BadRequestException('Stripe webhook secret is not configured.');
    }
    if (!signature) {
      throw new BadRequestException('Missing Stripe-Signature header.');
    }
    return { received: true, eventType: payload.type ?? 'unknown' };
  }
}
