import { Injectable } from '@nestjs/common';
import { aiEmailDraftOutputSchema } from '@recruitflow/validation';
import type { AIEmailDraftResult } from '@recruitflow/types';
import { AIFactory } from '../../ai.factory';

@Injectable()
export class EmailAssistantService {
  constructor(private readonly aiFactory: AIFactory) {}

  async generateEmailDraft(params: {
    organizationId: string;
    userId: string;
    purpose: 'INTERVIEW_INVITE' | 'STATUS_UPDATE' | 'FOLLOW_UP' | 'OFFER' | 'REJECTION';
    candidateName: string;
    jobTitle: string;
    companyName: string;
    tone?: string;
    additionalContext?: string;
  }) {
    const result = await this.aiFactory.generateStructured<AIEmailDraftResult>(
      {
        organizationId: params.organizationId,
        userId: params.userId,
        feature: 'EMAIL_ASSISTANT',
      },
      {
        systemPrompt:
          'You are an empathetic, professional recruitment communications specialist. Draft editable email templates for hiring teams.',
        userPrompt: `Generate a recruitment email draft:
Purpose: ${params.purpose}
Candidate Name: ${params.candidateName}
Job Title: ${params.jobTitle}
Organization: ${params.companyName}
Tone: ${params.tone || 'Warm & Professional'}
Additional Context: ${params.additionalContext || 'None'}`,
        schema: aiEmailDraftOutputSchema,
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
