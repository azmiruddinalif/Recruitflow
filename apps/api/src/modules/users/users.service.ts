import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { changePasswordSchema, updateProfileSchema } from '@recruitflow/validation';
import type { z } from 'zod';
import { PrismaService } from '../../database/prisma.service';
import { hashPassword, verifyPassword } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: {
            isActive: true,
            organization: { isActive: true, deletedAt: null },
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                industry: true,
              },
            },
          },
        },
      },
    });

    if (!user || user.deletedAt !== null) {
      throw new NotFoundException('User profile not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      phone: user.phone,
      jobTitle: user.jobTitle,
      timezone: user.timezone,
      isSuperAdmin: user.isSuperAdmin,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      memberships: user.memberships.map((m) => ({
        id: m.id,
        roleCode: m.roleCode,
        department: m.department,
        joinedAt: m.joinedAt,
        organization: m.organization,
      })),
    };
  }

  async updateMyProfile(
    userId: string,
    dto: z.infer<typeof updateProfileSchema>,
  ) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle } : {}),
        ...(dto.timezone !== undefined ? { timezone: dto.timezone } : {}),
        ...(dto.image !== undefined ? { image: dto.image } : {}),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      image: updated.image,
      phone: updated.phone,
      jobTitle: updated.jobTitle,
      timezone: updated.timezone,
      isSuperAdmin: updated.isSuperAdmin,
      isActive: updated.isActive,
    };
  }

  async changePassword(
    userId: string,
    dto: z.infer<typeof changePasswordSchema>,
  ) {
    const account = await this.prisma.account.findFirst({
      where: { userId, providerId: 'credential' },
    });

    if (!account || !account.password) {
      throw new BadRequestException('No password credential account found for this user');
    }

    if (!verifyPassword(dto.currentPassword, account.password)) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newPasswordHash = hashPassword(dto.newPassword);

    await this.prisma.account.update({
      where: { id: account.id },
      data: { password: newPasswordHash },
    });

    return { changed: true };
  }

  async listActiveSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      activeOrganizationId: s.activeOrganizationId,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async deactivateMyAccount(userId: string) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      }),
      this.prisma.session.deleteMany({
        where: { userId },
      }),
    ]);

    return { deactivated: true };
  }
}
