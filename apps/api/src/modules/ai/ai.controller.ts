import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AuthenticatedOrganizationContext,
  AuthenticatedUser,
  ParsedResumeData,
} from '@recruitflow/types';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AuthGuard } from '../auth/auth.guard';
import { AIFactory } from './ai.factory';
import { CandidateMatchingService } from './modules/candidate-matching/candidate-matching.service';
import { CandidateSummaryService } from './modules/candidate-summary/candidate-summary.service';
import { EmailAssistantService } from './modules/email-assistant/email-assistant.service';
import { InterviewAssistantService } from './modules/interview-assistant/interview-assistant.service';
import { JobDescriptionService } from './modules/job-description/job-description.service';
import { ResumeParserService } from './modules/resume-parser/resume-parser.service';

@ApiTags('AI Intelligence Suite')
@Controller('ai')
@UseGuards(AuthGuard, OrganizationGuard, PermissionsGuard)
export class AIController {
  constructor(
    private readonly aiFactory: AIFactory,
    private readonly resumeParser: ResumeParserService,
    private readonly candidateMatching: CandidateMatchingService,
    private readonly jobDescription: JobDescriptionService,
    private readonly interviewAssistant: InterviewAssistantService,
    private readonly emailAssistant: EmailAssistantService,
    private readonly candidateSummary: CandidateSummaryService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get active AI provider configuration status for organization' })
  async getStatus(@CurrentOrg() org: AuthenticatedOrganizationContext) {
    return this.aiFactory.getProviderStatus(org.organizationId);
  }

  @Post('parse-resume')
  @RequirePermissions('ai.resume_parse')
  @ApiOperation({ summary: 'Extract structured candidate data from resume into PENDING_REVIEW' })
  async parseResume(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      fileName: string;
      mimeType: string;
      fileSizeBytes: number;
      rawText: string;
      candidateId?: string;
    },
  ) {
    return this.resumeParser.parseResumeText({
      organizationId: org.organizationId,
      userId: user.id,
      ...body,
    });
  }

  @Get('parse-resume/:resumeId')
  @RequirePermissions('ai.resume_parse')
  @ApiOperation({ summary: 'Poll the status of a resume parse job (queued or synchronous)' })
  async getResumeParseStatus(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @Param('resumeId') resumeId: string,
  ) {
    return this.resumeParser.getResumeStatus(org.organizationId, resumeId);
  }

  @Post('parse-resume/:resumeId/approve')
  @RequirePermissions('candidates.create')
  @ApiOperation({ summary: 'Approve and save reviewed AI resume extraction' })
  async approveResume(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param('resumeId') resumeId: string,
    @Body() approvedData: ParsedResumeData,
  ) {
    return this.resumeParser.approveParsedResume({
      organizationId: org.organizationId,
      userId: user.id,
      resumeId,
      approvedData,
    });
  }

  @Post('match-candidate')
  @RequirePermissions('ai.candidate_match')
  @ApiOperation({ summary: 'Run explainable AI candidate-to-job matching evaluation' })
  async matchCandidate(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { jobId: string; candidateId: string; applicationId?: string },
  ) {
    return this.candidateMatching.evaluateCandidateForJob({
      organizationId: org.organizationId,
      userId: user.id,
      ...body,
    });
  }

  @Post('generate-job-description')
  @RequirePermissions('ai.job_generate')
  @ApiOperation({ summary: 'Generate editable job description with AI' })
  async generateJobDescription(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      title: string;
      department: string;
      experienceLevel: string;
      employmentType?: string;
      workLocationType?: string;
      tone?: string;
      requiredSkills: string[];
      preferredSkills?: string[];
    },
  ) {
    return this.jobDescription.generateJobDescription({
      organizationId: org.organizationId,
      userId: user.id,
      ...body,
    });
  }

  @Post('interview-questions')
  @RequirePermissions('ai.interview_assist')
  @ApiOperation({ summary: 'Generate role-specific interview questions and scorecard rubric' })
  async generateInterviewQuestions(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      jobTitle: string;
      experienceLevel: string;
      skills: string[];
      interviewType?: string;
    },
  ) {
    return this.interviewAssistant.generateInterviewQuestions({
      organizationId: org.organizationId,
      userId: user.id,
      ...body,
    });
  }

  @Post('summarize-interview')
  @RequirePermissions('ai.interview_assist')
  @ApiOperation({ summary: 'Summarize interviewer notes without inventing facts' })
  async summarizeInterview(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { rawNotes: string; jobTitle: string },
  ) {
    return this.interviewAssistant.summarizeInterviewNotes({
      organizationId: org.organizationId,
      userId: user.id,
      ...body,
    });
  }

  @Post('generate-email')
  @RequirePermissions('ai.email_assist')
  @ApiOperation({ summary: 'Generate editable candidate communication email draft' })
  async generateEmail(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      purpose: 'INTERVIEW_INVITE' | 'STATUS_UPDATE' | 'FOLLOW_UP' | 'OFFER' | 'REJECTION';
      candidateName: string;
      jobTitle: string;
      companyName?: string;
      tone?: string;
      additionalContext?: string;
    },
  ) {
    return this.emailAssistant.generateEmailDraft({
      organizationId: org.organizationId,
      userId: user.id,
      companyName: body.companyName || org.organizationName,
      ...body,
    });
  }

  @Post('candidate-summary')
  @RequirePermissions('ai.candidate_summary')
  @ApiOperation({ summary: 'Generate a concise AI summary from verified candidate profile data' })
  async generateCandidateSummary(
    @CurrentOrg() org: AuthenticatedOrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { candidateId: string },
  ) {
    return this.candidateSummary.generateCandidateSummary({
      organizationId: org.organizationId,
      userId: user.id,
      candidateId: body.candidateId,
    });
  }
}
