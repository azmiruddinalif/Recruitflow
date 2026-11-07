import {
  Body,
  Controller,
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
  cancelInterviewSchema,
  listInterviewsQuerySchema,
  rescheduleInterviewSchema,
  scheduleInterviewSchema,
  submitInterviewFeedbackSchema,
} from './dto';
import { InterviewsService } from './interviews.service';

@ApiTags('Interviews')
@ApiBearerAuth()
@UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Get()
  @RequirePermissions('interviews.read')
  @ApiOperation({ summary: 'List interviews for the active organization (scoped for Interviewers)' })
  async list(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listInterviewsQuerySchema))
    query: z.infer<typeof listInterviewsQuerySchema>,
  ) {
    return this.interviewsService.listInterviews(
      org.organizationId,
      user.id,
      org.roleCode,
      query,
    );
  }

  @Post()
  @RequirePermissions('interviews.schedule')
  @ApiOperation({ summary: 'Schedule a new candidate interview with participants and conflict check' })
  async schedule(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(scheduleInterviewSchema))
    body: z.infer<typeof scheduleInterviewSchema>,
  ) {
    return this.interviewsService.scheduleInterview(
      org.organizationId,
      user.id,
      body,
    );
  }

  @Get(':id')
  @RequirePermissions('interviews.read')
  @ApiOperation({ summary: 'Get interview details, participants, and submitted scorecards' })
  async getById(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.interviewsService.getInterviewById(
      org.organizationId,
      id,
      user.id,
      org.roleCode,
    );
  }

  @Patch(':id/reschedule')
  @RequirePermissions('interviews.schedule')
  @ApiOperation({ summary: 'Reschedule an interview and update participants or meeting link' })
  async reschedule(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rescheduleInterviewSchema))
    body: z.infer<typeof rescheduleInterviewSchema>,
  ) {
    return this.interviewsService.rescheduleInterview(
      org.organizationId,
      id,
      user.id,
      body,
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('interviews.schedule')
  @ApiOperation({ summary: 'Cancel a scheduled interview' })
  async cancel(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelInterviewSchema))
    body: z.infer<typeof cancelInterviewSchema>,
  ) {
    return this.interviewsService.cancelInterview(
      org.organizationId,
      id,
      user.id,
      body,
    );
  }

  @Post(':id/feedback')
  @RequirePermissions('interviews.feedback')
  @ApiOperation({ summary: 'Submit or update structured interview scorecard feedback' })
  async submitFeedback(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(submitInterviewFeedbackSchema))
    body: z.infer<typeof submitInterviewFeedbackSchema>,
  ) {
    return this.interviewsService.submitFeedback(
      org.organizationId,
      id,
      user.id,
      body,
    );
  }
}
