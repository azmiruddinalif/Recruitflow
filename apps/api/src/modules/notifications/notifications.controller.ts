import { Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedOrganizationContext, AuthenticatedUser } from '@recruitflow/types';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { AuthGuard } from '../auth/auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(AuthGuard, OrganizationGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List user notifications for active organization' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrg() org: AuthenticatedOrganizationContext,
  ) {
    return this.notificationsService.listForUser(user.id, org.organizationId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  async markRead(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentOrg() org: AuthenticatedOrganizationContext,
  ) {
    return this.notificationsService.markAllAsRead(user.id, org.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a single notification record' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.deleteNotification(user.id, id);
  }
}
