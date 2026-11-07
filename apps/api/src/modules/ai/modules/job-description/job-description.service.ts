import { Injectable } from '@nestjs/common';
import { aiJobDescriptionOutputSchema } from '@recruitflow/validation';
import type { AIJobDescriptionResult } from '@recruitflow/types';
import { AIFactory } from '../../ai.factory';

@Injectable()
export class JobDescriptionService {
  constructor(private readonly aiFactory: AIFactory) {}

  async generateJobDescription(params: {
    organizationId: string;
    userId: string;
    title: string;
    department: string;
    experienceLevel: string;
    employmentType?: string;
    workLocationType?: string;
    tone?: string;
    requiredSkills: string[];
    preferredSkills?: string[];
  }) {
    const result = await this.aiFactory.generateStructured<AIJobDescriptionResult>(
      {
        organizationId: params.organizationId,
        userId: params.userId,
        feature: 'JOB_DESCRIPTION',
      },
      {
        systemPrompt:
          'You are an executive talent acquisition specialist. Generate clear, inclusive, high-converting B2B job descriptions structured into summary, description, responsibilities, qualifications, skills, and benefits.',
        userPrompt: `Generate a structured job description for:
Title: ${params.title}
Department: ${params.department}
Experience Level: ${params.experienceLevel}
Employment Type: ${params.employmentType || 'FULL_TIME'}
Work Location: ${params.workLocationType || 'HYBRID'}
Tone: ${params.tone || 'Professional & Engaging'}
Required Skills: ${params.requiredSkills.join(', ')}
Preferred Skills: ${(params.preferredSkills || []).join(', ')}`,
        schema: aiJobDescriptionOutputSchema,
        temperature: 0.4,
      },
    );

    return {
      ...result.data,
      provider: result.provider,
      model: result.model,
    };
  }
}
