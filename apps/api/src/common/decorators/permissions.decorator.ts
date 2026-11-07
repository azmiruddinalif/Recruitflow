import { SetMetadata } from '@nestjs/common';
import type { PermissionCode } from '@recruitflow/types';

export const PERMISSIONS_KEY = 'recruitflow:required_permissions';

export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
