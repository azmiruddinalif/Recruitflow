import { Injectable } from '@nestjs/common';
import { aiInterviewQuestionsOutputSchema } from '@recruitflow/validation';
import type { AIInterviewQuestionsResult } from '@recruitflow/types';
import { AIFactory } from '../../ai.factory';

@Injectable()
export class InterviewAssistantService {
  constructor(private readonly aiFactory: AIFactory) {}

  async generateInterviewQuestions(params: {
    organizationId: string;
    userId: string;
    jobTitle: string;
    experienceLevel: string;
    skills: string[];
    interviewType?: string;
  }) {
    const result = await this.aiFactory.generateStructured<AIInterviewQuestionsResult>(
      {
        organizationId: params.organizationId,
        userId: params.userId,
        feature: 'INTERVIEW_ASSISTANT',
      },
      {
        systemPrompt:
          'You are a structured hiring assessment architect. Generate behavioral, technical, role-specific, and problem-solving interview questions with clear evaluation criteria and scorecard rubrics.',
        userPrompt: `Create a structured interview question bank and scorecard rubric for:
Job Title: ${params.jobTitle}
Experience Level: ${params.experienceLevel}
Interview Type: ${params.interviewType || 'TECHNICAL'}
Key Skills: ${params.skills.join(', ')}`,
        schema: aiInterviewQuestionsOutputSchema,
        temperature: 0.3,
      },
    );

    return {
      ...result.data,
      provider: result.provider,
      model: result.model,
    };
  }

  async summarizeInterviewNotes(params: {
    organizationId: string;
    userId: string;
    rawNotes: string;
    jobTitle: string;
  }) {
    const result = await this.aiFactory.generateText(
      {
        organizationId: params.organizationId,
        userId: params.userId,
        feature: 'INTERVIEW_ASSISTANT',
      },
      {
        systemPrompt:
          'Summarize interviewer notes concisely into Key Strengths, Areas of Concern, and Follow-Up Topics. CRITICAL: Do NOT invent any facts about the candidate that are not explicitly stated in the provided notes.',
        userPrompt: `Job Title: ${params.jobTitle}\nInterviewer Notes:\n${params.rawNotes}`,
        temperature: 0.2,
      },
    );

    return {
      summary: result.data,
      provider: result.provider,
      model: result.model,
    };
  }
}
