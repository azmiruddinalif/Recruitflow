import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be set to enable
   * Stripe SaaS mode. RecruitFlow ships self-hosted by default (neither set),
   * so the webhook endpoint is disabled unless an operator explicitly opts in.
   */
  private get stripeSaasModeEnabled(): boolean {
    return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());
  }

  private getStripeClient(): Stripe {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secretKey) {
      throw new BadRequestException('Stripe is not configured.');
    }
    return new Stripe(secretKey);
  }

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

  /**
   * Verifies and records a Stripe webhook delivery. Disabled entirely
   * (404) unless an operator has explicitly configured Stripe SaaS mode.
   * Verified events are recorded for idempotency but do not yet mutate
   * Subscription state — that lands alongside real Checkout session
   * creation in a future phase, so no half-built billing logic ships here.
   */
  async handleStripeWebhook(signature: string | undefined, rawBody: Buffer | undefined) {
    if (!this.stripeSaasModeEnabled) {
      throw new NotFoundException('Not found.');
    }
    if (!signature) {
      throw new BadRequestException('Missing Stripe-Signature header.');
    }
    if (!rawBody || rawBody.length === 0) {
      throw new BadRequestException('Missing request body.');
    }

    const stripe = this.getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!.trim();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this.logger.warn(`Rejected Stripe webhook with invalid signature: ${(error as Error).message}`);
      throw new BadRequestException('Invalid Stripe webhook signature.');
    }

    try {
      await this.prisma.stripeWebhookEvent.create({
        data: { stripeEventId: event.id, type: event.type },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        this.logger.log(`Ignoring duplicate Stripe webhook delivery for event ${event.id}`);
        return { received: true, duplicate: true };
      }
      throw error;
    }

    this.logger.log(`Verified Stripe webhook event ${event.id} (${event.type}) — recorded, no handler wired yet.`);
    return { received: true, eventType: event.type };
  }
}
