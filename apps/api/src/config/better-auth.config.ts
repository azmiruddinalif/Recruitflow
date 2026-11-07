import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization, twoFactor } from 'better-auth/plugins';
import type { PrismaClient } from '@prisma/client';
import type { AuthenticatedUser } from '@recruitflow/types';

export interface VerifiedSessionResult {
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    activeOrganizationId: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: AuthenticatedUser;
}

export function createBetterAuthInstance(prisma: PrismaClient) {
  return betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
    }),
    secret:
      process.env.BETTER_AUTH_SECRET ??
      'recruitflow-super-secret-better-auth-key-2026-dev',
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
    basePath: '/api/v1/auth',
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
    },
    user: {
      additionalFields: {
        phone: { type: 'string', required: false },
        jobTitle: { type: 'string', required: false },
        timezone: { type: 'string', required: false, defaultValue: 'UTC' },
        isSuperAdmin: { type: 'boolean', required: false, defaultValue: false },
        isActive: { type: 'boolean', required: false, defaultValue: true },
      },
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
      }),
      twoFactor({
        issuer: 'RecruitFlow',
      }),
    ],
  });
}

/**
 * Extracts session token from Authorization Bearer header, x-session-token header,
 * or standard Better Auth / RecruitFlow session cookies.
 */
export function extractSessionToken(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const authHeader = headers['authorization'] ?? headers['Authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  const customHeader = headers['x-session-token'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }

  const cookieHeader = headers['cookie'] ?? headers['Cookie'];
  if (typeof cookieHeader === 'string') {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    const cookieNames = [
      'better-auth.session_token',
      '__Secure-better-auth.session_token',
      'rf_session_token',
      'session_token',
    ];
    for (const cookie of cookies) {
      const eqIdx = cookie.indexOf('=');
      if (eqIdx === -1) continue;
      const name = cookie.slice(0, eqIdx).trim();
      const rawValue = cookie.slice(eqIdx + 1).trim();
      if (cookieNames.includes(name) && rawValue) {
        const decoded = decodeURIComponent(rawValue);
        // Better Auth sometimes signs cookies as `<token>.<signature>`; extract base token or full token
        return decoded;
      }
    }
  }

  return null;
}

/**
 * Verifies a Better Auth session against the database, checking expiration and user active state.
 */
export async function verifyBetterAuthSession(
  headers: Record<string, string | string[] | undefined>,
  prisma: PrismaClient,
): Promise<VerifiedSessionResult | null> {
  const rawToken = extractSessionToken(headers);
  if (!rawToken) {
    return null;
  }

  // Support both exact token and signed cookie format `token.signature`
  const candidateTokens = rawToken.includes('.')
    ? [rawToken, rawToken.split('.')[0]!]
    : [rawToken];

  for (const token of candidateTokens) {
    const sessionRecord = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!sessionRecord) {
      continue;
    }

    if (sessionRecord.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    const { user } = sessionRecord;
    if (!user || !user.isActive || user.deletedAt !== null) {
      return null;
    }

    return {
      session: {
        id: sessionRecord.id,
        token: sessionRecord.token,
        userId: sessionRecord.userId,
        expiresAt: sessionRecord.expiresAt,
        activeOrganizationId: sessionRecord.activeOrganizationId,
        ipAddress: sessionRecord.ipAddress,
        userAgent: sessionRecord.userAgent,
      },
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
        activeOrganizationId: sessionRecord.activeOrganizationId,
      },
    };
  }

  return null;
}
