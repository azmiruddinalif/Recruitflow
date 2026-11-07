import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AIProviderType,
  AuthenticatedOrganizationContext,
  AuthenticatedUser,
} from '@recruitflow/types';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthGuard } from '../auth/auth.guard';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
@UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('organization')
  @RequirePermissions('organization.read')
  @ApiOperation({ summary: 'Get active organization settings' })
  async getOrganizationSettings(@CurrentOrg() org: AuthenticatedOrganizationContext) {
    return this.settingsService.getOrganizationSettings(org.organizationId);
  }

  @Patch('organization')
  @RequirePermissions('organization.manage')
  @ApiOperation({ summary: 'Update active organization settings' })
  async updateOrganizationSettings(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      name?: string;
      industry?: string;
      companySize?: string;
      website?: string;
      description?: string;
      defaultTimezone?: string;
      defaultCurrency?: string;
      brandPrimaryColor?: string;
      allowAIResumeParsing?: boolean;
      allowAICandidateMatching?: boolean;
      defaultAIProvider?: AIProviderType;
      emailNotificationsEnabled?: boolean;
    },
  ) {
    return this.settingsService.updateOrganizationSettings(org.organizationId, user.id, body);
  }
}
