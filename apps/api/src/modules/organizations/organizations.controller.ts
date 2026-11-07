import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AuthenticatedOrganizationContext,
  AuthenticatedUser,
  SystemRoleCode,
} from '@recruitflow/types';
import {
  createOrganizationSchema,
  inviteMemberSchema,
  updateOrganizationSchema,
} from '@recruitflow/validation';
import type { Request } from 'express';
import { z } from 'zod';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthGuard } from '../auth/auth.guard';
import { OrganizationsService } from './organizations.service';

const switchOrgSchema = z.object({
  organizationId: z.string().min(1, 'Organization ID is required'),
});

const updateMemberRoleSchema = z.object({
  roleCode: z.enum(['ORG_ADMIN', 'HIRING_MANAGER', 'RECRUITER', 'INTERVIEWER']),
  department: z.string().max(80).optional(),
});

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a new organization workspace' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createOrganizationSchema))
    body: z.infer<typeof createOrganizationSchema>,
    @Req() req: Request,
  ) {
    const session = (req as unknown as { session?: { id: string } }).session;
    return this.organizationsService.createOrganization(user.id, body, session?.id);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List all organizations the authenticated user belongs to' })
  async listMyOrganizations(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.listUserOrganizations(user.id);
  }

  @Post('switch')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch active organization for current session' })
  async switchOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(switchOrgSchema))
    body: z.infer<typeof switchOrgSchema>,
    @Req() req: Request,
  ) {
    const session = (req as unknown as { session?: { id: string } }).session;
    return this.organizationsService.switchActiveOrganization(
      user.id,
      body.organizationId,
      session?.id,
    );
  }

  @Get('current')
  @UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
  @RequirePermissions('organization.read')
  @ApiOperation({ summary: 'Get active organization profile, settings, and counts' })
  async getCurrent(@CurrentOrg() org: AuthenticatedOrganizationContext) {
    return this.organizationsService.getCurrentOrganization(org.organizationId);
  }

  @Patch('current')
  @UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
  @RequirePermissions('organization.manage')
  @ApiOperation({ summary: 'Update active organization profile and settings' })
  async updateCurrent(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateOrganizationSchema))
    body: z.infer<typeof updateOrganizationSchema>,
  ) {
    return this.organizationsService.updateOrganization(
      org.organizationId,
      user.id,
      body,
    );
  }

  @Post('invitations')
  @UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
  @RequirePermissions('members.manage')
  @ApiOperation({ summary: 'Invite a new member to the active organization' })
  async inviteMember(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(inviteMemberSchema))
    body: z.infer<typeof inviteMemberSchema>,
  ) {
    return this.organizationsService.inviteMember(
      org.organizationId,
      user.id,
      body,
    );
  }

  @Get('invitations')
  @UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
  @RequirePermissions('members.read')
  @ApiOperation({ summary: 'List invitations for the active organization' })
  async listInvitations(@CurrentOrg() org: AuthenticatedOrganizationContext) {
    return this.organizationsService.listInvitations(org.organizationId);
  }

  @Post('invitations/:token/accept')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an organization invitation token' })
  async acceptInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('token') token: string,
  ) {
    return this.organizationsService.acceptInvitation(user.id, user.email, token);
  }

  @Post('invitations/:token/reject')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an organization invitation token' })
  async rejectInvitation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('token') token: string,
  ) {
    return this.organizationsService.rejectInvitation(user.email, token);
  }

  @Get('members')
  @UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
  @RequirePermissions('members.read')
  @ApiOperation({ summary: 'List active members of the current organization' })
  async listMembers(@CurrentOrg() org: AuthenticatedOrganizationContext) {
    return this.organizationsService.listMembers(org.organizationId);
  }

  @Patch('members/:memberId')
  @UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
  @RequirePermissions('members.manage')
  @ApiOperation({ summary: 'Update a member role or department in the current organization' })
  async updateMemberRole(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema))
    body: z.infer<typeof updateMemberRoleSchema>,
  ) {
    return this.organizationsService.updateMemberRole(
      org.organizationId,
      memberId,
      user.id,
      body.roleCode as SystemRoleCode,
      body.department,
    );
  }

  @Delete('members/:memberId')
  @UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
  @RequirePermissions('members.manage')
  @ApiOperation({ summary: 'Remove a member from the current organization' })
  async removeMember(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('memberId') memberId: string,
  ) {
    return this.organizationsService.removeMember(
      org.organizationId,
      memberId,
      user.id,
    );
  }
}
