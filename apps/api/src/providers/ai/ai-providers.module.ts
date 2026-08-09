import { Module } from '@nestjs/common';
import {
  AI_PROVIDER,
  DOCUMENT_ANALYSIS_PROVIDER,
  INTENT_PROVIDER,
} from './ai.interfaces';
import {
  MockAIProvider,
  MockDocumentAnalysisProvider,
  MockIntentProvider,
} from './mock-ai.providers';

/**
 * Shared AI provider bindings. Swap Mock* for OpenAI* later without
 * changing domain services that inject INTENT_PROVIDER / DOCUMENT_ANALYSIS_PROVIDER.
 */
@Module({
  providers: [
    MockIntentProvider,
    { provide: INTENT_PROVIDER, useExisting: MockIntentProvider },
    MockDocumentAnalysisProvider,
    {
      provide: DOCUMENT_ANALYSIS_PROVIDER,
      useExisting: MockDocumentAnalysisProvider,
    },
    MockAIProvider,
    { provide: AI_PROVIDER, useExisting: MockAIProvider },
  ],
  exports: [
    INTENT_PROVIDER,
    DOCUMENT_ANALYSIS_PROVIDER,
    AI_PROVIDER,
    MockIntentProvider,
    MockDocumentAnalysisProvider,
    MockAIProvider,
  ],
})
export class AiProvidersModule {}
