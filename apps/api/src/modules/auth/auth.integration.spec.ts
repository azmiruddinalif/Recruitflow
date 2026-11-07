import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyBetterAuthSession } from '../../config/better-auth.config';
import { PrismaService } from '../../database/prisma.service';
import { AuthGuard } from './auth.guard';
import { hashPassword, verifyPassword } from './auth.service';

describe('Auth Integration & Guard Verification', () => {
  let prismaMock: {
    session: {
      findUnique: ReturnType<typeof vi.fn>;
    };
  };
  let reflectorMock: Reflector;
  let authGuard: AuthGuard;

  beforeEach(() => {
    prismaMock = {
      session: {
        findUnique: vi.fn(),
      },
    };
    reflectorMock = {
      getAllAndOverride: vi.fn().mockReturnValue(false),
    } as unknown as Reflector;
    authGuard = new AuthGuard(prismaMock as unknown as PrismaService, reflectorMock);
  });

  it('hashes and verifies passwords accurately using scrypt', () => {
    const plain = 'RecruitFlow@2026';
    const hashed = hashPassword(plain);
    expect(hashed).toContain(':');
    expect(verifyPassword(plain, hashed)).toBe(true);
    expect(verifyPassword('WrongPassword123', hashed)).toBe(false);
  });

  it('verifies a valid active session token and attaches user & session to request', async () => {
    const futureDate = new Date(Date.now() + 3600_000);
    prismaMock.session.findUnique.mockResolvedValue({
      id: 'sess_1',
      token: 'valid_session_token_123',
      userId: 'user_1',
      expiresAt: futureDate,
      activeOrganizationId: 'org_1',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
      user: {
        id: 'user_1',
        name: 'Sarah Chen',
        email: 'sarah@acme.io',
        emailVerified: true,
        image: null,
        jobTitle: 'Head of Talent',
        timezone: 'UTC',
        isSuperAdmin: false,
        isActive: true,
        deletedAt: null,
      },
    });

    const req: Record<string, unknown> = {
      headers: {
        authorization: 'Bearer valid_session_token_123',
      },
    };

    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    const allowed = await authGuard.canActivate(ctx);
    expect(allowed).toBe(true);
    expect(req.user).toMatchObject({
      id: 'user_1',
      email: 'sarah@acme.io',
      activeOrganizationId: 'org_1',
    });
  });

  it('rejects missing or invalid session tokens with UnauthorizedException', async () => {
    prismaMock.session.findUnique.mockResolvedValue(null);

    const req: Record<string, unknown> = {
      headers: {
        authorization: 'Bearer invalid_token_xyz',
      },
    };

    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    await expect(authGuard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects inactive or soft-deleted users even if session token exists', async () => {
    const futureDate = new Date(Date.now() + 3600_000);
    prismaMock.session.findUnique.mockResolvedValue({
      id: 'sess_2',
      token: 'deactivated_user_token',
      userId: 'user_2',
      expiresAt: futureDate,
      activeOrganizationId: 'org_1',
      user: {
        id: 'user_2',
        name: 'Disabled User',
        email: 'disabled@acme.io',
        emailVerified: true,
        timezone: 'UTC',
        isSuperAdmin: false,
        isActive: false,
        deletedAt: null,
      },
    });

    const verified = await verifyBetterAuthSession(
      { cookie: 'better-auth.session_token=deactivated_user_token' },
      prismaMock as unknown as PrismaService,
    );

    expect(verified).toBeNull();
  });
});
