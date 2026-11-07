import { Job as BullJob } from 'bullmq';
import { PrismaClient, AIProviderType } from '@prisma/client';
import { aiParsedResumeSchema } from '@recruitflow/validation';
import { ResumeParseJobData } from '../queues/queue.constants';

export async function processResumeParseJob(
  job: BullJob<ResumeParseJobData>,
  prisma: PrismaClient,
): Promise<{ resumeId: string; status: string }> {
  const { organizationId, resumeId, userId } = job.data;
  const startTime = Date.now();

  const resume = await prisma.candidateResume.findFirst({
    where: { id: resumeId, organizationId },
  });

  if (!resume) {
    throw new Error(`CandidateResume ${resumeId} not found in organization ${organizationId}`);
  }

  await prisma.candidateResume.update({
    where: { id: resumeId },
    data: { parseStatus: 'PROCESSING', parseError: null },
  });

  const configuredProvider = await resolveConfiguredProvider(prisma, organizationId);
  if (!configuredProvider) {
    const errorMessage =
      'AI_PROVIDER_NOT_CONFIGURED: No active AI provider API key is configured for resume parsing.';
    await prisma.candidateResume.update({
      where: { id: resumeId },
      data: {
        parseStatus: 'FAILED',
        parseError: errorMessage,
      },
    });
    throw new Error(errorMessage);
  }

  const rawText = resume.extractedText?.trim() || `Resume File: ${resume.fileName}`;

  try {
    const systemPrompt =
      'You are an expert technical recruiter and resume parser. Extract structured candidate information into JSON matching the requested schema. Do not invent facts not present in the resume text.';
    const userPrompt = `Parse the following resume text into JSON with keys: firstName, lastName, fullName, email, phone, location, currentTitle, currentCompany, totalExperienceYears, summary, skills (array of {name, proficiency, yearsOfExperience}), experiences (array of {company, title, location, startDate, endDate, isCurrent, description, highlights}), educations (array of {institution, degree, fieldOfStudy, startDate, endDate, grade}), certifications (array of {name, issuingOrg, issueDate}), languages (array of strings).\n\nRESUME TEXT:\n${rawText}`;

    const aiResponse = await invokeProviderJson(configuredProvider, systemPrompt, userPrompt);
    const validated = aiParsedResumeSchema.parse(JSON.parse(aiResponse.rawJson));
    const latencyMs = Date.now() - startTime;

    await prisma.$transaction([
      prisma.candidateResume.update({
        where: { id: resumeId },
        data: {
          parsedDataJson: validated as object,
          parseStatus: 'PENDING_REVIEW',
          parseError: null,
          aiProviderUsed: configuredProvider.provider,
          aiModelUsed: configuredProvider.model,
          parsedAt: new Date(),
        },
      }),
      prisma.aIUsageLog.create({
        data: {
          organizationId,
          userId: userId ?? null,
          provider: configuredProvider.provider,
          model: configuredProvider.model,
          feature: 'RESUME_PARSE',
          promptTokens: aiResponse.promptTokens,
          completionTokens: aiResponse.completionTokens,
          totalTokens: aiResponse.totalTokens,
          estimatedCostUsd: Number(((aiResponse.totalTokens / 1000) * 0.002).toFixed(6)),
          latencyMs,
          success: true,
        },
      }),
    ]);

    if (userId) {
      await prisma.notification.create({
        data: {
          organizationId,
          userId,
          type: 'RESUME_PARSED',
          title: 'Resume Parsed & Ready for Review',
          message: `AI extraction finished for ${resume.fileName}. Review and approve the profile before saving to candidate record.`,
          actionUrl: `/dashboard/candidates?resumeReview=${resume.id}`,
        },
      });
    }

    return { resumeId, status: 'PENDING_REVIEW' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Resume parsing failed';
    await prisma.candidateResume.update({
      where: { id: resumeId },
      data: {
        parseStatus: 'FAILED',
        parseError: message,
      },
    });
    await prisma.aIUsageLog.create({
      data: {
        organizationId,
        userId: userId ?? null,
        provider: configuredProvider.provider,
        model: configuredProvider.model,
        feature: 'RESUME_PARSE',
        latencyMs: Date.now() - startTime,
        success: false,
        errorMessage: message,
      },
    });
    throw error;
  }
}

export interface ResolvedWorkerAIProvider {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export async function resolveConfiguredProvider(
  prisma: PrismaClient,
  organizationId: string,
): Promise<ResolvedWorkerAIProvider | null> {
  const dbProvider = await prisma.aIProvider.findFirst({
    where: {
      OR: [{ organizationId }, { organizationId: null }],
      isEnabled: true,
      apiKeyEncrypted: { not: null },
    },
    orderBy: [{ organizationId: 'desc' }, { isDefault: 'desc' }],
  });

  if (dbProvider && dbProvider.apiKeyEncrypted) {
    return {
      provider: dbProvider.provider,
      apiKey: dbProvider.apiKeyEncrypted,
      model: dbProvider.defaultModel,
      timeoutMs: dbProvider.timeoutMs || 30000,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    return {
      provider: 'OPENAI',
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
      timeoutMs: 30000,
    };
  }
  if (process.env.GEMINI_API_KEY) {
    return {
      provider: 'GEMINI',
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.5-flash',
      timeoutMs: 30000,
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      provider: 'ANTHROPIC',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-5-sonnet-latest',
      timeoutMs: 30000,
    };
  }

  return null;
}

export async function invokeProviderJson(
  config: ResolvedWorkerAIProvider,
  systemPrompt: string,
  userPrompt: string,
): Promise<{
  rawJson: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    if (config.provider === 'OPENAI') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI HTTP ${response.status}: ${await response.text()}`);
      }
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const rawJson = data.choices?.[0]?.message?.content || '{}';
      const promptTokens = data.usage?.prompt_tokens ?? 0;
      const completionTokens = data.usage?.completion_tokens ?? 0;
      return {
        rawJson,
        promptTokens,
        completionTokens,
        totalTokens: data.usage?.total_tokens ?? promptTokens + completionTokens,
      };
    }

    if (config.provider === 'GEMINI') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        config.model,
      )}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Gemini HTTP ${response.status}: ${await response.text()}`);
      }
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        usageMetadata?: {
          promptTokenCount?: number;
          candidatesTokenCount?: number;
          totalTokenCount?: number;
        };
      };
      const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const promptTokens = data.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
      return {
        rawJson,
        promptTokens,
        completionTokens,
        totalTokens: data.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens,
      };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system: `${systemPrompt}\nReturn ONLY valid JSON without markdown fences.`,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Anthropic HTTP ${response.status}: ${await response.text()}`);
    }
    const data = (await response.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const rawJson = data.content?.[0]?.text || '{}';
    const promptTokens = data.usage?.input_tokens ?? 0;
    const completionTokens = data.usage?.output_tokens ?? 0;
    return {
      rawJson,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  } finally {
    clearTimeout(timer);
  }
}
