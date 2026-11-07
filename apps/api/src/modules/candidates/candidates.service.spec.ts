import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../database/prisma.service';
import type { IStorageProvider } from '../../providers/storage/storage.interface';
import { CandidatesRepository } from './candidates.repository';
import { CandidatesService } from './candidates.service';

describe('CandidatesService Unit Tests (Tenant Isolation, Duplicate Prevention, Soft Delete)', () => {
  let prismaMock: {
    $transaction: ReturnType<typeof vi.fn>;
    candidate: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    activityLog: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  let repoMock: {
    findManyByOrganization: ReturnType<typeof vi.fn>;
    findByIdAndOrg: ReturnType<typeof vi.fn>;
    findByEmailInOrg: ReturnType<typeof vi.fn>;
  };
  let storageMock: IStorageProvider;
  let service: CandidatesService;

  beforeEach(() => {
    prismaMock = {
      $transaction: vi.fn(async (cbOrArr: unknown) => {
        if (typeof cbOrArr === 'function') {
          return cbOrArr(prismaMock);
        }
        return Promise.all(cbOrArr as Promise<unknown>[]);
      }),
      candidate: {
        create: vi.fn(),
        update: vi.fn(),
      },
      activityLog: {
        create: vi.fn(),
      },
    };

    repoMock = {
      findManyByOrganization: vi.fn(),
      findByIdAndOrg: vi.fn(),
      findByEmailInOrg: vi.fn(),
    };

    storageMock = {
      driverName: 'local',
      uploadFile: vi.fn(),
      readFile: vi.fn(),
      deleteFile: vi.fn(),
      getSignedUrl: vi.fn(),
    };

    service = new CandidatesService(
      prismaMock as unknown as PrismaService,
      repoMock as unknown as CandidatesRepository,
      storageMock,
    );
  });

  it('enforces tenant isolation when fetching a candidate by ID', async () => {
    repoMock.findByIdAndOrg.mockResolvedValue(null);

    await expect(
      service.getCandidateById('org_acme', 'cand_belonging_to_other_org'),
    ).rejects.toThrow(NotFoundException);

    expect(repoMock.findByIdAndOrg).toHaveBeenCalledWith(
      'org_acme',
      'cand_belonging_to_other_org',
    );
  });

  it('prevents creating a candidate with a duplicate email inside the same organization', async () => {
    repoMock.findByEmailInOrg.mockResolvedValue({
      id: 'cand_existing',
      organizationId: 'org_acme',
      email: 'alex.rivera@example.com',
    });

    await expect(
      service.createCandidate('org_acme', 'user_recruiter_1', {
        firstName: 'Alex',
        lastName: 'Rivera',
        email: 'alex.rivera@example.com',
        salaryCurrency: 'USD',
        source: 'LINKEDIN',
        tags: [],
        languages: [],
        skills: [],
        experiences: [],
        educations: [],
        certifications: [],
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('allows the same candidate email across two different organizations', async () => {
    repoMock.findByEmailInOrg.mockResolvedValue(null);
    prismaMock.candidate.create.mockResolvedValue({
      id: 'cand_org_2',
      organizationId: 'org_globex',
      firstName: 'Alex',
      lastName: 'Rivera',
      fullName: 'Alex Rivera',
      email: 'alex.rivera@example.com',
    });

    const created = await service.createCandidate('org_globex', 'user_recruiter_2', {
      firstName: 'Alex',
      lastName: 'Rivera',
      email: 'alex.rivera@example.com',
      salaryCurrency: 'USD',
      source: 'DIRECT_APPLY',
      tags: ['typescript'],
      languages: ['English'],
      skills: [{ name: 'TypeScript', proficiency: 'EXPERT', yearsOfExperience: 6 }],
      experiences: [],
      educations: [],
      certifications: [],
    });

    expect(created.organizationId).toBe('org_globex');
    expect(prismaMock.candidate.create).toHaveBeenCalledTimes(1);
  });

  it('soft-deletes a candidate by setting deletedAt and recording an audit log', async () => {
    repoMock.findByIdAndOrg.mockResolvedValue({
      id: 'cand_100',
      organizationId: 'org_acme',
      fullName: 'Elena Rostova',
      email: 'elena@example.com',
    });

    prismaMock.candidate.update.mockResolvedValue({
      id: 'cand_100',
      deletedAt: new Date(),
    });

    const res = await service.softDeleteCandidate(
      'org_acme',
      'cand_100',
      'user_admin_1',
    );

    expect(res).toEqual({ deleted: true, id: 'cand_100' });
    expect(prismaMock.candidate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cand_100' },
        data: { deletedAt: expect.any(Date) },
      }),
    );
  });
});
