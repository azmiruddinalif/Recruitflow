import { Injectable } from '@nestjs/common';
import { APPLICATION_PIPELINE_STAGES } from '@recruitflow/shared';
import type { DashboardMetrics } from '@recruitflow/types';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveDateWindow(range?: string, from?: string, to?: string): { gte?: Date; lte?: Date } {
    const now = new Date();
    if (range === '7d') {
      return { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), lte: now };
    }
    if (range === '30d') {
      return { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), lte: now };
    }
    if (range === '90d') {
      return { gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), lte: now };
    }
    if (range === '1y') {
      return { gte: new Date(now.getFullYear(), 0, 1), lte: now };
    }
    if (range === 'custom' && (from || to)) {
      return {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }
    return {};
  }

  async getDashboardMetrics(
    organizationId: string,
    range?: string,
    from?: string,
    to?: string,
  ): Promise<DashboardMetrics> {
    const dateFilter = this.resolveDateWindow(range, from, to);
    const hasWindow = Boolean(dateFilter.gte || dateFilter.lte);

    const [
      totalCandidates,
      activeJobs,
      totalApplications,
      scheduledInterviews,
      hiredCandidates,
      rejectedApplications,
      stageGroupings,
      upcomingInterviewsRaw,
      recentActivitiesRaw,
    ] = await Promise.all([
      this.prisma.candidate.count({
        where: {
          organizationId,
          deletedAt: null,
          ...(hasWindow ? { createdAt: dateFilter } : {}),
        },
      }),
      this.prisma.job.count({
        where: {
          organizationId,
          status: 'PUBLISHED',
          deletedAt: null,
          ...(hasWindow ? { createdAt: dateFilter } : {}),
        },
      }),
      this.prisma.jobApplication.count({
        where: {
          organizationId,
          deletedAt: null,
          ...(hasWindow ? { appliedAt: dateFilter } : {}),
        },
      }),
      this.prisma.interview.count({
        where: {
          organizationId,
          status: { in: ['SCHEDULED', 'RESCHEDULED'] },
          ...(hasWindow ? { scheduledAt: dateFilter } : { scheduledAt: { gte: new Date() } }),
        },
      }),
      this.prisma.jobApplication.count({
        where: {
          organizationId,
          status: 'HIRED',
          deletedAt: null,
          ...(hasWindow ? { updatedAt: dateFilter } : {}),
        },
      }),
      this.prisma.jobApplication.count({
        where: {
          organizationId,
          status: 'REJECTED',
          deletedAt: null,
          ...(hasWindow ? { updatedAt: dateFilter } : {}),
        },
      }),
      this.prisma.jobApplication.groupBy({
        by: ['status'],
        where: {
          organizationId,
          deletedAt: null,
          ...(hasWindow ? { appliedAt: dateFilter } : {}),
        },
        _count: { _all: true },
      }),
      this.prisma.interview.findMany({
        where: {
          organizationId,
          status: { in: ['SCHEDULED', 'RESCHEDULED'] },
        },
        include: {
          application: {
            include: {
              candidate: { select: { fullName: true } },
              job: { select: { title: true } },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 6,
      }),
      this.prisma.activityLog.findMany({
        where: {
          organizationId,
          ...(hasWindow ? { createdAt: dateFilter } : {}),
        },
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const hiringTrends = await this.getMonthlyHiringTrends(organizationId);

    const funnel = APPLICATION_PIPELINE_STAGES.map((stage) => {
      const found = stageGroupings.find((g) => g.status === stage.status);
      const count = found?._count._all ?? 0;
      return {
        status: stage.status,
        count,
        percentage: totalApplications > 0 ? Math.round((count / totalApplications) * 100) : 0,
      };
    });

    return {
      totalCandidates,
      activeJobs,
      totalApplications,
      scheduledInterviews,
      hiredCandidates,
      rejectedApplications,
      funnel,
      hiringTrends,
      upcomingInterviews: upcomingInterviewsRaw.map((item) => ({
        id: item.id,
        title: item.title,
        scheduledAt: item.scheduledAt.toISOString(),
        type: item.type,
        candidateName: item.application.candidate.fullName,
        jobTitle: item.application.job.title,
      })),
      recentActivities: recentActivitiesRaw.map((log) => ({
        id: log.id,
        action: log.action,
        description: log.description,
        actorName: log.actor?.name ?? 'System',
        createdAt: log.createdAt.toISOString(),
      })),
    };
  }

  private async getMonthlyHiringTrends(organizationId: string) {
    const now = new Date();
    const months: Array<{ key: string; label: string; start: Date; end: Date }> = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      months.push({
        key: `${start.getFullYear()}-${start.getMonth()}`,
        label: start.toLocaleString('en-US', { month: 'short' }),
        start,
        end,
      });
    }
    const windowStart = months[0].start;
    const windowEnd = months[months.length - 1].end;

    const [applications, interviews, hires] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where: { organizationId, deletedAt: null, appliedAt: { gte: windowStart, lt: windowEnd } },
        select: { appliedAt: true },
      }),
      this.prisma.interview.findMany({
        where: { organizationId, scheduledAt: { gte: windowStart, lt: windowEnd } },
        select: { scheduledAt: true },
      }),
      this.prisma.jobApplication.findMany({
        where: {
          organizationId,
          status: 'HIRED',
          hiredAt: { gte: windowStart, lt: windowEnd },
        },
        select: { hiredAt: true },
      }),
    ]);

    const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

    return months.map(({ key, label }) => ({
      month: label,
      applications: applications.filter((a) => monthKey(a.appliedAt) === key).length,
      interviews: interviews.filter((i) => monthKey(i.scheduledAt) === key).length,
      hired: hires.filter((h) => h.hiredAt && monthKey(h.hiredAt) === key).length,
    }));
  }

  async getDetailedReports(organizationId: string) {
    const [jobsWithCounts, sourceBreakdown, hiredApplications, interviewsCount] = await Promise.all([
      this.prisma.job.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          id: true,
          title: true,
          department: true,
          status: true,
          _count: { select: { applications: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.jobApplication.groupBy({
        by: ['source'],
        where: { organizationId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.jobApplication.findMany({
        where: { organizationId, status: 'HIRED', hiredAt: { not: null }, deletedAt: null },
        select: { appliedAt: true, hiredAt: true },
      }),
      this.prisma.interview.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
      }),
    ]);

    const avgTimeToHireDays =
      hiredApplications.length > 0
        ? Math.round(
            hiredApplications.reduce((sum, app) => {
              const diffMs = (app.hiredAt?.getTime() ?? Date.now()) - app.appliedAt.getTime();
              return sum + Math.max(1, diffMs / (1000 * 60 * 60 * 24));
            }, 0) / hiredApplications.length,
          )
        : 18;

    return {
      averageTimeToHireDays: avgTimeToHireDays,
      applicationsPerJob: jobsWithCounts.map((j) => ({
        jobId: j.id,
        title: j.title,
        department: j.department,
        status: j.status,
        applicationsCount: j._count.applications,
      })),
      sourceEffectiveness: sourceBreakdown.map((s) => ({
        source: s.source,
        applications: s._count._all,
      })),
      interviewConversion: interviewsCount.map((i) => ({
        status: i.status,
        count: i._count._all,
      })),
    };
  }
}
