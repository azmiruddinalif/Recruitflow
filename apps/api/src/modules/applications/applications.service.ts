import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { APPLICATION_PIPELINE_STAGES } from '@recruitflow/shared';
import type { ApplicationStatus } from '@recruitflow/types';
import { buildPaginationMeta } from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import type {
  AddApplicationNoteDto,
  AssignRecruiterDto,
  CreateApplicationDto,
  KanbanQueryDto,
  ListApplicationsQueryDto,
  UpdateApplicationStatusDto,
} from './dto';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listApplications(organizationId: string, query: ListApplicationsQueryDto) {
    const where: Prisma.JobApplicationWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (query.jobId) {
      where.jobId = query.jobId;
    }

    if (query.candidateId) {
      where.candidateId = query.candidateId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.assignedRecruiterId) {
      where.assignedRecruiterId = query.assignedRecruiterId;
    }

    if (query.minMatchScore !== undefined) {
      where.matchScore = { gte: query.minMatchScore };
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { candidate: { fullName: { contains: term, mode: 'insensitive' } } },
        { candidate: { email: { contains: term, mode: 'insensitive' } } },
        { job: { title: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          candidate: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              fullName: true,
              email: true,
              phone: true,
              currentTitle: true,
              currentCompany: true,
              location: true,
              totalExperienceYears: true,
              skills: true,
            },
          },
          job: {
            select: {
              id: true,
              title: true,
              department: true,
              location: true,
              status: true,
            },
          },
          assignedRecruiter: {
            select: { id: true, name: true, email: true, image: true },
          },
          aiMatch: true,
          _count: {
            select: {
              notes: true,
              interviews: true,
            },
          },
        },
      }),
      this.prisma.jobApplication.count({ where }),
    ]);

    return {
      data: items,
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getKanbanBoard(organizationId: string, query: KanbanQueryDto) {
    const where: Prisma.JobApplicationWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (query.jobId) {
      where.jobId = query.jobId;
    }

    if (query.assignedRecruiterId) {
      where.assignedRecruiterId = query.assignedRecruiterId;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { candidate: { fullName: { contains: term, mode: 'insensitive' } } },
        { candidate: { email: { contains: term, mode: 'insensitive' } } },
        { job: { title: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const applications = await this.prisma.jobApplication.findMany({
      where,
      orderBy: [{ stageOrder: 'asc' }, { updatedAt: 'desc' }],
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            email: true,
            currentTitle: true,
            currentCompany: true,
            totalExperienceYears: true,
            skills: { take: 5 },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
        assignedRecruiter: {
          select: { id: true, name: true, image: true },
        },
        aiMatch: {
          select: {
            overallScore: true,
            skillsScore: true,
            matchingSkills: true,
          },
        },
      },
    });

    const columns = APPLICATION_PIPELINE_STAGES.map((stage) => {
      const stageItems = applications.filter((app) => app.status === stage.status);
      return {
        status: stage.status,
        label: stage.label,
        order: stage.order,
        isTerminal: stage.isTerminal,
        count: stageItems.length,
        applications: stageItems,
      };
    });

    return {
      totalApplications: applications.length,
      columns,
    };
  }

  async getApplicationById(organizationId: string, applicationId: string) {
    const application = await this.prisma.jobApplication.findFirst({
      where: {
        id: applicationId,
        organizationId,
        deletedAt: null,
      },
      include: {
        candidate: {
          include: {
            skills: true,
            experiences: { orderBy: { startDate: 'desc' } },
            educations: { orderBy: { startDate: 'desc' } },
            resumes: { orderBy: { createdAt: 'desc' } },
          },
        },
        job: {
          include: {
            skills: true,
            hiringManager: { select: { id: true, name: true, email: true } },
          },
        },
        resumeSnapshot: true,
        assignedRecruiter: {
          select: { id: true, name: true, email: true, image: true },
        },
        statusHistory: {
          include: {
            changedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          include: {
            author: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        interviews: {
          include: {
            participants: {
              include: {
                user: { select: { id: true, name: true, email: true, image: true } },
              },
            },
            feedbacks: {
              include: {
                reviewer: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy: { scheduledAt: 'asc' },
        },
        aiMatch: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Job application not found in this organization');
    }

    return application;
  }

  async createApplication(
    organizationId: string,
    actorId: string,
    dto: CreateApplicationDto,
  ) {
    const [job, candidate] = await Promise.all([
      this.prisma.job.findFirst({
        where: { id: dto.jobId, organizationId, deletedAt: null },
      }),
      this.prisma.candidate.findFirst({
        where: { id: dto.candidateId, organizationId, deletedAt: null },
        include: {
          resumes: { where: { isPrimary: true }, take: 1 },
        },
      }),
    ]);

    if (!job) {
      throw new NotFoundException('Job requisition not found in this organization');
    }

    if (!candidate) {
      throw new NotFoundException('Candidate not found in this organization');
    }

    const existingApplication = await this.prisma.jobApplication.findUnique({
      where: {
        jobId_candidateId: {
          jobId: dto.jobId,
          candidateId: dto.candidateId,
        },
      },
    });

    if (existingApplication && existingApplication.deletedAt === null) {
      throw new ConflictException(
        `Candidate "${candidate.fullName}" has already applied to job "${job.title}"`,
      );
    }

    const resumeSnapshotId = dto.resumeId ?? candidate.resumes[0]?.id ?? null;

    return this.prisma.$transaction(async (tx) => {
      const application = await tx.jobApplication.create({
        data: {
          organizationId,
          jobId: dto.jobId,
          candidateId: dto.candidateId,
          resumeId: resumeSnapshotId,
          status: 'NEW',
          stageOrder: 0,
          source: dto.source ?? candidate.source ?? 'DIRECT_APPLY',
          coverLetter: dto.coverLetter ?? null,
          expectedSalary: dto.expectedSalary ?? candidate.expectedSalaryMin ?? null,
          assignedRecruiterId: dto.assignedRecruiterId ?? actorId,
        },
        include: {
          candidate: {
            select: { id: true, fullName: true, email: true },
          },
          job: {
            select: { id: true, title: true, department: true },
          },
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: null,
          toStatus: 'NEW',
          changedById: actorId,
          reason: 'Initial application created',
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          actorId,
          entityType: 'JobApplication',
          entityId: application.id,
          action: 'application.created',
          description: `Applied candidate "${candidate.fullName}" to "${job.title}"`,
        },
      });

      return application;
    });
  }

  /**
   * Transitions a single JobApplication's pipeline stage atomically inside a Prisma transaction.
   * Crucially, pipeline status belongs strictly to `JobApplication` (id = applicationId),
   * NEVER mutating the `Candidate` record or any other `JobApplication` belonging to the same candidate.
   */
  async transitionApplicationStatus(
    organizationId: string,
    applicationId: string,
    actorId: string,
    dto: UpdateApplicationStatusDto,
  ) {
    const existing = await this.prisma.jobApplication.findFirst({
      where: {
        id: applicationId,
        organizationId,
        deletedAt: null,
      },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        job: { select: { id: true, title: true, hiringManagerId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('Job application not found in this organization');
    }

    const fromStatus = existing.status as ApplicationStatus;
    const toStatus = dto.status as ApplicationStatus;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.jobApplication.update({
        where: { id: applicationId },
        data: {
          status: toStatus,
          ...(dto.stageOrder !== undefined ? { stageOrder: dto.stageOrder } : {}),
          ...(toStatus === 'HIRED' ? { hiredAt: now } : {}),
          ...(toStatus === 'REJECTED'
            ? {
                rejectedAt: now,
                rejectionReason: dto.reason ?? existing.rejectionReason,
              }
            : {}),
          ...(toStatus === 'WITHDRAWN' ? { withdrawnAt: now } : {}),
        },
        include: {
          candidate: {
            select: { id: true, fullName: true, email: true, currentTitle: true },
          },
          job: {
            select: { id: true, title: true, department: true },
          },
          assignedRecruiter: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (fromStatus !== toStatus) {
        await tx.applicationStatusHistory.create({
          data: {
            applicationId,
            fromStatus,
            toStatus,
            changedById: actorId,
            reason: dto.reason ?? null,
          },
        });

        await tx.activityLog.create({
          data: {
            organizationId,
            actorId,
            entityType: 'JobApplication',
            entityId: applicationId,
            action: 'application.status_changed',
            description: `Moved "${existing.candidate.fullName}" on "${existing.job.title}" from ${fromStatus} to ${toStatus}`,
            metadata: {
              applicationId,
              candidateId: existing.candidateId,
              jobId: existing.jobId,
              fromStatus,
              toStatus,
            },
          },
        });
      }

      return updated;
    });
  }

  async addNote(
    organizationId: string,
    applicationId: string,
    authorId: string,
    dto: AddApplicationNoteDto,
  ) {
    const existing = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Job application not found in this organization');
    }

    return this.prisma.applicationNote.create({
      data: {
        applicationId,
        authorId,
        content: dto.content.trim(),
        stageContext: dto.stageContext ?? existing.status,
        isPrivate: dto.isPrivate ?? false,
      },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    });
  }

  async assignRecruiter(
    organizationId: string,
    applicationId: string,
    actorId: string,
    dto: AssignRecruiterDto,
  ) {
    const existing = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Job application not found in this organization');
    }

    const updated = await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { assignedRecruiterId: dto.assignedRecruiterId },
      include: {
        assignedRecruiter: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        organizationId,
        actorId,
        entityType: 'JobApplication',
        entityId: applicationId,
        action: 'application.recruiter_assigned',
        description: `Updated assigned recruiter for application ${applicationId}`,
      },
    });

    return updated;
  }

  async deleteApplication(
    organizationId: string,
    applicationId: string,
    actorId: string,
  ) {
    const existing = await this.prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Job application not found in this organization');
    }

    await this.prisma.$transaction([
      this.prisma.jobApplication.update({
        where: { id: applicationId },
        data: { deletedAt: new Date() },
      }),
      this.prisma.activityLog.create({
        data: {
          organizationId,
          actorId,
          entityType: 'JobApplication',
          entityId: applicationId,
          action: 'application.deleted',
          description: `Archived job application ${applicationId}`,
        },
      }),
    ]);

    return { deleted: true, id: applicationId };
  }
}
