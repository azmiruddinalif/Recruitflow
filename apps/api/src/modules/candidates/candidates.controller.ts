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
import { CandidatesService } from './candidates.service';
import {
  addCandidateNoteSchema,
  candidateCertificationSchema,
  candidateEducationSchema,
  candidateExperienceSchema,
  candidateSkillSchema,
  createCandidateSchema,
  listCandidatesQuerySchema,
  updateCandidateSchema,
  uploadResumePayloadSchema,
} from './dto';

@ApiTags('Candidates')
@ApiBearerAuth()
@UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  @RequirePermissions('candidates.read')
  @ApiOperation({ summary: 'List candidates with search, skill/source filters, and pagination' })
  async list(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Query(new ZodValidationPipe(listCandidatesQuerySchema))
    query: z.infer<typeof listCandidatesQuerySchema>,
  ) {
    return this.candidatesService.listCandidates(org.organizationId, query);
  }

  @Post()
  @RequirePermissions('candidates.create')
  @ApiOperation({ summary: 'Create a new candidate profile in the active organization' })
  async create(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createCandidateSchema))
    body: z.infer<typeof createCandidateSchema>,
  ) {
    return this.candidatesService.createCandidate(org.organizationId, user.id, body);
  }

  @Get(':id')
  @RequirePermissions('candidates.read')
  @ApiOperation({ summary: 'Get full candidate profile with skills, history, resumes, and applications' })
  async getById(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('id') id: string,
  ) {
    return this.candidatesService.getCandidateById(org.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('candidates.update')
  @ApiOperation({ summary: 'Update candidate profile details' })
  async update(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateCandidateSchema))
    body: z.infer<typeof updateCandidateSchema>,
  ) {
    return this.candidatesService.updateCandidate(
      org.organizationId,
      id,
      user.id,
      body,
    );
  }

  @Delete(':id')
  @RequirePermissions('candidates.delete')
  @ApiOperation({ summary: 'Soft-delete (archive) a candidate record' })
  async remove(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.candidatesService.softDeleteCandidate(
      org.organizationId,
      id,
      user.id,
    );
  }

  @Post(':id/skills')
  @RequirePermissions('candidates.update')
  @ApiOperation({ summary: 'Add or update a skill on a candidate profile' })
  async addSkill(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(candidateSkillSchema))
    body: z.infer<typeof candidateSkillSchema>,
  ) {
    return this.candidatesService.addSkill(org.organizationId, id, body);
  }

  @Delete(':id/skills/:skillId')
  @RequirePermissions('candidates.update')
  @ApiOperation({ summary: 'Remove a skill from a candidate profile' })
  async removeSkill(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('id') id: string,
    @Param('skillId') skillId: string,
  ) {
    return this.candidatesService.removeSkill(org.organizationId, id, skillId);
  }

  @Post(':id/experiences')
  @RequirePermissions('candidates.update')
  @ApiOperation({ summary: 'Add work experience entry to candidate profile' })
  async addExperience(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(candidateExperienceSchema))
    body: z.infer<typeof candidateExperienceSchema>,
  ) {
    return this.candidatesService.addExperience(org.organizationId, id, body);
  }

  @Delete(':id/experiences/:experienceId')
  @RequirePermissions('candidates.update')
  @ApiOperation({ summary: 'Remove work experience entry from candidate profile' })
  async removeExperience(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('id') id: string,
    @Param('experienceId') experienceId: string,
  ) {
    return this.candidatesService.removeExperience(
      org.organizationId,
      id,
      experienceId,
    );
  }

  @Post(':id/educations')
  @RequirePermissions('candidates.update')
  @ApiOperation({ summary: 'Add education entry to candidate profile' })
  async addEducation(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(candidateEducationSchema))
    body: z.infer<typeof candidateEducationSchema>,
  ) {
    return this.candidatesService.addEducation(org.organizationId, id, body);
  }

  @Delete(':id/educations/:educationId')
  @RequirePermissions('candidates.update')
  @ApiOperation({ summary: 'Remove education entry from candidate profile' })
  async removeEducation(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('id') id: string,
    @Param('educationId') educationId: string,
  ) {
    return this.candidatesService.removeEducation(
      org.organizationId,
      id,
      educationId,
    );
  }

  @Post(':id/certifications')
  @RequirePermissions('candidates.update')
  @ApiOperation({ summary: 'Add certification entry to candidate profile' })
  async addCertification(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(candidateCertificationSchema))
    body: z.infer<typeof candidateCertificationSchema>,
  ) {
    return this.candidatesService.addCertification(org.organizationId, id, body);
  }

  @Post(':id/notes')
  @RequirePermissions('candidates.update')
  @ApiOperation({ summary: 'Add a recruiter note to a candidate profile' })
  async addNote(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(addCandidateNoteSchema))
    body: z.infer<typeof addCandidateNoteSchema>,
  ) {
    return this.candidatesService.addNote(org.organizationId, id, user.id, body);
  }

  @Post(':id/resumes')
  @RequirePermissions('candidates.create')
  @ApiOperation({ summary: 'Upload and attach a resume file to a candidate' })
  async uploadResume(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(uploadResumePayloadSchema))
    body: z.infer<typeof uploadResumePayloadSchema>,
  ) {
    return this.candidatesService.uploadResume(
      org.organizationId,
      id,
      user.id,
      body,
    );
  }
}
