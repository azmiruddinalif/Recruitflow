import type { RawBodyRequest } from '@nestjs/common';
import { Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthenticatedOrganizationContext, AuthenticatedUser } from '@recruitflow/types';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthGuard } from '../auth/auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions & Billing')
@Controller('subscriptions')
@UseGuards(AuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @Public()
  @ApiOperation({ summary: 'List public subscription plans' })
  async listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @Get('current')
  @UseGuards(OrganizationGuard, PermissionsGuard)
  @RequirePermissions('billing.read')
  @ApiOperation({ summary: 'Get active organization subscription, quotas, and payment history' })
  async getCurrent(@CurrentOrg() org: AuthenticatedOrganizationContext) {
    return this.subscriptionsService.getCurrentSubscription(org.organizationId);
  }

  @Post('change-plan')
  @UseGuards(OrganizationGuard, PermissionsGuard)
  @RequirePermissions('billing.manage')
  @ApiOperation({ summary: 'Upgrade or change organization subscription plan' })
  async changePlan(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { planCode: string; billingInterval?: 'MONTHLY' | 'YEARLY' },
  ) {
    return this.subscriptionsService.changePlan({
      organizationId: org.organizationId,
      userId: user.id,
      ...body,
    });
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Stripe webhook endpoint (disabled unless Stripe SaaS mode is configured)' })
  async webhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    return this.subscriptionsService.handleStripeWebhook(signature, req.rawBody);
  }
}
