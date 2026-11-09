import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AIProviderType, AuthenticatedUser } from '@recruitflow/types';
import { updateSubscriptionPlanSchema } from '@recruitflow/validation';
import type { z } from 'zod';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthGuard } from '../auth/auth.guard';
import { SettingsService } from './settings.service';

@ApiTags('Super Admin Console')
@Controller('admin')
@UseGuards(AuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get platform-wide Super Admin overview, organizations, users, AI, and audit logs' })
  async getOverview() {
    return this.settingsService.getSuperAdminOverview();
  }

  @Put('ai-providers')
  @ApiOperation({ summary: 'Configure global AI provider settings' })
  async configureAIProvider(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      provider: AIProviderType;
      displayName: string;
      apiKey?: string;
      defaultModel: string;
      isEnabled: boolean;
      isDefault?: boolean;
    },
  ) {
    return this.settingsService.upsertGlobalAIProvider(user.id, body);
  }

  @Patch('organizations/:id/status')
  @ApiOperation({ summary: 'Activate or suspend a tenant organization' })
  async toggleOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') organizationId: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.settingsService.toggleOrganizationStatus(user.id, organizationId, body.isActive);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List all subscription plans, including inactive/unlisted ones' })
  async listPlans() {
    return this.settingsService.listAllPlans();
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update a subscription plan\'s pricing, quotas, and features' })
  async updatePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') planId: string,
    @Body(new ZodValidationPipe(updateSubscriptionPlanSchema))
    body: z.infer<typeof updateSubscriptionPlanSchema>,
  ) {
    return this.settingsService.updatePlan(user.id, planId, body);
  }
}
