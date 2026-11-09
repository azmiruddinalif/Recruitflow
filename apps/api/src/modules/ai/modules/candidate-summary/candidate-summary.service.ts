import { Injectable, NotFoundException } from '@nestjs/common';
import { aiCandidateSummaryOutputSchema } from '@recruitflow/validation';
import type { AICandidateSummaryResult } from '@recruitflow/types';
import { PrismaService } from '../../../../database/prisma.service';
import { AIFactory } from '../../ai.factory';

@Injectable()
export class CandidateSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiFactory: AIFactory,
  ) {}

  async generateCandidateSummary(params: {
    organizationId: string;
    userId: string;
    candidateId: string;
  }) {
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: params.candidateId, organizationId: params.organizationId, deletedAt: null },
      include: {
        skills: true,
        experiences: true,
        educations: true,
        certifications: true,
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found in this organization.');
    }

    const verifiedProfile = {
      currentTitle: candidate.currentTitle,
      currentCompany: candidate.currentCompany,
      totalExperienceYears: candidate.totalExperienceYears,
      summary: candidate.summary,
      skills: candidate.skills.map((s) => s.name),
      experiences: candidate.experiences.map((e) => ({
        title: e.title,
        company: e.company,
        description: e.description,
      })),
      educations: candidate.educations.map((ed) => ({
        degree: ed.degree,
        fieldOfStudy: ed.fieldOfStudy,
        institution: ed.institution,
      })),
      certifications: candidate.certifications.map((c) => c.name),
    };

    const aiResult = await this.aiFactory.generateStructured<AICandidateSummaryResult>(
      {
        organizationId: params.organizationId,
        userId: params.userId,
        feature: 'CANDIDATE_SUMMARY',
      },
      {
        systemPrompt:
          'You are a recruitment profile summarizer. Produce a concise, factual summary using ONLY the verified candidate data provided. Never invent experience, skills, titles, or credentials not present in the data. List which fields the summary was based on.',
        userPrompt: `Summarize this verified candidate profile:\n${JSON.stringify(verifiedProfile, null, 2)}`,
        schema: aiCandidateSummaryOutputSchema,
        temperature: 0.2,
      },
    );

    return {
      ...aiResult.data,
      candidateId: candidate.id,
      provider: aiResult.provider,
      model: aiResult.model,
    };
  }
}
