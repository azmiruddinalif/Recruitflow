import { Injectable, NotFoundException } from '@nestjs/common';
import { aiCandidateMatchOutputSchema } from '@recruitflow/validation';
import type { AICandidateMatchResult } from '@recruitflow/types';
import { PrismaService } from '../../../../database/prisma.service';
import { AIFactory } from '../../ai.factory';

@Injectable()
export class CandidateMatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiFactory: AIFactory,
  ) {}

  async evaluateCandidateForJob(params: {
    organizationId: string;
    userId: string;
    jobId: string;
    candidateId: string;
    applicationId?: string;
  }) {
    const [job, candidate] = await Promise.all([
      this.prisma.job.findFirst({
        where: { id: params.jobId, organizationId: params.organizationId, deletedAt: null },
        include: { skills: true },
      }),
      this.prisma.candidate.findFirst({
        where: { id: params.candidateId, organizationId: params.organizationId, deletedAt: null },
        include: {
          skills: true,
          experiences: true,
          educations: true,
          certifications: true,
        },
      }),
    ]);

    if (!job) throw new NotFoundException('Job not found in this organization.');
    if (!candidate) throw new NotFoundException('Candidate not found in this organization.');

    const requiredSkills = job.skills.filter((s) => s.isRequired).map((s) => s.name);
    const preferredSkills = job.skills.filter((s) => !s.isRequired).map((s) => s.name);

    const promptPayload = {
      job: {
        title: job.title,
        department: job.department,
        experienceLevel: job.experienceLevel,
        minExperienceYears: job.minExperienceYears,
        requiredSkills,
        preferredSkills,
        qualifications: job.qualifications,
        educationRequirement: job.educationRequirement,
      },
      candidate: {
        currentTitle: candidate.currentTitle,
        totalExperienceYears: candidate.totalExperienceYears,
        summary: candidate.summary,
        skills: candidate.skills.map((s) => ({
          name: s.name,
          years: s.yearsOfExperience,
        })),
        experiences: candidate.experiences.map((e) => ({
          title: e.title,
          company: e.company,
          description: e.description,
        })),
        educations: candidate.educations.map((ed) => ({
          degree: ed.degree,
          fieldOfStudy: ed.fieldOfStudy,
        })),
        certifications: candidate.certifications.map((c) => c.name),
      },
    };

    const aiResult = await this.aiFactory.generateStructured<AICandidateMatchResult>(
      {
        organizationId: params.organizationId,
        userId: params.userId,
        feature: 'CANDIDATE_MATCH',
      },
      {
        systemPrompt:
          'You are an objective, explainable recruitment matching engine. Evaluate the candidate strictly on job-relevant skills, work experience, education, and certifications. Never consider or infer protected characteristics (age, gender, race, nationality, etc.). Provide transparent scores (0-100) and actionable interview recommendations.',
        userPrompt: `Evaluate this candidate profile against the job requirements:\n${JSON.stringify(promptPayload, null, 2)}`,
        schema: aiCandidateMatchOutputSchema,
        temperature: 0.1,
      },
    );

    if (params.applicationId) {
      await this.prisma.$transaction([
        this.prisma.aICandidateMatch.upsert({
          where: { applicationId: params.applicationId },
          update: {
            overallScore: aiResult.data.overallScore,
            skillsScore: aiResult.data.skillsScore,
            experienceScore: aiResult.data.experienceScore,
            educationScore: aiResult.data.educationScore,
            matchingSkills: aiResult.data.matchingSkills,
            missingSkills: aiResult.data.missingSkills,
            relevantExperience: aiResult.data.relevantExperience,
            explanation: aiResult.data.explanation,
            recommendations: aiResult.data.recommendations,
            aiProvider: aiResult.provider,
            aiModel: aiResult.model,
            evaluatedAt: new Date(),
          },
          create: {
            organizationId: params.organizationId,
            jobId: job.id,
            applicationId: params.applicationId,
            candidateId: candidate.id,
            overallScore: aiResult.data.overallScore,
            skillsScore: aiResult.data.skillsScore,
            experienceScore: aiResult.data.experienceScore,
            educationScore: aiResult.data.educationScore,
            matchingSkills: aiResult.data.matchingSkills,
            missingSkills: aiResult.data.missingSkills,
            relevantExperience: aiResult.data.relevantExperience,
            explanation: aiResult.data.explanation,
            recommendations: aiResult.data.recommendations,
            aiProvider: aiResult.provider,
            aiModel: aiResult.model,
          },
        }),
        this.prisma.jobApplication.update({
          where: { id: params.applicationId },
          data: { matchScore: aiResult.data.overallScore },
        }),
      ]);
    }

    return {
      ...aiResult.data,
      provider: aiResult.provider,
      model: aiResult.model,
    };
  }
}
