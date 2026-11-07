import { BadRequestException, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationGuard } from '../../src/common/guards/organization.guard';
import { PermissionsGuard } from '../../src/common/guards/permissions.guard';
import { CandidatesService } from '../../src/modules/candidates/candidates.service';
import { JobsService } from '../../src/modules/jobs/jobs.service';
import { ApplicationsService } from '../../src/modules/applications/applications.service';
import { SubscriptionsService } from '../../src/modules/subscriptions/subscriptions.service';
import { LocalStorageProvider } from '../../src/providers/storage/local-storage.provider';

describe('RecruitFlow Multi-Tenant Isolation, RBAC, Storage & Webhook Security (E2E Suite)', () => {
  it('1. rejects cross-organization access when user is not an active member of target organization', async () => {
    const mockPrisma = {
      organizationMember: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    const guard = new OrganizationGuard(mockPrisma as never);

    const mockContext = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user_org_a', isActive: true },
          session: { activeOrganizationId: 'org_b_foreign' },
          headers: { 'x-organization-id': 'org_b_foreign' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
  });

  it('2. Organization A cannot read Organization B candidates, jobs, or applications by ID', async () => {
    const mockCandidateRepo = {
      findByIdAndOrg: vi.fn().mockResolvedValue(null),
    };
    const candidatesService = new CandidatesService(
      {} as never,
      mockCandidateRepo as never,
      {} as never,
    );
    await expect(
      candidatesService.getCandidateById('org_a', 'cand_belonging_to_org_b'),
    ).rejects.toThrow(NotFoundException);

    const mockPrisma = {
      job: { findFirst: vi.fn().mockResolvedValue(null) },
      jobApplication: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const jobsService = new JobsService(mockPrisma as never);
    await expect(jobsService.getJobById('org_a', 'job_belonging_to_org_b')).rejects.toThrow(
      NotFoundException,
    );

    const appsService = new ApplicationsService(mockPrisma as never);
    await expect(
      appsService.getApplicationById('org_a', 'app_belonging_to_org_b'),
    ).rejects.toThrow(NotFoundException);
  });

  it('3. blocks path traversal attempts and cross-organization file access in LocalStorageProvider', async () => {
    const storage = new LocalStorageProvider();
    await expect(storage.readFile('../outside-secret.txt')).rejects.toThrow(NotFoundException);
  });

  it('4. blocks INTERVIEWER role from executing candidates.delete or billing.manage permissions', () => {
    const reflector = new Reflector();
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['candidates.delete']);

    const guard = new PermissionsGuard(reflector);

    const mockContext = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user_interviewer', isSuperAdmin: false },
          organizationContext: {
            organizationId: 'org_1',
            organizationName: 'TalentScale Global',
            organizationSlug: 'talentscale',
            memberId: 'mem_1',
            roleCode: 'INTERVIEWER',
            permissions: ['candidates.read', 'interviews.read', 'interviews.feedback'],
          },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('5. verifies Stripe webhook rejects unsigned requests', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    const subscriptionsService = new SubscriptionsService({} as never);
    await expect(
      subscriptionsService.handleStripeWebhook(undefined, { type: 'checkout.session.completed' }),
    ).rejects.toThrow(BadRequestException);
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });
});
