import { Injectable, NotFoundException } from '@nestjs/common';
import type { AIProviderType } from '@recruitflow/types';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationSettings(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { settings: true },
    });
    if (!org) throw new NotFoundException('Organization not found.');
    return org;
  }

  async updateOrganizationSettings(
    organizationId: string,
    userId: string,
    data: {
      name?: string;
      industry?: string;
      companySize?: string;
      website?: string;
      description?: string;
      defaultTimezone?: string;
      defaultCurrency?: string;
      brandPrimaryColor?: string;
      allowAIResumeParsing?: boolean;
      allowAICandidateMatching?: boolean;
      defaultAIProvider?: AIProviderType;
      emailNotificationsEnabled?: boolean;
    },
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({
        where: { id: organizationId },
        data: {
          name: data.name,
          industry: data.industry,
          companySize: data.companySize,
          website: data.website,
          description: data.description,
        },
      });

      const settings = await tx.organizationSettings.upsert({
        where: { organizationId },
        update: {
          defaultTimezone: data.defaultTimezone,
          defaultCurrency: data.defaultCurrency,
          brandPrimaryColor: data.brandPrimaryColor,
          allowAIResumeParsing: data.allowAIResumeParsing,
          allowAICandidateMatching: data.allowAICandidateMatching,
          defaultAIProvider: data.defaultAIProvider,
          emailNotificationsEnabled: data.emailNotificationsEnabled,
        },
        create: {
          organizationId,
          defaultTimezone: data.defaultTimezone ?? 'UTC',
          defaultCurrency: data.defaultCurrency ?? 'USD',
          brandPrimaryColor: data.brandPrimaryColor ?? '#4F46E5',
          allowAIResumeParsing: data.allowAIResumeParsing ?? true,
          allowAICandidateMatching: data.allowAICandidateMatching ?? true,
          defaultAIProvider: data.defaultAIProvider,
          emailNotificationsEnabled: data.emailNotificationsEnabled ?? true,
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          actorId: userId,
          entityType: 'ORGANIZATION_SETTINGS',
          entityId: organizationId,
          action: 'SETTINGS_UPDATED',
          description: 'Updated organization settings and preferences',
        },
      });

      return { ...org, settings };
    });

    return updated;
  }

  async getSuperAdminOverview() {
    const [
      organizationsCount,
      usersCount,
      candidatesCount,
      jobsCount,
      applicationsCount,
      aiCallsCount,
      organizations,
      users,
      aiProviders,
      auditLogs,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.candidate.count({ where: { deletedAt: null } }),
      this.prisma.job.count({ where: { deletedAt: null } }),
      this.prisma.jobApplication.count({ where: { deletedAt: null } }),
      this.prisma.aIUsageLog.count(),
      this.prisma.organization.findMany({
        where: { deletedAt: null },
        include: {
          subscription: { include: { plan: true } },
          _count: {
            select: { members: true, jobs: true, candidates: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          isSuperAdmin: true,
          isActive: true,
          createdAt: true,
          memberships: {
            include: { organization: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.aIProvider.findMany({
        where: { organizationId: null },
        orderBy: { provider: 'asc' },
      }),
      this.prisma.activityLog.findMany({
        include: {
          actor: { select: { name: true, email: true } },
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    return {
      metrics: {
        organizationsCount,
        usersCount,
        candidatesCount,
        jobsCount,
        applicationsCount,
        aiCallsCount,
      },
      organizations,
      users,
      aiProviders: aiProviders.map((p) => ({
        ...p,
        apiKeyEncrypted: p.apiKeyEncrypted ? '••••••••' + p.apiKeyEncrypted.slice(-4) : null,
      })),
      auditLogs,
    };
  }

  async upsertGlobalAIProvider(
    actorId: string,
    payload: {
      provider: AIProviderType;
      displayName: string;
      apiKey?: string;
      defaultModel: string;
      isEnabled: boolean;
      isDefault?: boolean;
    },
  ) {
    const existing = await this.prisma.aIProvider.findFirst({
      where: { organizationId: null, provider: payload.provider },
    });

    const record = existing
      ? await this.prisma.aIProvider.update({
          where: { id: existing.id },
          data: {
            displayName: payload.displayName,
            defaultModel: payload.defaultModel,
            isEnabled: payload.isEnabled,
            isDefault: payload.isDefault ?? existing.isDefault,
            ...(payload.apiKey ? { apiKeyEncrypted: payload.apiKey } : {}),
          },
        })
      : await this.prisma.aIProvider.create({
          data: {
            organizationId: null,
            provider: payload.provider,
            displayName: payload.displayName,
            apiKeyEncrypted: payload.apiKey ?? null,
            defaultModel: payload.defaultModel,
            isEnabled: payload.isEnabled,
            isDefault: payload.isDefault ?? false,
          },
        });

    await this.prisma.activityLog.create({
      data: {
        actorId,
        entityType: 'AI_PROVIDER',
        entityId: record.id,
        action: 'GLOBAL_AI_CONFIGURED',
        description: `Configured global AI provider ${payload.provider} (${payload.defaultModel})`,
      },
    });

    return {
      ...record,
      apiKeyEncrypted: record.apiKeyEncrypted ? '••••••••' : null,
    };
  }

  async toggleOrganizationStatus(actorId: string, organizationId: string, isActive: boolean) {
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { isActive },
    });

    await this.prisma.activityLog.create({
      data: {
        organizationId,
        actorId,
        entityType: 'ORGANIZATION',
        entityId: organizationId,
        action: isActive ? 'ORG_ACTIVATED' : 'ORG_SUSPENDED',
        description: `Super Admin set organization active=${isActive}`,
      },
    });

    return updated;
  }
}
