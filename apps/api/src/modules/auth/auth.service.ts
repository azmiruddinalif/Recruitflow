import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ROLE_PERMISSION_MATRIX, slugify } from '@recruitflow/shared';
import type {
  AuthenticatedOrganizationContext,
  PermissionCode,
  SystemRoleCode,
} from '@recruitflow/types';
import {
  createHash,
  pbkdf2Sync,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'crypto';
import {
  extractSessionToken,
  verifyBetterAuthSession,
} from '../../config/better-auth.config';
import { PrismaService } from '../../database/prisma.service';
import type { AuthSessionPayload, UserOrganizationSummary } from './auth.types';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;

  const normalized = storedHash.startsWith('scrypt:')
    ? storedHash.slice(7)
    : storedHash;

  if (normalized.includes(':')) {
    const parts = normalized.split(':');
    const salt = parts[0]!;
    const keyHex = parts[1]!;

    // 1. Standard Better Auth scrypt (string salt)
    try {
      const derived = scryptSync(password, salt, 64);
      const keyBuf = Buffer.from(keyHex, 'hex');
      if (derived.length === keyBuf.length && timingSafeEqual(derived, keyBuf)) {
        return true;
      }
    } catch {
      // Fallthrough
    }

    // 2. Scrypt with hex-decoded salt buffer
    try {
      const derived = scryptSync(password, Buffer.from(salt, 'hex'), 64);
      const keyBuf = Buffer.from(keyHex, 'hex');
      if (derived.length === keyBuf.length && timingSafeEqual(derived, keyBuf)) {
        return true;
      }
    } catch {
      // Fallthrough
    }

    // 3. PBKDF2 sha512 fallback
    try {
      const derived = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      if (derived === keyHex) {
        return true;
      }
    } catch {
      // Fallthrough
    }

    // 4. Salted SHA-256 fallback
    const saltedSha = createHash('sha256').update(`${salt}:${password}`).digest('hex');
    if (saltedSha === keyHex) {
      return true;
    }
  }

  // 5. Direct SHA-256 hex digest fallback
  const sha256Hex = createHash('sha256').update(password).digest('hex');
  if (storedHash === sha256Hex) {
    return true;
  }

  return false;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(
    input: {
      name: string;
      email: string;
      password: string;
      organizationName?: string;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthSessionPayload> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    const passwordHash = hashPassword(input.password);
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name.trim(),
          email: normalizedEmail,
          emailVerified: true,
          isActive: true,
          isSuperAdmin: false,
          lastLoginAt: new Date(),
        },
      });

      await tx.account.create({
        data: {
          accountId: user.id,
          providerId: 'credential',
          userId: user.id,
          password: passwordHash,
        },
      });

      let activeOrganizationId: string | null = null;

      if (input.organizationName && input.organizationName.trim().length >= 2) {
        const orgName = input.organizationName.trim();
        const baseSlug = slugify(orgName) || 'organization';
        const uniqueSlug = `${baseSlug}-${randomBytes(3).toString('hex')}`;

        const org = await tx.organization.create({
          data: {
            name: orgName,
            slug: uniqueSlug,
            isActive: true,
          },
        });

        await tx.organizationSettings.create({
          data: {
            organizationId: org.id,
            defaultTimezone: 'UTC',
            defaultCurrency: 'USD',
          },
        });

        const orgAdminRole = await tx.role.findFirst({
          where: { systemCode: 'ORG_ADMIN', isSystem: true },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: user.id,
            role: 'ORG_ADMIN',
            roleCode: 'ORG_ADMIN',
            roleId: orgAdminRole?.id ?? null,
            isActive: true,
          },
        });

        const defaultPlan = await tx.subscriptionPlan.findFirst({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        });

        if (defaultPlan) {
          await tx.subscription.create({
            data: {
              organizationId: org.id,
              planId: defaultPlan.id,
              status: 'SELF_HOSTED',
              billingInterval: 'MONTHLY',
            },
          });
        }

        activeOrganizationId = org.id;
      }

      const session = await tx.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt,
          activeOrganizationId,
          ipAddress: meta?.ipAddress ?? null,
          userAgent: meta?.userAgent ?? null,
        },
      });

      return { user, session };
    });

    return this.buildSessionPayload(result.user.id, result.session.token);
  }

  async login(
    input: {
      email: string;
      password: string;
      rememberMe?: boolean;
    },
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthSessionPayload> {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        accounts: {
          where: { providerId: 'credential' },
        },
        memberships: {
          where: {
            isActive: true,
            organization: { isActive: true, deletedAt: null },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive || user.deletedAt !== null) {
      throw new ForbiddenException('Your user account has been deactivated');
    }

    const credentialAccount = user.accounts[0];
    if (
      !credentialAccount?.password ||
      !verifyPassword(input.password, credentialAccount.password)
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ttlDays = input.rememberMe === false ? 1 : 7;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
    const sessionToken = randomBytes(32).toString('hex');
    const defaultOrgId = user.memberships[0]?.organizationId ?? null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
        activeOrganizationId: defaultOrgId,
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });

    return this.buildSessionPayload(user.id, session.token);
  }

  async logout(headers: Record<string, string | string[] | undefined>): Promise<{ loggedOut: boolean }> {
    const rawToken = extractSessionToken(headers);
    if (!rawToken) {
      return { loggedOut: true };
    }

    const baseToken = rawToken.includes('.') ? rawToken.split('.')[0]! : rawToken;
    await this.prisma.session.deleteMany({
      where: {
        token: { in: [rawToken, baseToken] },
      },
    });

    return { loggedOut: true };
  }

  async getSession(
    headers: Record<string, string | string[] | undefined>,
  ): Promise<AuthSessionPayload> {
    const verified = await verifyBetterAuthSession(headers, this.prisma);
    if (!verified) {
      throw new UnauthorizedException('No active session found');
    }

    return this.buildSessionPayload(
      verified.user.id,
      verified.session.token,
      typeof headers['x-organization-id'] === 'string'
        ? headers['x-organization-id']
        : undefined,
    );
  }

  async forgotPassword(email: string): Promise<{ sent: boolean; resetToken?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return { sent: true };
    }

    const resetToken = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.verification.create({
      data: {
        identifier: `password-reset:${user.id}`,
        value: resetToken,
        expiresAt,
      },
    });

    return {
      sent: true,
      ...(process.env.NODE_ENV !== 'production' ? { resetToken } : {}),
    };
  }

  async resetPassword(input: {
    token: string;
    newPassword: string;
  }): Promise<{ reset: boolean }> {
    const verification = await this.prisma.verification.findFirst({
      where: {
        value: input.token,
        identifier: { startsWith: 'password-reset:' },
      },
    });

    if (!verification || verification.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const userId = verification.identifier.replace('password-reset:', '');
    const passwordHash = hashPassword(input.newPassword);

    await this.prisma.$transaction([
      this.prisma.account.updateMany({
        where: { userId, providerId: 'credential' },
        data: { password: passwordHash },
      }),
      this.prisma.session.deleteMany({
        where: { userId },
      }),
      this.prisma.verification.delete({
        where: { id: verification.id },
      }),
    ]);

    return { reset: true };
  }

  async revokeAllUserSessions(
    userId: string,
    keepToken?: string,
  ): Promise<{ revokedCount: number }> {
    const res = await this.prisma.session.deleteMany({
      where: {
        userId,
        ...(keepToken ? { token: { not: keepToken } } : {}),
      },
    });

    return { revokedCount: res.count };
  }

  private async buildSessionPayload(
    userId: string,
    sessionToken: string,
    overrideOrgId?: string,
  ): Promise<AuthSessionPayload> {
    const session = await this.prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          include: {
            memberships: {
              where: {
                isActive: true,
                organization: { isActive: true, deletedAt: null },
              },
              include: {
                organization: true,
                assignedRole: {
                  include: {
                    permissions: {
                      include: { permission: true },
                    },
                  },
                },
              },
              orderBy: { joinedAt: 'asc' },
            },
          },
        },
      },
    });

    if (!session || !session.user) {
      throw new UnauthorizedException('Session not found');
    }

    const { user } = session;
    const organizations: UserOrganizationSummary[] = user.memberships.map((m) => ({
      organizationId: m.organizationId,
      name: m.organization.name,
      slug: m.organization.slug,
      logo: m.organization.logo,
      roleCode: m.roleCode as SystemRoleCode,
      memberId: m.id,
    }));

    const targetOrgId =
      overrideOrgId ??
      session.activeOrganizationId ??
      organizations[0]?.organizationId ??
      null;

    let activeOrganization: AuthenticatedOrganizationContext | null = null;
    if (targetOrgId) {
      const activeMember = user.memberships.find((m) => m.organizationId === targetOrgId);
      if (activeMember) {
        const roleCode = activeMember.roleCode as SystemRoleCode;
        const customPerms = activeMember.assignedRole?.permissions?.map(
          (rp) => rp.permission.code as PermissionCode,
        );
        const permissions: PermissionCode[] = user.isSuperAdmin
          ? ROLE_PERMISSION_MATRIX.SUPER_ADMIN
          : customPerms && customPerms.length > 0
            ? customPerms
            : ROLE_PERMISSION_MATRIX[roleCode] ?? [];

        activeOrganization = {
          organizationId: activeMember.organization.id,
          organizationName: activeMember.organization.name,
          organizationSlug: activeMember.organization.slug,
          memberId: activeMember.id,
          roleCode,
          permissions,
        };
      }
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        jobTitle: user.jobTitle,
        timezone: user.timezone,
        isSuperAdmin: user.isSuperAdmin,
        isActive: user.isActive,
        activeOrganizationId: activeOrganization?.organizationId ?? session.activeOrganizationId,
      },
      session: {
        id: session.id,
        token: session.token,
        userId: session.userId,
        expiresAt: session.expiresAt,
        activeOrganizationId:
          activeOrganization?.organizationId ?? session.activeOrganizationId,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      },
      token: session.token,
      organizations,
      activeOrganization,
    };
  }
}
