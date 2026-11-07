import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { APPLICATION_PIPELINE_STAGES, slugify } from '@recruitflow/shared';
import type { JobStatus } from '@recruitflow/types';
import { randomBytes } from 'crypto';
import { buildPaginationMeta } from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateJobDto,
  ListJobsQueryDto,
  UpdateJobDto,
  UpdateJobPipelineConfigDto,
} from './dto';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async listJobs(organizationId: string, query: ListJobsQueryDto) {
    const where: Prisma.JobWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { department: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.department && query.department.trim()) {
      where.department = {
        equals: query.department.trim(),
        mode: 'insensitive',
      };
    }

    if (query.workLocationType) {
      where.workLocationType = query.workLocationType;
    }

    if (query.employmentType) {
      where.employmentType = query.employmentType;
    }

    if (query.experienceLevel) {
      where.experienceLevel = query.experienceLevel;
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          skills: { orderBy: [{ isRequired: 'desc' }, { name: 'asc' }] },
          hiringManager: {
            select: { id: true, name: true, email: true, image: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              applications: { where: { deletedAt: null } },
            },
          },
        },
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data: items,
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getJobById(organizationId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id: jobId,
        organizationId,
        deletedAt: null,
      },
      include: {
        skills: { orderBy: [{ isRequired: 'desc' }, { name: 'asc' }] },
        hiringManager: {
          select: { id: true, name: true, email: true, image: true, jobTitle: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: {
            applications: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job requisition not found in this organization');
    }

    return job;
  }

  async createJob(organizationId: string, actorId: string, dto: CreateJobDto) {
    const baseSlug = slugify(dto.title) || 'job';
    const uniqueSlug = `${baseSlug}-${randomBytes(3).toString('hex')}`;
    const jobCode = `JOB-${randomBytes(2).toString('hex').toUpperCase()}`;

    const skillInputs: Array<{ name: string; isRequired: boolean; weight: number }> = [];
    const seenSkills = new Set<string>();

    for (const reqSkill of dto.requiredSkills ?? []) {
      const normalized = reqSkill.trim();
      if (normalized && !seenSkills.has(normalized.toLowerCase())) {
        seenSkills.add(normalized.toLowerCase());
        skillInputs.push({ name: normalized, isRequired: true, weight: 8 });
      }
    }

    for (const prefSkill of dto.preferredSkills ?? []) {
      const normalized = prefSkill.trim();
      if (normalized && !seenSkills.has(normalized.toLowerCase())) {
        seenSkills.add(normalized.toLowerCase());
        skillInputs.push({ name: normalized, isRequired: false, weight: 4 });
      }
    }

    const status = dto.status ?? 'DRAFT';

    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          organizationId,
          title: dto.title.trim(),
          slug: uniqueSlug,
          code: jobCode,
          department: dto.department.trim(),
          location: dto.location.trim(),
          workLocationType: dto.workLocationType ?? 'HYBRID',
          employmentType: dto.employmentType ?? 'FULL_TIME',
          experienceLevel: dto.experienceLevel ?? 'MID',
          minExperienceYears: dto.minExperienceYears ?? 0,
          maxExperienceYears: dto.maxExperienceYears ?? null,
          salaryMin: dto.salaryMin ?? null,
          salaryMax: dto.salaryMax ?? null,
          salaryCurrency: dto.salaryCurrency ?? 'USD',
          showSalary: dto.showSalary ?? true,
          description: dto.description,
          responsibilities: dto.responsibilities ?? [],
          qualifications: dto.qualifications ?? [],
          benefits: dto.benefits ?? [],
          educationRequirement: dto.educationRequirement ?? null,
          openingsCount: dto.openingsCount ?? 1,
          status,
          publishedAt: status === 'PUBLISHED' ? new Date() : null,
          applicationDeadline: dto.applicationDeadline
            ? new Date(dto.applicationDeadline)
            : null,
          pipelineConfigJson: APPLICATION_PIPELINE_STAGES as unknown as Prisma.InputJsonValue,
          hiringManagerId: dto.hiringManagerId ?? null,
          createdById: actorId,
          aiGenerated: dto.aiGenerated ?? false,
          skills:
            skillInputs.length > 0
              ? {
                  create: skillInputs,
                }
              : undefined,
        },
        include: {
          skills: true,
          hiringManager: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          actorId,
          entityType: 'Job',
          entityId: job.id,
          action: 'job.created',
          description: `Created job requisition "${job.title}" (${job.department})`,
        },
      });

      return job;
    });
  }

  async updateJob(
    organizationId: string,
    jobId: string,
    actorId: string,
    dto: UpdateJobDto,
  ) {
    const existing = await this.getJobById(organizationId, jobId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.requiredSkills !== undefined || dto.preferredSkills !== undefined) {
        await tx.jobSkill.deleteMany({ where: { jobId } });

        const reqSkills =
          dto.requiredSkills ??
          existing.skills.filter((s) => s.isRequired).map((s) => s.name);
        const prefSkills =
          dto.preferredSkills ??
          existing.skills.filter((s) => !s.isRequired).map((s) => s.name);

        const skillInputs: Array<{
          jobId: string;
          name: string;
          isRequired: boolean;
          weight: number;
        }> = [];
        const seen = new Set<string>();

        for (const name of reqSkills) {
          const clean = name.trim();
          if (clean && !seen.has(clean.toLowerCase())) {
            seen.add(clean.toLowerCase());
            skillInputs.push({ jobId, name: clean, isRequired: true, weight: 8 });
          }
        }

        for (const name of prefSkills) {
          const clean = name.trim();
          if (clean && !seen.has(clean.toLowerCase())) {
            seen.add(clean.toLowerCase());
            skillInputs.push({ jobId, name: clean, isRequired: false, weight: 4 });
          }
        }

        if (skillInputs.length > 0) {
          await tx.jobSkill.createMany({ data: skillInputs });
        }
      }

      const updated = await tx.job.update({
        where: { id: jobId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.department !== undefined ? { department: dto.department.trim() } : {}),
          ...(dto.location !== undefined ? { location: dto.location.trim() } : {}),
          ...(dto.workLocationType !== undefined
            ? { workLocationType: dto.workLocationType }
            : {}),
          ...(dto.employmentType !== undefined
            ? { employmentType: dto.employmentType }
            : {}),
          ...(dto.experienceLevel !== undefined
            ? { experienceLevel: dto.experienceLevel }
            : {}),
          ...(dto.minExperienceYears !== undefined
            ? { minExperienceYears: dto.minExperienceYears }
            : {}),
          ...(dto.maxExperienceYears !== undefined
            ? { maxExperienceYears: dto.maxExperienceYears }
            : {}),
          ...(dto.salaryMin !== undefined ? { salaryMin: dto.salaryMin } : {}),
          ...(dto.salaryMax !== undefined ? { salaryMax: dto.salaryMax } : {}),
          ...(dto.salaryCurrency !== undefined
            ? { salaryCurrency: dto.salaryCurrency }
            : {}),
          ...(dto.showSalary !== undefined ? { showSalary: dto.showSalary } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.responsibilities !== undefined
            ? { responsibilities: dto.responsibilities }
            : {}),
          ...(dto.qualifications !== undefined
            ? { qualifications: dto.qualifications }
            : {}),
          ...(dto.benefits !== undefined ? { benefits: dto.benefits } : {}),
          ...(dto.educationRequirement !== undefined
            ? { educationRequirement: dto.educationRequirement }
            : {}),
          ...(dto.openingsCount !== undefined
            ? { openingsCount: dto.openingsCount }
            : {}),
          ...(dto.status !== undefined
            ? {
                status: dto.status,
                ...(dto.status === 'PUBLISHED' && !existing.publishedAt
                  ? { publishedAt: new Date() }
                  : {}),
                ...(dto.status === 'CLOSED' ? { closedAt: new Date() } : {}),
              }
            : {}),
          ...(dto.applicationDeadline !== undefined
            ? {
                applicationDeadline: dto.applicationDeadline
                  ? new Date(dto.applicationDeadline)
                  : null,
              }
            : {}),
          ...(dto.hiringManagerId !== undefined
            ? { hiringManagerId: dto.hiringManagerId }
            : {}),
        },
        include: {
          skills: true,
          hiringManager: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          actorId,
          entityType: 'Job',
          entityId: jobId,
          action: 'job.updated',
          description: `Updated job requisition "${updated.title}"`,
        },
      });

      return updated;
    });
  }

  async transitionJobStatus(
    organizationId: string,
    jobId: string,
    actorId: string,
    targetStatus: JobStatus,
  ) {
    const existing = await this.getJobById(organizationId, jobId);

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: targetStatus,
        ...(targetStatus === 'PUBLISHED' && !existing.publishedAt
          ? { publishedAt: new Date() }
          : {}),
        ...(targetStatus === 'CLOSED' || targetStatus === 'ARCHIVED'
          ? { closedAt: new Date() }
          : {}),
      },
      include: {
        skills: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        organizationId,
        actorId,
        entityType: 'Job',
        entityId: jobId,
        action: `job.status_${targetStatus.toLowerCase()}`,
        description: `Changed job "${existing.title}" status from ${existing.status} to ${targetStatus}`,
      },
    });

    return updated;
  }

  async updatePipelineConfig(
    organizationId: string,
    jobId: string,
    dto: UpdateJobPipelineConfigDto,
  ) {
    await this.getJobById(organizationId, jobId);

    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        pipelineConfigJson: dto.stages as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async softDeleteJob(organizationId: string, jobId: string, actorId: string) {
    const existing = await this.getJobById(organizationId, jobId);

    await this.prisma.$transaction([
      this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'ARCHIVED',
          deletedAt: new Date(),
        },
      }),
      this.prisma.activityLog.create({
        data: {
          organizationId,
          actorId,
          entityType: 'Job',
          entityId: jobId,
          action: 'job.deleted',
          description: `Deleted job requisition "${existing.title}"`,
        },
      }),
    ]);

    return { deleted: true, id: jobId };
  }
}
