import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService Unit Tests (Independent Multi-Job Application State)', () => {
  interface InMemoryApplication {
    id: string;
    organizationId: string;
    jobId: string;
    candidateId: string;
    status: string;
    stageOrder: number;
    rejectionReason: string | null;
    hiredAt: Date | null;
    rejectedAt: Date | null;
    withdrawnAt: Date | null;
    deletedAt: Date | null;
    candidate: { id: string; fullName: string; email: string };
    job: { id: string; title: string; department: string; hiringManagerId: string | null };
  }

  let applicationsStore: Map<string, InMemoryApplication>;
  let statusHistories: Array<{
    applicationId: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
  }>;
  let prismaMock: unknown;
  let service: ApplicationsService;

  beforeEach(() => {
    applicationsStore = new Map<string, InMemoryApplication>([
      [
        'app_frontend',
        {
          id: 'app_frontend',
          organizationId: 'org_1',
          jobId: 'job_frontend',
          candidateId: 'cand_shared_1',
          status: 'SCREENING',
          stageOrder: 1,
          rejectionReason: null,
          hiredAt: null,
          rejectedAt: null,
          withdrawnAt: null,
          deletedAt: null,
          candidate: {
            id: 'cand_shared_1',
            fullName: 'Maya Lin',
            email: 'maya@example.com',
          },
          job: {
            id: 'job_frontend',
            title: 'Senior Frontend Engineer',
            department: 'Engineering',
            hiringManagerId: null,
          },
        },
      ],
      [
        'app_fullstack',
        {
          id: 'app_fullstack',
          organizationId: 'org_1',
          jobId: 'job_fullstack',
          candidateId: 'cand_shared_1',
          status: 'INTERVIEW',
          stageOrder: 3,
          rejectionReason: null,
          hiredAt: null,
          rejectedAt: null,
          withdrawnAt: null,
          deletedAt: null,
          candidate: {
            id: 'cand_shared_1',
            fullName: 'Maya Lin',
            email: 'maya@example.com',
          },
          job: {
            id: 'job_fullstack',
            title: 'Staff Full-Stack Engineer',
            department: 'Product Engineering',
            hiringManagerId: null,
          },
        },
      ],
    ]);

    statusHistories = [];

    const txMock = {
      jobApplication: {
        findFirst: vi.fn(async ({ where }: { where: { id: string; organizationId: string } }) => {
          const item = applicationsStore.get(where.id);
          if (!item || item.organizationId !== where.organizationId) return null;
          return { ...item };
        }),
        findUnique: vi.fn(),
        update: vi.fn(
          async ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<InMemoryApplication>;
          }) => {
            const current = applicationsStore.get(where.id);
            if (!current) throw new Error('Application not found');
            const updated: InMemoryApplication = {
              ...current,
              ...data,
            };
            applicationsStore.set(where.id, updated);
            return updated;
          },
        ),
      },
      applicationStatusHistory: {
        create: vi.fn(async ({ data }: { data: (typeof statusHistories)[number] }) => {
          statusHistories.push(data);
          return data;
        }),
      },
      activityLog: {
        create: vi.fn(async ({ data }: { data: unknown }) => data),
      },
    };

    prismaMock = {
      ...txMock,
      $transaction: vi.fn(async (cb: (tx: typeof txMock) => Promise<unknown>) => cb(txMock)),
      job: {
        findFirst: vi.fn(),
      },
      candidate: {
        findFirst: vi.fn(),
      },
    };

    service = new ApplicationsService(prismaMock as PrismaService);
  });

  it('updates one application status (e.g. REJECTED) while leaving another application of the SAME candidate completely untouched', async () => {
    // Reject Maya Lin for Senior Frontend Engineer (app_frontend)
    const updatedFrontendApp = await service.transitionApplicationStatus(
      'org_1',
      'app_frontend',
      'user_recruiter_1',
      {
        status: 'REJECTED',
        reason: 'Role requires deeper WebGL experience',
      },
    );

    expect(updatedFrontendApp.status).toBe('REJECTED');
    expect(updatedFrontendApp.rejectedAt).toBeInstanceOf(Date);
    expect(updatedFrontendApp.rejectionReason).toBe('Role requires deeper WebGL experience');

    // Verify Maya Lin's other application (Staff Full-Stack Engineer) is still in INTERVIEW stage!
    const untouchedFullstackApp = applicationsStore.get('app_fullstack')!;
    expect(untouchedFullstackApp.status).toBe('INTERVIEW');
    expect(untouchedFullstackApp.rejectedAt).toBeNull();
    expect(untouchedFullstackApp.rejectionReason).toBeNull();

    // Verify status history was recorded specifically for app_frontend
    expect(statusHistories).toHaveLength(1);
    expect(statusHistories[0]).toMatchObject({
      applicationId: 'app_frontend',
      fromStatus: 'SCREENING',
      toStatus: 'REJECTED',
    });
  });

  it('persists a same-stage reorder (Kanban drag within a column) without creating a stage transition history entry', async () => {
    const reordered = await service.transitionApplicationStatus(
      'org_1',
      'app_frontend',
      'user_recruiter_1',
      {
        status: 'SCREENING',
        stageOrder: 5,
      },
    );

    expect(reordered.status).toBe('SCREENING');
    expect(reordered.stageOrder).toBe(5);
    expect(statusHistories).toHaveLength(0);
  });

  it('prevents duplicate application of the same candidate to the same job', async () => {
    const mockPrisma = prismaMock as {
      job: { findFirst: ReturnType<typeof vi.fn> };
      candidate: { findFirst: ReturnType<typeof vi.fn> };
      jobApplication: { findUnique: ReturnType<typeof vi.fn> };
    };

    mockPrisma.job.findFirst.mockResolvedValue({
      id: 'job_frontend',
      organizationId: 'org_1',
      title: 'Senior Frontend Engineer',
    });
    mockPrisma.candidate.findFirst.mockResolvedValue({
      id: 'cand_shared_1',
      organizationId: 'org_1',
      fullName: 'Maya Lin',
      resumes: [],
    });
    mockPrisma.jobApplication.findUnique.mockResolvedValue({
      id: 'app_frontend',
      jobId: 'job_frontend',
      candidateId: 'cand_shared_1',
      deletedAt: null,
    });

    await expect(
      service.createApplication('org_1', 'user_recruiter_1', {
        jobId: 'job_frontend',
        candidateId: 'cand_shared_1',
        source: 'DIRECT_APPLY',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
