import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AIProviderType, AuthenticatedUser } from '@recruitflow/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
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
}
