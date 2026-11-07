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
import {
  createJobSchema,
  listJobsQuerySchema,
  updateJobPipelineConfigSchema,
  updateJobSchema,
  updateJobStatusSchema,
} from './dto';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @RequirePermissions('jobs.read')
  @ApiOperation({ summary: 'List job requisitions for the active organization' })
  async list(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Query(new ZodValidationPipe(listJobsQuerySchema))
    query: z.infer<typeof listJobsQuerySchema>,
  ) {
    return this.jobsService.listJobs(org.organizationId, query);
  }

  @Post()
  @RequirePermissions('jobs.create')
  @ApiOperation({ summary: 'Create a new job requisition' })
  async create(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createJobSchema))
    body: z.infer<typeof createJobSchema>,
  ) {
    return this.jobsService.createJob(org.organizationId, user.id, body);
  }

  @Get(':id')
  @RequirePermissions('jobs.read')
  @ApiOperation({ summary: 'Get job requisition details with skills and application counts' })
  async getById(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('id') id: string,
  ) {
    return this.jobsService.getJobById(org.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('jobs.update')
  @ApiOperation({ summary: 'Update job requisition details and skills' })
  async update(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateJobSchema))
    body: z.infer<typeof updateJobSchema>,
  ) {
    return this.jobsService.updateJob(org.organizationId, id, user.id, body);
  }

  @Patch(':id/status')
  @RequirePermissions('jobs.update')
  @ApiOperation({ summary: 'Transition job status (DRAFT, PUBLISHED, PAUSED, CLOSED, ARCHIVED)' })
  async updateStatus(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateJobStatusSchema))
    body: z.infer<typeof updateJobStatusSchema>,
  ) {
    return this.jobsService.transitionJobStatus(
      org.organizationId,
      id,
      user.id,
      body.status,
    );
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('jobs.update')
  @ApiOperation({ summary: 'Publish a job requisition' })
  async publish(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.transitionJobStatus(
      org.organizationId,
      id,
      user.id,
      'PUBLISHED',
    );
  }

  @Post(':id/pause')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('jobs.update')
  @ApiOperation({ summary: 'Pause a published job requisition' })
  async pause(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.transitionJobStatus(
      org.organizationId,
      id,
      user.id,
      'PAUSED',
    );
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('jobs.update')
  @ApiOperation({ summary: 'Archive a job requisition' })
  async archive(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.transitionJobStatus(
      org.organizationId,
      id,
      user.id,
      'ARCHIVED',
    );
  }

  @Patch(':id/pipeline')
  @RequirePermissions('jobs.update')
  @ApiOperation({ summary: 'Update custom pipeline configuration for a job' })
  async updatePipeline(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateJobPipelineConfigSchema))
    body: z.infer<typeof updateJobPipelineConfigSchema>,
  ) {
    return this.jobsService.updatePipelineConfig(org.organizationId, id, body);
  }

  @Delete(':id')
  @RequirePermissions('jobs.delete')
  @ApiOperation({ summary: 'Soft-delete a job requisition' })
  async remove(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.jobsService.softDeleteJob(org.organizationId, id, user.id);
  }
}
