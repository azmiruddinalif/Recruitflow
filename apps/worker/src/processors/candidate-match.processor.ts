import { Job as BullJob } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { aiCandidateMatchOutputSchema } from '@recruitflow/validation';
import { CandidateMatchJobData } from '../queues/queue.constants';
import { invokeProviderJson, resolveConfiguredProvider } from './resume-parse.processor';

export async function processCandidateMatchJob(
  job: BullJob<CandidateMatchJobData>,
  prisma: PrismaClient,
): Promise<{ applicationId: string; overallScore: number }> {
  const { organizationId, applicationId, jobId, candidateId, userId } = job.data;
  const startTime = Date.now();

  const [application, jobRecord, candidate] = await Promise.all([
    prisma.jobApplication.findFirst({
      where: { id: applicationId, organizationId },
    }),
    prisma.job.findFirst({
      where: { id: jobId, organizationId },
      include: { skills: true },
    }),
    prisma.candidate.findFirst({
      where: { id: candidateId, organizationId },
      include: {
        skills: true,
        experiences: true,
        educations: true,
        certifications: true,
      },
    }),
  ]);

  if (!application || !jobRecord || !candidate) {
    throw new Error('Application, Job, or Candidate not found for matching');
  }

  const configuredProvider = await resolveConfiguredProvider(prisma, organizationId);
  if (!configuredProvider) {
    throw new Error(
      'AI_PROVIDER_NOT_CONFIGURED: Cannot run candidate matching without a configured AI provider.',
    );
  }

  const systemPrompt =
    'You are an objective, unbiased recruitment evaluation assistant. Evaluate candidate skills, experience, education, and certifications strictly against job requirements. Exclude all demographic or protected characteristics. Never auto-reject or auto-advance candidates.';

  const userPrompt = JSON.stringify({
    job: {
      title: jobRecord.title,
      department: jobRecord.department,
      experienceLevel: jobRecord.experienceLevel,
      minExperienceYears: jobRecord.minExperienceYears,
      description: jobRecord.description,
      responsibilities: jobRecord.responsibilities,
      qualifications: jobRecord.qualifications,
      educationRequirement: jobRecord.educationRequirement,
      skills: jobRecord.skills.map((s) => ({
        name: s.name,
        isRequired: s.isRequired,
        weight: s.weight,
      })),
    },
    candidate: {
      currentTitle: candidate.currentTitle,
      totalExperienceYears: candidate.totalExperienceYears,
      summary: candidate.summary,
      skills: candidate.skills.map((s) => ({
        name: s.name,
        proficiency: s.proficiency,
        yearsOfExperience: s.yearsOfExperience,
      })),
      experiences: candidate.experiences.map((e) => ({
        title: e.title,
        company: e.company,
        description: e.description,
        highlights: e.highlights,
      })),
      educations: candidate.educations.map((ed) => ({
        degree: ed.degree,
        fieldOfStudy: ed.fieldOfStudy,
      })),
      certifications: candidate.certifications.map((c) => ({
        name: c.name,
        issuingOrg: c.issuingOrg,
      })),
    },
  });

  const aiResponse = await invokeProviderJson(configuredProvider, systemPrompt, userPrompt);
  const validated = aiCandidateMatchOutputSchema.parse(JSON.parse(aiResponse.rawJson));
  const latencyMs = Date.now() - startTime;

  await prisma.$transaction([
    prisma.aICandidateMatch.upsert({
      where: { applicationId },
      create: {
        organizationId,
        jobId,
        applicationId,
        candidateId,
        overallScore: validated.overallScore,
        skillsScore: validated.skillsScore,
        experienceScore: validated.experienceScore,
        educationScore: validated.educationScore,
        matchingSkills: validated.matchingSkills,
        missingSkills: validated.missingSkills,
        relevantExperience: validated.relevantExperience,
        explanation: validated.explanation,
        recommendations: validated.recommendations,
        aiProvider: configuredProvider.provider,
        aiModel: configuredProvider.model,
      },
      update: {
        overallScore: validated.overallScore,
        skillsScore: validated.skillsScore,
        experienceScore: validated.experienceScore,
        educationScore: validated.educationScore,
        matchingSkills: validated.matchingSkills,
        missingSkills: validated.missingSkills,
        relevantExperience: validated.relevantExperience,
        explanation: validated.explanation,
        recommendations: validated.recommendations,
        aiProvider: configuredProvider.provider,
        aiModel: configuredProvider.model,
        evaluatedAt: new Date(),
      },
    }),
    prisma.jobApplication.update({
      where: { id: applicationId },
      data: { matchScore: validated.overallScore },
    }),
    prisma.aIUsageLog.create({
      data: {
        organizationId,
        userId: userId ?? null,
        provider: configuredProvider.provider,
        model: configuredProvider.model,
        feature: 'CANDIDATE_MATCH',
        promptTokens: aiResponse.promptTokens,
        completionTokens: aiResponse.completionTokens,
        totalTokens: aiResponse.totalTokens,
        estimatedCostUsd: Number(((aiResponse.totalTokens / 1000) * 0.002).toFixed(6)),
        latencyMs,
        success: true,
      },
    }),
  ]);

  return { applicationId, overallScore: validated.overallScore };
}
