import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { ListCandidatesQueryDto } from './dto';

@Injectable()
export class CandidatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyByOrganization(
    organizationId: string,
    query: ListCandidatesQueryDto,
  ) {
    const where: Prisma.CandidateWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { currentTitle: { contains: term, mode: 'insensitive' } },
        { currentCompany: { contains: term, mode: 'insensitive' } },
        { skills: { some: { name: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.location && query.location.trim()) {
      where.location = { contains: query.location.trim(), mode: 'insensitive' };
    }

    if (query.skill && query.skill.trim()) {
      where.skills = {
        some: {
          name: { contains: query.skill.trim(), mode: 'insensitive' },
        },
      };
    }

    if (query.tag && query.tag.trim()) {
      where.tags = { has: query.tag.trim() };
    }

    if (query.minExperience !== undefined || query.maxExperience !== undefined) {
      where.totalExperienceYears = {
        ...(query.minExperience !== undefined ? { gte: query.minExperience } : {}),
        ...(query.maxExperience !== undefined ? { lte: query.maxExperience } : {}),
      };
    }

    const skip = (query.page - 1) * query.limit;

    const [items, total] = await Promise.all([
      this.prisma.candidate.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { [query.sortBy]: query.sortOrder },
        include: {
          skills: true,
          resumes: {
            where: { isPrimary: true },
            take: 1,
          },
          _count: {
            select: {
              applications: { where: { deletedAt: null } },
              notes: true,
            },
          },
        },
      }),
      this.prisma.candidate.count({ where }),
    ]);

    return { items, total };
  }

  async findByIdAndOrg(organizationId: string, candidateId: string) {
    return this.prisma.candidate.findFirst({
      where: {
        id: candidateId,
        organizationId,
        deletedAt: null,
      },
      include: {
        skills: { orderBy: { name: 'asc' } },
        experiences: { orderBy: { startDate: 'desc' } },
        educations: { orderBy: { startDate: 'desc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
        resumes: { orderBy: { createdAt: 'desc' } },
        attachments: { orderBy: { createdAt: 'desc' } },
        notes: {
          include: {
            author: { select: { id: true, name: true, email: true, image: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        applications: {
          where: { deletedAt: null },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                department: true,
                location: true,
                status: true,
              },
            },
            aiMatch: true,
          },
          orderBy: { appliedAt: 'desc' },
        },
      },
    });
  }

  async findByEmailInOrg(organizationId: string, email: string) {
    return this.prisma.candidate.findFirst({
      where: {
        organizationId,
        email: email.trim().toLowerCase(),
        deletedAt: null,
      },
    });
  }
}
