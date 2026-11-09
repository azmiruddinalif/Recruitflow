import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AIController } from './ai.controller';
import { AIFactory } from './ai.factory';
import { CandidateMatchingService } from './modules/candidate-matching/candidate-matching.service';
import { CandidateSummaryService } from './modules/candidate-summary/candidate-summary.service';
import { EmailAssistantService } from './modules/email-assistant/email-assistant.service';
import { InterviewAssistantService } from './modules/interview-assistant/interview-assistant.service';
import { JobDescriptionService } from './modules/job-description/job-description.service';
import { ResumeParserService } from './modules/resume-parser/resume-parser.service';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { ResumeParseQueueService } from './queues/resume-parse-queue.service';
import { AIUsageService } from './services/ai-usage.service';

@Module({
  imports: [AuthModule],
  controllers: [AIController],
  providers: [
    OpenAIProvider,
    GeminiProvider,
    AnthropicProvider,
    AIUsageService,
    AIFactory,
    ResumeParseQueueService,
    ResumeParserService,
    CandidateMatchingService,
    JobDescriptionService,
    InterviewAssistantService,
    EmailAssistantService,
    CandidateSummaryService,
  ],
  exports: [
    AIFactory,
    ResumeParserService,
    CandidateMatchingService,
    JobDescriptionService,
    InterviewAssistantService,
    EmailAssistantService,
    CandidateSummaryService,
  ],
})
export class AIModule {}
