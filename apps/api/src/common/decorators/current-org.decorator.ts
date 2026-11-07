import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedOrganizationContext } from '@recruitflow/types';

export const CurrentOrg = createParamDecorator(
  (data: keyof AuthenticatedOrganizationContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const orgContext = request.organizationContext as
      | AuthenticatedOrganizationContext
      | undefined;
    if (!orgContext) {
      return undefined;
    }
    return data ? orgContext[data] : orgContext;
  },
);
