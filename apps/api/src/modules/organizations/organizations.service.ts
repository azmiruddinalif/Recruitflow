import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { slugify } from '@recruitflow/shared';
import type { SystemRoleCode } from '@recruitflow/types';
import type {
  createOrganizationSchema,
  inviteMemberSchema,
  updateOrganizationSchema,
} from '@recruitflow/validation';
import { randomBytes } from 'crypto';
import type { z } from 'zod';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(
    userId: string,
    dto: z.infer<typeof createOrganizationSchema>,
    currentSessionId?: string,
  ) {
    const baseSlug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    let slug = baseSlug || `org-${randomBytes(3).toString('hex')}`;

    const existingSlug = await this.prisma.organization.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      slug = `${slug}-${randomBytes(3).toString('hex')}`;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name.trim(),
          slug,
          industry: dto.industry ?? null,
          companySize: dto.companySize ?? null,
          website: dto.website || null,
          description: dto.description ?? null,
          isActive: true,
        },
      });

      const settings = await tx.organizationSettings.create({
        data: {
          organizationId: organization.id,
          defaultTimezone: 'UTC',
          defaultCurrency: 'USD',
        },
      });

      const orgAdminRole = await tx.role.findFirst({
        where: { systemCode: 'ORG_ADMIN', isSystem: true },
      });

      const membership = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          role: 'ORG_ADMIN',
          roleCode: 'ORG_ADMIN',
          roleId: orgAdminRole?.id ?? null,
          isActive: true,
        },
      });

      let defaultPlan = await tx.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });

      if (!defaultPlan) {
        defaultPlan = await tx.subscriptionPlan.create({
          data: {
            code: 'SELF_HOSTED_FREE',
            name: 'Self-Hosted Starter',
            description: 'Default self-hosted organization plan',
            priceMonthlyCents: 0,
            priceYearlyCents: 0,
            maxJobs: 25,
            maxCandidates: 2500,
            maxMembers: 25,
            aiCreditsMonthly: 500,
            features: ['ATS Pipeline', 'AI Resume Parsing', 'AI Candidate Matching'],
          },
        });
      }

      const subscription = await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: defaultPlan.id,
          status: 'SELF_HOSTED',
          billingInterval: 'MONTHLY',
        },
      });

      if (currentSessionId) {
        await tx.session.update({
          where: { id: currentSessionId },
          data: { activeOrganizationId: organization.id },
        });
      }

      await tx.activityLog.create({
        data: {
          organizationId: organization.id,
          actorId: userId,
          entityType: 'Organization',
          entityId: organization.id,
          action: 'organization.created',
          description: `Created organization "${organization.name}"`,
        },
      });

      return { organization, settings, membership, subscription };
    });

    return result;
  }

  async listUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        isActive: true,
        organization: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        organization: {
          include: {
            settings: true,
            subscription: {
              include: { plan: true },
            },
            _count: {
              select: {
                members: { where: { isActive: true } },
                jobs: { where: { deletedAt: null } },
                candidates: { where: { deletedAt: null } },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return memberships.map((m) => ({
      memberId: m.id,
      roleCode: m.roleCode,
      department: m.department,
      joinedAt: m.joinedAt,
      organization: m.organization,
    }));
  }

  async switchActiveOrganization(
    userId: string,
    organizationId: string,
    sessionId?: string,
  ) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (
      !membership ||
      !membership.isActive ||
      !membership.organization.isActive ||
      membership.organization.deletedAt !== null
    ) {
      throw new ForbiddenException('You are not an active member of this organization');
    }

    if (sessionId) {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: { activeOrganizationId: organizationId },
      });
    } else {
      await this.prisma.session.updateMany({
        where: { userId },
        data: { activeOrganizationId: organizationId },
      });
    }

    return {
      activeOrganizationId: organizationId,
      organizationName: membership.organization.name,
      organizationSlug: membership.organization.slug,
      roleCode: membership.roleCode,
    };
  }

  async getCurrentOrganization(organizationId: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        deletedAt: null,
      },
      include: {
        settings: true,
        subscription: {
          include: { plan: true },
        },
        _count: {
          select: {
            members: { where: { isActive: true } },
            jobs: { where: { deletedAt: null } },
            candidates: { where: { deletedAt: null } },
            applications: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return org;
  }

  async updateOrganization(
    organizationId: string,
    actorId: string,
    dto: z.infer<typeof updateOrganizationSchema>,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.slug) {
        const existingSlug = await tx.organization.findFirst({
          where: {
            slug: dto.slug,
            id: { not: organizationId },
          },
        });
        if (existingSlug) {
          throw new ConflictException('Another organization is already using this slug');
        }
      }

      const updatedOrg = await tx.organization.update({
        where: { id: organizationId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.slug !== undefined ? { slug: slugify(dto.slug) } : {}),
          ...(dto.industry !== undefined ? { industry: dto.industry } : {}),
          ...(dto.companySize !== undefined ? { companySize: dto.companySize } : {}),
          ...(dto.website !== undefined ? { website: dto.website || null } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
        },
      });

      const settings = await tx.organizationSettings.upsert({
        where: { organizationId },
        create: {
          organizationId,
          defaultTimezone: dto.defaultTimezone ?? 'UTC',
          defaultCurrency: dto.defaultCurrency ?? 'USD',
          brandPrimaryColor: dto.brandPrimaryColor ?? '#4F46E5',
          allowAIResumeParsing: dto.allowAIResumeParsing ?? true,
          allowAICandidateMatching: dto.allowAICandidateMatching ?? true,
          emailNotificationsEnabled: dto.emailNotificationsEnabled ?? true,
        },
        update: {
          ...(dto.defaultTimezone !== undefined
            ? { defaultTimezone: dto.defaultTimezone }
            : {}),
          ...(dto.defaultCurrency !== undefined
            ? { defaultCurrency: dto.defaultCurrency }
            : {}),
          ...(dto.brandPrimaryColor !== undefined
            ? { brandPrimaryColor: dto.brandPrimaryColor }
            : {}),
          ...(dto.allowAIResumeParsing !== undefined
            ? { allowAIResumeParsing: dto.allowAIResumeParsing }
            : {}),
          ...(dto.allowAICandidateMatching !== undefined
            ? { allowAICandidateMatching: dto.allowAICandidateMatching }
            : {}),
          ...(dto.emailNotificationsEnabled !== undefined
            ? { emailNotificationsEnabled: dto.emailNotificationsEnabled }
            : {}),
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          actorId,
          entityType: 'Organization',
          entityId: organizationId,
          action: 'organization.updated',
          description: `Updated organization profile and settings`,
        },
      });

      return { ...updatedOrg, settings };
    });
  }

  async inviteMember(
    organizationId: string,
    inviterId: string,
    dto: z.infer<typeof inviteMemberSchema>,
  ) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMember = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: existingUser.id,
          },
        },
      });
      if (existingMember && existingMember.isActive) {
        throw new ConflictException('This user is already an active member of the organization');
      }
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = randomBytes(20).toString('hex');

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId,
        email,
        role: dto.roleCode,
        roleCode: dto.roleCode,
        status: 'PENDING',
        token,
        inviterId,
        expiresAt,
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        inviter: { select: { id: true, name: true, email: true } },
      },
    });

    if (existingUser) {
      await this.prisma.notification.create({
        data: {
          organizationId,
          userId: existingUser.id,
          type: 'ORGANIZATION_INVITE',
          title: `Invitation to join ${invitation.organization.name}`,
          message: `${invitation.inviter.name} invited you to join ${invitation.organization.name} as ${dto.roleCode}.`,
          actionUrl: `/invitations/${invitation.token}`,
        },
      });
    }

    await this.prisma.activityLog.create({
      data: {
        organizationId,
        actorId: inviterId,
        entityType: 'Invitation',
        entityId: invitation.id,
        action: 'member.invited',
        description: `Invited ${email} with role ${dto.roleCode}`,
      },
    });

    return invitation;
  }

  async listInvitations(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId },
      include: {
        inviter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptInvitation(userId: string, userEmail: string, token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { organization: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation is already ${invitation.status.toLowerCase()}`);
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    return this.prisma.$transaction(async (tx) => {
      const systemRole = await tx.role.findFirst({
        where: { systemCode: invitation.roleCode, isSystem: true },
      });

      const member = await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId,
          },
        },
        create: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.roleCode,
          roleCode: invitation.roleCode,
          roleId: systemRole?.id ?? null,
          isActive: true,
        },
        update: {
          role: invitation.roleCode,
          roleCode: invitation.roleCode,
          roleId: systemRole?.id ?? null,
          isActive: true,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      return {
        member,
        organization: invitation.organization,
      };
    });
  }

  async rejectInvitation(userEmail: string, token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new NotFoundException('Pending invitation not found');
    }

    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenException('This invitation was sent to a different email address');
    }

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'REJECTED' },
    });

    return { rejected: true };
  }

  async listMembers(organizationId: string) {
    return this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            jobTitle: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateMemberRole(
    organizationId: string,
    memberId: string,
    actorId: string,
    roleCode: SystemRoleCode,
    department?: string,
  ) {
    const targetMember = await this.prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
        isActive: true,
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Organization member not found');
    }

    // Last-admin protection when demoting an ORG_ADMIN
    if (targetMember.roleCode === 'ORG_ADMIN' && roleCode !== 'ORG_ADMIN') {
      const activeAdminsCount = await this.prisma.organizationMember.count({
        where: {
          organizationId,
          roleCode: 'ORG_ADMIN',
          isActive: true,
        },
      });

      if (activeAdminsCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the last Organization Admin. Assign another admin first.',
        );
      }
    }

    const systemRole = await this.prisma.role.findFirst({
      where: { systemCode: roleCode, isSystem: true },
    });

    const updated = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: {
        role: roleCode,
        roleCode,
        roleId: systemRole?.id ?? null,
        ...(department !== undefined ? { department } : {}),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        organizationId,
        actorId,
        entityType: 'OrganizationMember',
        entityId: memberId,
        action: 'member.role_updated',
        description: `Updated member ${updated.user.email} role to ${roleCode}`,
      },
    });

    return updated;
  }

  async removeMember(organizationId: string, memberId: string, actorId: string) {
    const targetMember = await this.prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId,
        isActive: true,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!targetMember) {
      throw new NotFoundException('Organization member not found');
    }

    if (targetMember.roleCode === 'ORG_ADMIN') {
      const activeAdminsCount = await this.prisma.organizationMember.count({
        where: {
          organizationId,
          roleCode: 'ORG_ADMIN',
          isActive: true,
        },
      });

      if (activeAdminsCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last Organization Admin from the workspace.',
        );
      }
    }

    await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { isActive: false },
    });

    await this.prisma.activityLog.create({
      data: {
        organizationId,
        actorId,
        entityType: 'OrganizationMember',
        entityId: memberId,
        action: 'member.removed',
        description: `Removed member ${targetMember.user.email} from organization`,
      },
    });

    return { removed: true, memberId };
  }
}
