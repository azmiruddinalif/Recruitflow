import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedOrganizationContext } from '@recruitflow/types';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthGuard } from '../auth/auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics & Reports')
@Controller('analytics')
@UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @RequirePermissions('analytics.read')
  @ApiOperation({ summary: 'Get real-time recruitment dashboard metrics with date range filtering' })
  async getDashboard(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Query('range') range?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getDashboardMetrics(org.organizationId, range, from, to);
  }

  @Get('reports')
  @RequirePermissions('analytics.read')
  @ApiOperation({ summary: 'Get detailed recruitment analytics and conversion reports' })
  async getReports(@CurrentOrg() org: AuthenticatedOrganizationContext) {
    return this.analyticsService.getDetailedReports(org.organizationId);
  }
}
