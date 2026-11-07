import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { aiParsedResumeSchema } from '@recruitflow/validation';
import type { ParsedResumeData } from '@recruitflow/types';
import { PrismaService } from '../../../../database/prisma.service';
import { AIFactory } from '../../ai.factory';

@Injectable()
export class ResumeParserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiFactory: AIFactory,
  ) {}

  async parseResumeText(params: {
    organizationId: string;
    userId: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    rawText: string;
    candidateId?: string;
  }) {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (!allowedMimes.includes(params.mimeType)) {
      throw new BadRequestException('Unsupported resume format. Only PDF and DOCX files are permitted.');
    }
    if (params.fileSizeBytes > 10 * 1024 * 1024) {
      throw new BadRequestException('Resume file size exceeds the 10MB limit.');
    }
    if (!params.rawText || params.rawText.trim().length < 20) {
      throw new BadRequestException('Extracted resume text is too short or unreadable.');
    }

    const resumeRecord = await this.prisma.candidateResume.create({
      data: {
        organizationId: params.organizationId,
        candidateId: params.candidateId ?? null,
        fileName: params.fileName,
        fileKey: `${params.organizationId}/resumes/${Date.now()}-${params.fileName}`,
        mimeType: params.mimeType,
        fileSizeBytes: params.fileSizeBytes,
        extractedText: params.rawText,
        parseStatus: 'PROCESSING',
      },
    });

    try {
      const aiResult = await this.aiFactory.generateStructured<ParsedResumeData>(
        {
          organizationId: params.organizationId,
          userId: params.userId,
          feature: 'RESUME_PARSE',
        },
        {
          systemPrompt:
            'You are an expert technical recruiter AI. Extract structured candidate resume information accurately into JSON. Never invent experience, degrees, or skills not present in the resume text.',
          userPrompt: `Extract the structured candidate profile from the following resume text:\n\n${params.rawText.slice(0, 15000)}`,
          schema: aiParsedResumeSchema,
          temperature: 0.1,
        },
      );

      const updated = await this.prisma.candidateResume.update({
        where: { id: resumeRecord.id },
        data: {
          parsedDataJson: aiResult.data as object,
          parseStatus: 'PENDING_REVIEW',
          aiProviderUsed: aiResult.provider,
          aiModelUsed: aiResult.model,
          parsedAt: new Date(),
        },
      });

      return {
        resumeId: updated.id,
        parseStatus: updated.parseStatus,
        extractedData: aiResult.data,
        provider: aiResult.provider,
        model: aiResult.model,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Resume parsing failed';
      await this.prisma.candidateResume.update({
        where: { id: resumeRecord.id },
        data: {
          parseStatus: 'FAILED',
          parseError: message,
        },
      });
      throw error;
    }
  }

  async approveParsedResume(params: {
    organizationId: string;
    userId: string;
    resumeId: string;
    approvedData: ParsedResumeData;
  }) {
    const resume = await this.prisma.candidateResume.findFirst({
      where: {
        id: params.resumeId,
        organizationId: params.organizationId,
      },
    });

    if (!resume) {
      throw new NotFoundException('Resume record not found in this organization.');
    }

    const validated = aiParsedResumeSchema.parse(params.approvedData);

    return this.prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.upsert({
        where: {
          organizationId_email: {
            organizationId: params.organizationId,
            email: validated.email.toLowerCase(),
          },
        },
        update: {
          firstName: validated.firstName,
          lastName: validated.lastName,
          fullName: validated.fullName || `${validated.firstName} ${validated.lastName}`.trim(),
          phone: validated.phone || undefined,
          location: validated.location || undefined,
          currentTitle: validated.currentTitle || undefined,
          currentCompany: validated.currentCompany || undefined,
          totalExperienceYears: validated.totalExperienceYears ?? undefined,
          summary: validated.summary || undefined,
          languages: validated.languages ?? [],
          deletedAt: null,
        },
        create: {
          organizationId: params.organizationId,
          firstName: validated.firstName,
          lastName: validated.lastName,
          fullName: validated.fullName || `${validated.firstName} ${validated.lastName}`.trim(),
          email: validated.email.toLowerCase(),
          phone: validated.phone || null,
          location: validated.location || null,
          currentTitle: validated.currentTitle || null,
          currentCompany: validated.currentCompany || null,
          totalExperienceYears: validated.totalExperienceYears ?? 0,
          summary: validated.summary || null,
          source: 'AI_RESUME_IMPORT',
          languages: validated.languages ?? [],
          createdById: params.userId,
        },
      });

      if (validated.skills.length > 0) {
        await tx.candidateSkill.deleteMany({ where: { candidateId: candidate.id } });
        await tx.candidateSkill.createMany({
          data: validated.skills.map((s) => ({
            candidateId: candidate.id,
            name: s.name,
            proficiency: s.proficiency ?? 'Intermediate',
            yearsOfExperience: s.yearsOfExperience ?? null,
            isVerified: true,
          })),
          skipDuplicates: true,
        });
      }

      await tx.candidateResume.update({
        where: { id: resume.id },
        data: {
          candidateId: candidate.id,
          parsedDataJson: validated as object,
          parseStatus: 'APPROVED',
          approvedAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          organizationId: params.organizationId,
          actorId: params.userId,
          entityType: 'CANDIDATE',
          entityId: candidate.id,
          action: 'AI_RESUME_APPROVED',
          description: `Approved AI-parsed resume and saved candidate profile for ${candidate.fullName}`,
        },
      });

      return candidate;
    });
  }
}
