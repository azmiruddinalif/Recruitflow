import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ROLE_PERMISSION_MATRIX } from '@recruitflow/shared';
import type {
  AuthenticatedOrganizationContext,
  AuthenticatedUser,
  PermissionCode,
  SystemRoleCode,
} from '@recruitflow/types';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new UnauthorizedException('Authentication is required to access organization resources');
    }

    const headerOrgId = request.headers?.['x-organization-id'];
    const explicitOrgId: string | undefined =
      (typeof headerOrgId === 'string' && headerOrgId.trim() ? headerOrgId.trim() : undefined) ??
      request.session?.activeOrganizationId ??
      user.activeOrganizationId ??
      undefined;

    let targetOrganizationId = explicitOrgId;

    if (!targetOrganizationId) {
      const defaultMembership = await this.prisma.organizationMember.findFirst({
        where: {
          userId: user.id,
          isActive: true,
          organization: {
            isActive: true,
            deletedAt: null,
          },
        },
        orderBy: { joinedAt: 'asc' },
      });

      if (!defaultMembership) {
        throw new BadRequestException(
          'No active organization selected. Provide x-organization-id header or switch active organization.',
        );
      }

      targetOrganizationId = defaultMembership.organizationId;
    }

    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetOrganizationId,
          userId: user.id,
        },
      },
      include: {
        organization: true,
        assignedRole: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!member || !member.isActive) {
      throw new ForbiddenException(
        'You do not have an active membership in the requested organization',
      );
    }

    if (!member.organization || !member.organization.isActive || member.organization.deletedAt) {
      throw new ForbiddenException('The requested organization is inactive or has been deleted');
    }

    const roleCode = (member.roleCode ?? 'RECRUITER') as SystemRoleCode;
    const assignedRolePermissions = member.assignedRole?.permissions?.map(
      (rp) => rp.permission.code as PermissionCode,
    );

    const permissions: PermissionCode[] =
      user.isSuperAdmin
        ? ROLE_PERMISSION_MATRIX.SUPER_ADMIN
        : assignedRolePermissions && assignedRolePermissions.length > 0
          ? assignedRolePermissions
          : ROLE_PERMISSION_MATRIX[roleCode] ?? [];

    const orgContext: AuthenticatedOrganizationContext = {
      organizationId: member.organization.id,
      organizationName: member.organization.name,
      organizationSlug: member.organization.slug,
      memberId: member.id,
      roleCode,
      permissions,
    };

    request.organizationContext = orgContext;
    return true;
  }
}
