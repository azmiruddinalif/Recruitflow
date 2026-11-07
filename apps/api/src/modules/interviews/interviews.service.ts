import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { SystemRoleCode } from '@recruitflow/types';
import { buildPaginationMeta } from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import type {
  CancelInterviewDto,
  ListInterviewsQueryDto,
  RescheduleInterviewDto,
  ScheduleInterviewDto,
  SubmitInterviewFeedbackDto,
} from './dto';

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listInterviews(
    organizationId: string,
    userId: string,
    roleCode: SystemRoleCode,
    query: ListInterviewsQueryDto,
  ) {
    const where: Prisma.InterviewWhereInput = {
      organizationId,
    };

    // Scope INTERVIEWER role to interviews where they are a participant
    if (roleCode === 'INTERVIEWER') {
      where.participants = {
        some: { userId },
      };
    }

    if (query.applicationId) {
      where.applicationId = query.applicationId;
    }

    if (query.jobId) {
      where.application = { jobId: query.jobId };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.upcomingOnly) {
      where.scheduledAt = { gte: new Date() };
      where.status = { in: ['SCHEDULED', 'RESCHEDULED'] };
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.prisma.interview.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          application: {
            include: {
              candidate: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  currentTitle: true,
                },
              },
              job: {
                select: {
                  id: true,
                  title: true,
                  department: true,
                },
              },
            },
          },
          scheduledBy: {
            select: { id: true, name: true, email: true },
          },
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
          feedbacks: {
            include: {
              reviewer: { select: { id: true, name: true, email: true, image: true } },
            },
          },
        },
      }),
      this.prisma.interview.count({ where }),
    ]);

    return {
      data: items,
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getInterviewById(
    organizationId: string,
    interviewId: string,
    userId: string,
    roleCode: SystemRoleCode,
  ) {
    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId, organizationId },
      include: {
        application: {
          include: {
            candidate: {
              include: {
                skills: true,
                experiences: true,
                resumes: { where: { isPrimary: true }, take: 1 },
              },
            },
            job: {
              include: { skills: true },
            },
          },
        },
        scheduledBy: {
          select: { id: true, name: true, email: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true, jobTitle: true },
            },
          },
        },
        feedbacks: {
          include: {
            reviewer: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found in this organization');
    }

    if (
      roleCode === 'INTERVIEWER' &&
      !interview.participants.some((p) => p.userId === userId)
    ) {
      throw new ForbiddenException('You are not a participant on this interview');
    }

    return interview;
  }

  async scheduleInterview(
    organizationId: string,
    actorId: string,
    dto: ScheduleInterviewDto,
  ) {
    const application = await this.prisma.jobApplication.findFirst({
      where: {
        id: dto.applicationId,
        organizationId,
        deletedAt: null,
      },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        job: { select: { id: true, title: true } },
      },
    });

    if (!application) {
      throw new NotFoundException('Job application not found in this organization');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    const durationMinutes = dto.durationMinutes ?? 45;
    const windowEnd = new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000);
    const windowStart = new Date(scheduledAt.getTime() - durationMinutes * 60 * 1000);

    // Check participant scheduling conflicts
    const uniqueParticipantIds = Array.from(new Set(dto.participantUserIds));
    const conflictingInterviews = await this.prisma.interview.findMany({
      where: {
        organizationId,
        status: { in: ['SCHEDULED', 'RESCHEDULED'] },
        scheduledAt: {
          gte: windowStart,
          lte: windowEnd,
        },
        participants: {
          some: {
            userId: { in: uniqueParticipantIds },
          },
        },
      },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
      },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const interview = await tx.interview.create({
        data: {
          organizationId,
          applicationId: dto.applicationId,
          title: dto.title.trim(),
          description: dto.description ?? null,
          type: dto.type ?? 'VIDEO',
          status: 'SCHEDULED',
          scheduledAt,
          durationMinutes,
          timezone: dto.timezone ?? 'UTC',
          locationOrLink:
            dto.locationOrLink ??
            `https://meet.recruitflow.io/${dto.applicationId.slice(-8)}`,
          agendaNotes: dto.agendaNotes ?? null,
          scheduledById: actorId,
          participants: {
            create: uniqueParticipantIds.map((uid) => ({
              userId: uid,
              role: 'INTERVIEWER',
              status: 'ACCEPTED',
            })),
          },
        },
        include: {
          application: {
            include: {
              candidate: { select: { id: true, fullName: true, email: true } },
              job: { select: { id: true, title: true } },
            },
          },
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
        },
      });

      // Notify participants
      if (uniqueParticipantIds.length > 0) {
        await tx.notification.createMany({
          data: uniqueParticipantIds.map((uid) => ({
            organizationId,
            userId: uid,
            type: 'INTERVIEW_SCHEDULED' as const,
            title: `Interview Scheduled: ${application.candidate.fullName}`,
            message: `You have been assigned to "${interview.title}" for ${application.job.title} at ${scheduledAt.toISOString()}.`,
            actionUrl: `/interviews/${interview.id}`,
          })),
        });
      }

      await tx.activityLog.create({
        data: {
          organizationId,
          actorId,
          entityType: 'Interview',
          entityId: interview.id,
          action: 'interview.scheduled',
          description: `Scheduled ${interview.type} interview "${interview.title}" for ${application.candidate.fullName}`,
        },
      });

      return interview;
    });

    return {
      ...result,
      conflictWarnings: conflictingInterviews,
    };
  }

  async rescheduleInterview(
    organizationId: string,
    interviewId: string,
    actorId: string,
    dto: RescheduleInterviewDto,
  ) {
    const existing = await this.prisma.interview.findFirst({
      where: { id: interviewId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Interview not found in this organization');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.participantUserIds && dto.participantUserIds.length > 0) {
        const uniqueParticipantIds = Array.from(new Set(dto.participantUserIds));
        await tx.interviewParticipant.deleteMany({ where: { interviewId } });
        await tx.interviewParticipant.createMany({
          data: uniqueParticipantIds.map((uid) => ({
            interviewId,
            userId: uid,
            role: 'INTERVIEWER',
            status: 'ACCEPTED',
          })),
        });
      }

      const updated = await tx.interview.update({
        where: { id: interviewId },
        data: {
          scheduledAt: new Date(dto.scheduledAt),
          status: 'RESCHEDULED',
          ...(dto.durationMinutes !== undefined
            ? { durationMinutes: dto.durationMinutes }
            : {}),
          ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
          ...(dto.locationOrLink !== undefined
            ? { locationOrLink: dto.locationOrLink }
            : {}),
          ...(dto.agendaNotes !== undefined ? { agendaNotes: dto.agendaNotes } : {}),
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } },
            },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          actorId,
          entityType: 'Interview',
          entityId: interviewId,
          action: 'interview.rescheduled',
          description: `Rescheduled interview "${updated.title}" to ${updated.scheduledAt.toISOString()}`,
        },
      });

      return updated;
    });
  }

  async cancelInterview(
    organizationId: string,
    interviewId: string,
    actorId: string,
    dto: CancelInterviewDto,
  ) {
    const existing = await this.prisma.interview.findFirst({
      where: { id: interviewId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException('Interview not found in this organization');
    }

    const updated = await this.prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        cancelReason: dto.cancelReason ?? null,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        organizationId,
        actorId,
        entityType: 'Interview',
        entityId: interviewId,
        action: 'interview.canceled',
        description: `Canceled interview "${existing.title}"`,
      },
    });

    return updated;
  }

  async submitFeedback(
    organizationId: string,
    interviewId: string,
    reviewerId: string,
    dto: SubmitInterviewFeedbackDto,
  ) {
    const interview = await this.prisma.interview.findFirst({
      where: { id: interviewId, organizationId },
      include: {
        application: true,
      },
    });

    if (!interview) {
      throw new NotFoundException('Interview not found in this organization');
    }

    return this.prisma.$transaction(async (tx) => {
      const feedback = await tx.interviewFeedback.upsert({
        where: {
          interviewId_reviewerId: {
            interviewId,
            reviewerId,
          },
        },
        create: {
          interviewId,
          reviewerId,
          overallRating: dto.overallRating,
          technicalScore: dto.technicalScore ?? null,
          communicationScore: dto.communicationScore ?? null,
          problemSolvingScore: dto.problemSolvingScore ?? null,
          cultureFitScore: dto.cultureFitScore ?? null,
          strengths: dto.strengths ?? null,
          concerns: dto.concerns ?? null,
          notes: dto.notes ?? null,
          recommendation: dto.recommendation,
        },
        update: {
          overallRating: dto.overallRating,
          technicalScore: dto.technicalScore ?? null,
          communicationScore: dto.communicationScore ?? null,
          problemSolvingScore: dto.problemSolvingScore ?? null,
          cultureFitScore: dto.cultureFitScore ?? null,
          strengths: dto.strengths ?? null,
          concerns: dto.concerns ?? null,
          notes: dto.notes ?? null,
          recommendation: dto.recommendation,
        },
        include: {
          reviewer: { select: { id: true, name: true, email: true, image: true } },
        },
      });

      // Mark interview COMPLETED if currently SCHEDULED or RESCHEDULED
      if (interview.status === 'SCHEDULED' || interview.status === 'RESCHEDULED') {
        await tx.interview.update({
          where: { id: interviewId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      }

      // Recompute average rating on the parent JobApplication
      const allFeedbacks = await tx.interviewFeedback.findMany({
        where: {
          interview: { applicationId: interview.applicationId },
        },
        select: { overallRating: true },
      });

      if (allFeedbacks.length > 0) {
        const avgRating =
          allFeedbacks.reduce((sum, f) => sum + f.overallRating, 0) /
          allFeedbacks.length;
        await tx.jobApplication.update({
          where: { id: interview.applicationId },
          data: {
            overallRating: Math.round(avgRating * 10) / 10,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          organizationId,
          actorId: reviewerId,
          entityType: 'InterviewFeedback',
          entityId: feedback.id,
          action: 'interview.feedback_submitted',
          description: `Submitted scorecard (${dto.recommendation}, ${dto.overallRating}/5) for "${interview.title}"`,
        },
      });

      return feedback;
    });
  }
}
