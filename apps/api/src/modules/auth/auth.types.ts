import type {
  AuthenticatedOrganizationContext,
  AuthenticatedUser,
  SystemRoleCode,
} from '@recruitflow/types';

export interface SessionInfo {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  activeOrganizationId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface UserOrganizationSummary {
  organizationId: string;
  name: string;
  slug: string;
  logo?: string | null;
  roleCode: SystemRoleCode;
  memberId: string;
}

export interface AuthSessionPayload {
  user: AuthenticatedUser;
  session: SessionInfo;
  token: string;
  organizations: UserOrganizationSummary[];
  activeOrganization: AuthenticatedOrganizationContext | null;
}

export interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  user?: AuthenticatedUser;
  session?: SessionInfo;
  organizationContext?: AuthenticatedOrganizationContext;
}
