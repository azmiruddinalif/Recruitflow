import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AIFactory } from './ai.factory';
import { ResumeParserService } from './modules/resume-parser/resume-parser.service';

describe('AIFactory & ResumeParser — Comprehensive AI Failure & Validation Suite', () => {
  const sampleSchema = z.object({
    title: z.string(),
    score: z.number(),
  });

  const createMockDependencies = () => {
    const mockPrisma = {
      organizationSettings: {
        findUnique: vi.fn().mockResolvedValue({ defaultAIProvider: 'OPENAI' }),
      },
      aIProvider: {
        findMany: vi.fn().mockResolvedValue([
          {
            organizationId: 'org_1',
            provider: 'OPENAI',
            apiKeyEncrypted: 'sk-valid-test-key',
            defaultModel: 'gpt-4o-mini',
            isEnabled: true,
            timeoutMs: 5000,
            maxRetries: 1,
          },
        ]),
      },
      candidateResume: {
        create: vi.fn().mockResolvedValue({ id: 'res_1', parseStatus: 'PROCESSING' }),
        update: vi.fn().mockResolvedValue({ id: 'res_1', parseStatus: 'PENDING_REVIEW' }),
      },
    };
    const mockUsageService = {
      verifyQuotaAvailable: vi.fn().mockResolvedValue(undefined),
      logUsage: vi.fn().mockResolvedValue(undefined),
    };
    return { mockPrisma, mockUsageService };
  };

  it('1. handles valid AI structured response and logs token usage', async () => {
    const { mockPrisma, mockUsageService } = createMockDependencies();
    const mockOpenAI = {
      providerType: 'OPENAI' as const,
      generateStructured: vi.fn().mockResolvedValue({
        data: { title: 'Principal Engineer', score: 95 },
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
        promptTokens: 120,
        completionTokens: 45,
        totalTokens: 165,
        latencyMs: 310,
        estimatedCostUsd: 0.0002,
      }),
      generateText: vi.fn(),
    };

    const factory = new AIFactory(
      mockPrisma as never,
      mockUsageService as never,
      mockOpenAI as never,
      {} as never,
      {} as never,
    );

    const res = await factory.generateStructured(
      { organizationId: 'org_1', userId: 'usr_1', feature: 'CANDIDATE_MATCH' },
      { systemPrompt: 'sys', userPrompt: 'usr', schema: sampleSchema },
    );

    expect(res.data.score).toBe(95);
    expect(mockUsageService.logUsage).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, totalTokens: 165 }),
    );
  });

  it('2. fails gracefully and logs error on invalid JSON / schema mismatch from AI provider', async () => {
    const { mockPrisma, mockUsageService } = createMockDependencies();
    const mockOpenAI = {
      providerType: 'OPENAI' as const,
      generateStructured: vi
        .fn()
        .mockRejectedValue(new BadRequestException('AI response failed JSON schema validation')),
      generateText: vi.fn(),
    };

    const factory = new AIFactory(
      mockPrisma as never,
      mockUsageService as never,
      mockOpenAI as never,
      {} as never,
      {} as never,
    );

    await expect(
      factory.generateStructured(
        { organizationId: 'org_1', feature: 'CANDIDATE_MATCH' },
        { systemPrompt: 'sys', userPrompt: 'usr', schema: sampleSchema },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(mockUsageService.logUsage).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it('3. fails gracefully on empty AI response', async () => {
    const { mockPrisma, mockUsageService } = createMockDependencies();
    const mockOpenAI = {
      providerType: 'OPENAI' as const,
      generateStructured: vi
        .fn()
        .mockRejectedValue(new ServiceUnavailableException('Empty completion payload received')),
      generateText: vi.fn(),
    };

    const factory = new AIFactory(
      mockPrisma as never,
      mockUsageService as never,
      mockOpenAI as never,
      {} as never,
      {} as never,
    );

    await expect(
      factory.generateStructured(
        { organizationId: 'org_1', feature: 'JOB_DESCRIPTION' },
        { systemPrompt: 'sys', userPrompt: 'usr', schema: sampleSchema },
      ),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('4. fails gracefully on provider request timeout', async () => {
    const { mockPrisma, mockUsageService } = createMockDependencies();
    const mockOpenAI = {
      providerType: 'OPENAI' as const,
      generateStructured: vi
        .fn()
        .mockRejectedValue(new ServiceUnavailableException('AI provider request timed out after 30000ms')),
      generateText: vi.fn(),
    };

    const factory = new AIFactory(
      mockPrisma as never,
      mockUsageService as never,
      mockOpenAI as never,
      {} as never,
      {} as never,
    );

    await expect(
      factory.generateStructured(
        { organizationId: 'org_1', feature: 'INTERVIEW_ASSISTANT' },
        { systemPrompt: 'sys', userPrompt: 'usr', schema: sampleSchema },
      ),
    ).rejects.toThrow(/timed out/);
  });

  it('5. throws AI_PROVIDER_NOT_CONFIGURED when no API key is configured', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    const mockPrisma = {
      organizationSettings: { findUnique: vi.fn().mockResolvedValue(null) },
      aIProvider: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const mockUsageService = {
      verifyQuotaAvailable: vi.fn().mockResolvedValue(undefined),
      logUsage: vi.fn().mockResolvedValue(undefined),
    };

    const factory = new AIFactory(
      mockPrisma as never,
      mockUsageService as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(factory.resolveProviderConfig('org_1')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('6. handles provider rate limit (HTTP 429) gracefully', async () => {
    const { mockPrisma, mockUsageService } = createMockDependencies();
    const mockOpenAI = {
      providerType: 'OPENAI' as const,
      generateStructured: vi
        .fn()
        .mockRejectedValue(new ServiceUnavailableException('OpenAI rate limit exceeded (429)')),
      generateText: vi.fn(),
    };

    const factory = new AIFactory(
      mockPrisma as never,
      mockUsageService as never,
      mockOpenAI as never,
      {} as never,
      {} as never,
    );

    await expect(
      factory.generateStructured(
        { organizationId: 'org_1', feature: 'EMAIL_ASSISTANT' },
        { systemPrompt: 'sys', userPrompt: 'usr', schema: sampleSchema },
      ),
    ).rejects.toThrow(/rate limit/i);
  });

  it('7. rejects malformed or empty resume text before invoking AI provider', async () => {
    const { mockPrisma } = createMockDependencies();
    const parser = new ResumeParserService(mockPrisma as never, {} as never);

    await expect(
      parser.parseResumeText({
        organizationId: 'org_1',
        userId: 'usr_1',
        fileName: 'corrupt.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 1024,
        rawText: '   too short   ',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('8. safely truncates extremely long resume input (>15,000 chars) and stages as PENDING_REVIEW', async () => {
    const { mockPrisma } = createMockDependencies();
    const mockFactory = {
      generateStructured: vi.fn().mockResolvedValue({
        data: {
          firstName: 'Elena',
          lastName: 'Vance',
          fullName: 'Elena Vance',
          email: 'elena@example.com',
          summary: 'Experienced engineer',
          skills: [],
          experiences: [],
          educations: [],
          certifications: [],
          languages: ['English'],
        },
        provider: 'OPENAI',
        model: 'gpt-4o-mini',
      }),
    };

    const parser = new ResumeParserService(mockPrisma as never, mockFactory as never);
    const hugeText = 'Senior Software Engineer Resume Content. '.repeat(1200); // ~48,000 chars

    const res = await parser.parseResumeText({
      organizationId: 'org_1',
      userId: 'usr_1',
      fileName: 'large-resume.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 512000,
      rawText: hugeText,
    });

    expect(res.parseStatus).toBe('PENDING_REVIEW');
    const calledPrompt = mockFactory.generateStructured.mock.calls[0]?.[1]?.userPrompt as string;
    expect(calledPrompt.length).toBeLessThan(16000);
  });
});
