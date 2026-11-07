import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AuthenticatedOrganizationContext,
  AuthenticatedUser,
} from '@recruitflow/types';
import type { z } from 'zod';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthGuard } from '../auth/auth.guard';
import { ApplicationsService } from './applications.service';
import {
  addApplicationNoteSchema,
  assignRecruiterSchema,
  createApplicationSchema,
  kanbanQuerySchema,
  listApplicationsQuerySchema,
  updateApplicationStatusSchema,
} from './dto';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @RequirePermissions('applications.read')
  @ApiOperation({ summary: 'List job applications with filtering, sorting, and pagination' })
  async list(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Query(new ZodValidationPipe(listApplicationsQuerySchema))
    query: z.infer<typeof listApplicationsQuerySchema>,
  ) {
    return this.applicationsService.listApplications(org.organizationId, query);
  }

  @Get('kanban')
  @RequirePermissions('applications.read')
  @ApiOperation({ summary: 'Get job applications grouped by pipeline stage for the Kanban board' })
  async getKanban(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Query(new ZodValidationPipe(kanbanQuerySchema))
    query: z.infer<typeof kanbanQuerySchema>,
  ) {
    return this.applicationsService.getKanbanBoard(org.organizationId, query);
  }

  @Post()
  @RequirePermissions('applications.create')
  @ApiOperation({ summary: 'Apply a candidate to a job requisition' })
  async create(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createApplicationSchema))
    body: z.infer<typeof createApplicationSchema>,
  ) {
    return this.applicationsService.createApplication(
      org.organizationId,
      user.id,
      body,
    );
  }

  @Get(':id')
  @RequirePermissions('applications.read')
  @ApiOperation({
    summary:
      'Get full job application details with candidate, job, status history, notes, interviews, and AI match',
  })
  async getById(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('id') id: string,
  ) {
    return this.applicationsService.getApplicationById(org.organizationId, id);
  }

  @Patch(':id/status')
  @RequirePermissions('applications.update')
  @ApiOperation({
    summary:
      'Transition job application pipeline stage and record audit history without affecting other applications',
  })
  async updateStatus(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateApplicationStatusSchema))
    body: z.infer<typeof updateApplicationStatusSchema>,
  ) {
    return this.applicationsService.transitionApplicationStatus(
      org.organizationId,
      id,
      user.id,
      body,
    );
  }

  @Post(':id/notes')
  @RequirePermissions('applications.update')
  @ApiOperation({ summary: 'Add a stage note to a job application' })
  async addNote(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addApplicationNoteSchema))
    body: z.infer<typeof addApplicationNoteSchema>,
  ) {
    return this.applicationsService.addNote(
      org.organizationId,
      id,
      user.id,
      body,
    );
  }

  @Patch(':id/assign')
  @RequirePermissions('applications.update')
  @ApiOperation({ summary: 'Assign or unassign a recruiter for a job application' })
  async assignRecruiter(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(assignRecruiterSchema))
    body: z.infer<typeof assignRecruiterSchema>,
  ) {
    return this.applicationsService.assignRecruiter(
      org.organizationId,
      id,
      user.id,
      body,
    );
  }

  @Delete(':id')
  @RequirePermissions('applications.delete')
  @ApiOperation({ summary: 'Archive a job application' })
  async remove(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.applicationsService.deleteApplication(
      org.organizationId,
      id,
      user.id,
    );
  }
}
