import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission } from '@recruitflow/shared';
import type {
  AuthenticatedOrganizationContext,
  AuthenticatedUser,
  PermissionCode,
} from '@recruitflow/types';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    const orgContext = request.organizationContext as
      | AuthenticatedOrganizationContext
      | undefined;

    if (user?.isSuperAdmin) {
      return true;
    }

    if (!orgContext) {
      throw new ForbiddenException(
        'Organization context is required to verify permissions',
      );
    }

    const hasAllRequired = requiredPermissions.every((perm) =>
      hasPermission(orgContext.roleCode, perm, orgContext.permissions),
    );

    if (!hasAllRequired) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
