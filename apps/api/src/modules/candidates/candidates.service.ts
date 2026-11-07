import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { z } from 'zod';
import { buildPaginationMeta } from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import {
  ALLOWED_RESUME_MIME_TYPES,
  IStorageProvider,
  STORAGE_PROVIDER,
} from '../../providers/storage/storage.interface';
import { CandidatesRepository } from './candidates.repository';
import type {
  AddCandidateNoteDto,
  candidateCertificationSchema,
  candidateEducationSchema,
  candidateExperienceSchema,
  candidateSkillSchema,
  CreateCandidateDto,
  ListCandidatesQueryDto,
  UpdateCandidateDto,
  UploadResumePayloadDto,
} from './dto';

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: CandidatesRepository,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: IStorageProvider,
  ) {}

  async listCandidates(organizationId: string, query: ListCandidatesQueryDto) {
    const { items, total } = await this.repository.findManyByOrganization(
      organizationId,
      query,
    );

    return {
      data: items,
      meta: buildPaginationMeta(total, query.page, query.limit),
    };
  }

  async getCandidateById(organizationId: string, candidateId: string) {
    const candidate = await this.repository.findByIdAndOrg(organizationId, candidateId);
    if (!candidate) {
      throw new NotFoundException('Candidate not found in this organization');
    }
    return candidate;
  }

  async createCandidate(
    organizationId: string,
    actorId: string,
    dto: CreateCandidateDto,
  ) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.repository.findByEmailInOrg(
      organizationId,
      normalizedEmail,
    );

    if (existing) {
      throw new ConflictException(
        `A candidate with email "${normalizedEmail}" already exists in this organization`,
      );
    }

    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();

    const candidate = await this.prisma.$transaction(async (tx) => {
      const created = await tx.candidate.create({
        data: {
          organizationId,
          firstName,
          lastName,
          fullName,
          email: normalizedEmail,
          phone: dto.phone ?? null,
          location: dto.location ?? null,
          currentTitle: dto.currentTitle ?? null,
          currentCompany: dto.currentCompany ?? null,
          totalExperienceYears: dto.totalExperienceYears ?? null,
          summary: dto.summary ?? null,
          linkedinUrl: dto.linkedinUrl || null,
          portfolioUrl: dto.portfolioUrl || null,
          githubUrl: dto.githubUrl || null,
          expectedSalaryMin: dto.expectedSalaryMin ?? null,
          expectedSalaryMax: dto.expectedSalaryMax ?? null,
          salaryCurrency: dto.salaryCurrency ?? 'USD',
          noticePeriodDays: dto.noticePeriodDays ?? null,
          source: dto.source ?? 'DIRECT_APPLY',
          tags: dto.tags ?? [],
          languages: dto.languages ?? [],
          createdById: actorId,
          skills:
            dto.skills && dto.skills.length > 0
              ? {
                  create: dto.skills.map((s) => ({
                    name: s.name.trim(),
                    proficiency: s.proficiency ?? null,
                    yearsOfExperience: s.yearsOfExperience ?? null,
                  })),
                }
              : undefined,
          experiences:
            dto.experiences && dto.experiences.length > 0
              ? {
                  create: dto.experiences.map((exp) => ({
                    company: exp.company.trim(),
                    title: exp.title.trim(),
                    location: exp.location ?? null,
                    startDate: exp.startDate ? new Date(exp.startDate) : null,
                    endDate: exp.endDate ? new Date(exp.endDate) : null,
                    isCurrent: exp.isCurrent ?? false,
                    description: exp.description ?? null,
                    highlights: exp.highlights ?? [],
                  })),
                }
              : undefined,
          educations:
            dto.educations && dto.educations.length > 0
              ? {
                  create: dto.educations.map((edu) => ({
                    institution: edu.institution.trim(),
                    degree: edu.degree.trim(),
                    fieldOfStudy: edu.fieldOfStudy ?? null,
                    startDate: edu.startDate ? new Date(edu.startDate) : null,
                    endDate: edu.endDate ? new Date(edu.endDate) : null,
                    grade: edu.grade ?? null,
                  })),
                }
              : undefined,
          certifications:
            dto.certifications && dto.certifications.length > 0
              ? {
                  create: dto.certifications.map((cert) => ({
                    name: cert.name.trim(),
                    issuingOrg: cert.issuingOrg.trim(),
                    issueDate: cert.issueDate ? new Date(cert.issueDate) : null,
                    credentialId: cert.credentialId ?? null,
                    credentialUrl: cert.credentialUrl || null,
                  })),
                }
              : undefined,
        },
        include: {
          skills: true,
          experiences: true,
          educations: true,
          certifications: true,
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId,
          actorId,
          entityType: 'Candidate',
          entityId: created.id,
          action: 'candidate.created',
          description: `Added candidate "${created.fullName}" (${created.email})`,
        },
      });

      return created;
    });

    return candidate;
  }

  async updateCandidate(
    organizationId: string,
    candidateId: string,
    actorId: string,
    dto: UpdateCandidateDto,
  ) {
    const existing = await this.repository.findByIdAndOrg(organizationId, candidateId);
    if (!existing) {
      throw new NotFoundException('Candidate not found in this organization');
    }

    if (dto.email && dto.email.trim().toLowerCase() !== existing.email) {
      const duplicate = await this.repository.findByEmailInOrg(
        organizationId,
        dto.email,
      );
      if (duplicate && duplicate.id !== candidateId) {
        throw new ConflictException(
          `Another candidate with email "${dto.email}" already exists in this organization`,
        );
      }
    }

    const firstName = dto.firstName !== undefined ? dto.firstName.trim() : existing.firstName;
    const lastName = dto.lastName !== undefined ? dto.lastName.trim() : existing.lastName;
    const fullName = `${firstName} ${lastName}`.trim();

    const updated = await this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        firstName,
        lastName,
        fullName,
        ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.currentTitle !== undefined ? { currentTitle: dto.currentTitle } : {}),
        ...(dto.currentCompany !== undefined ? { currentCompany: dto.currentCompany } : {}),
        ...(dto.totalExperienceYears !== undefined
          ? { totalExperienceYears: dto.totalExperienceYears }
          : {}),
        ...(dto.summary !== undefined ? { summary: dto.summary } : {}),
        ...(dto.linkedinUrl !== undefined ? { linkedinUrl: dto.linkedinUrl || null } : {}),
        ...(dto.portfolioUrl !== undefined ? { portfolioUrl: dto.portfolioUrl || null } : {}),
        ...(dto.githubUrl !== undefined ? { githubUrl: dto.githubUrl || null } : {}),
        ...(dto.expectedSalaryMin !== undefined
          ? { expectedSalaryMin: dto.expectedSalaryMin }
          : {}),
        ...(dto.expectedSalaryMax !== undefined
          ? { expectedSalaryMax: dto.expectedSalaryMax }
          : {}),
        ...(dto.salaryCurrency !== undefined ? { salaryCurrency: dto.salaryCurrency } : {}),
        ...(dto.noticePeriodDays !== undefined
          ? { noticePeriodDays: dto.noticePeriodDays }
          : {}),
        ...(dto.source !== undefined ? { source: dto.source } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        ...(dto.languages !== undefined ? { languages: dto.languages } : {}),
      },
      include: {
        skills: true,
        experiences: true,
        educations: true,
        certifications: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        organizationId,
        actorId,
        entityType: 'Candidate',
        entityId: candidateId,
        action: 'candidate.updated',
        description: `Updated candidate "${updated.fullName}"`,
      },
    });

    return updated;
  }

  async softDeleteCandidate(
    organizationId: string,
    candidateId: string,
    actorId: string,
  ) {
    const existing = await this.repository.findByIdAndOrg(organizationId, candidateId);
    if (!existing) {
      throw new NotFoundException('Candidate not found in this organization');
    }

    await this.prisma.$transaction([
      this.prisma.candidate.update({
        where: { id: candidateId },
        data: { deletedAt: new Date() },
      }),
      this.prisma.activityLog.create({
        data: {
          organizationId,
          actorId,
          entityType: 'Candidate',
          entityId: candidateId,
          action: 'candidate.deleted',
          description: `Archived candidate "${existing.fullName}"`,
        },
      }),
    ]);

    return { deleted: true, id: candidateId };
  }

  async addSkill(
    organizationId: string,
    candidateId: string,
    dto: z.infer<typeof candidateSkillSchema>,
  ) {
    await this.getCandidateById(organizationId, candidateId);
    return this.prisma.candidateSkill.upsert({
      where: {
        candidateId_name: {
          candidateId,
          name: dto.name.trim(),
        },
      },
      create: {
        candidateId,
        name: dto.name.trim(),
        proficiency: dto.proficiency ?? null,
        yearsOfExperience: dto.yearsOfExperience ?? null,
      },
      update: {
        proficiency: dto.proficiency ?? null,
        yearsOfExperience: dto.yearsOfExperience ?? null,
      },
    });
  }

  async removeSkill(organizationId: string, candidateId: string, skillId: string) {
    await this.getCandidateById(organizationId, candidateId);
    await this.prisma.candidateSkill.deleteMany({
      where: { id: skillId, candidateId },
    });
    return { removed: true };
  }

  async addExperience(
    organizationId: string,
    candidateId: string,
    dto: z.infer<typeof candidateExperienceSchema>,
  ) {
    await this.getCandidateById(organizationId, candidateId);
    return this.prisma.candidateExperience.create({
      data: {
        candidateId,
        company: dto.company.trim(),
        title: dto.title.trim(),
        location: dto.location ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isCurrent: dto.isCurrent ?? false,
        description: dto.description ?? null,
        highlights: dto.highlights ?? [],
      },
    });
  }

  async removeExperience(
    organizationId: string,
    candidateId: string,
    experienceId: string,
  ) {
    await this.getCandidateById(organizationId, candidateId);
    await this.prisma.candidateExperience.deleteMany({
      where: { id: experienceId, candidateId },
    });
    return { removed: true };
  }

  async addEducation(
    organizationId: string,
    candidateId: string,
    dto: z.infer<typeof candidateEducationSchema>,
  ) {
    await this.getCandidateById(organizationId, candidateId);
    return this.prisma.candidateEducation.create({
      data: {
        candidateId,
        institution: dto.institution.trim(),
        degree: dto.degree.trim(),
        fieldOfStudy: dto.fieldOfStudy ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        grade: dto.grade ?? null,
      },
    });
  }

  async removeEducation(
    organizationId: string,
    candidateId: string,
    educationId: string,
  ) {
    await this.getCandidateById(organizationId, candidateId);
    await this.prisma.candidateEducation.deleteMany({
      where: { id: educationId, candidateId },
    });
    return { removed: true };
  }

  async addCertification(
    organizationId: string,
    candidateId: string,
    dto: z.infer<typeof candidateCertificationSchema>,
  ) {
    await this.getCandidateById(organizationId, candidateId);
    return this.prisma.candidateCertification.create({
      data: {
        candidateId,
        name: dto.name.trim(),
        issuingOrg: dto.issuingOrg.trim(),
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        credentialId: dto.credentialId ?? null,
        credentialUrl: dto.credentialUrl || null,
      },
    });
  }

  async addNote(
    organizationId: string,
    candidateId: string,
    authorId: string,
    dto: AddCandidateNoteDto,
  ) {
    await this.getCandidateById(organizationId, candidateId);
    return this.prisma.candidateNote.create({
      data: {
        candidateId,
        authorId,
        content: dto.content.trim(),
        isPrivate: dto.isPrivate ?? false,
      },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
      },
    });
  }

  async uploadResume(
    organizationId: string,
    candidateId: string,
    actorId: string,
    payload: UploadResumePayloadDto,
  ) {
    const candidate = await this.getCandidateById(organizationId, candidateId);

    const buffer = payload.contentBase64
      ? Buffer.from(payload.contentBase64, 'base64')
      : Buffer.from(
          payload.extractedText ??
            `Resume for ${candidate.fullName} (${candidate.email})`,
          'utf-8',
        );

    const stored = await this.storageProvider.uploadFile({
      organizationId,
      folder: 'resumes',
      originalName: payload.fileName,
      mimeType: payload.mimeType,
      buffer,
      allowedMimeTypes: ALLOWED_RESUME_MIME_TYPES,
    });

    if (payload.isPrimary) {
      await this.prisma.candidateResume.updateMany({
        where: { candidateId },
        data: { isPrimary: false },
      });
    }

    const resume = await this.prisma.candidateResume.create({
      data: {
        organizationId,
        candidateId,
        fileName: stored.fileName,
        fileKey: stored.fileKey,
        fileUrl: stored.fileUrl,
        mimeType: stored.mimeType,
        fileSizeBytes: stored.fileSizeBytes,
        extractedText: payload.extractedText ?? null,
        parseStatus: payload.extractedText ? 'PENDING_REVIEW' : 'UPLOADED',
        isPrimary: payload.isPrimary ?? true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        organizationId,
        actorId,
        entityType: 'CandidateResume',
        entityId: resume.id,
        action: 'candidate.resume_uploaded',
        description: `Uploaded resume "${resume.fileName}" for ${candidate.fullName}`,
      },
    });

    return resume;
  }
}
