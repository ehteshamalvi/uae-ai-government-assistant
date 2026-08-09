import { Injectable } from '@nestjs/common';
import type {
  CopilotAIProvider,
  CopilotGenerateInput,
  CopilotGenerateResult,
} from './copilot-ai.types';

/**
 * Skeleton adapter for future OpenAI integration.
 * Must not be selected without OPENAI_API_KEY.
 */
@Injectable()
export class OpenAICopilotProvider implements CopilotAIProvider {
  constructor(private readonly apiKey: string) {}

  providerName() {
    return 'OPENAI';
  }

  isEnabled() {
    return Boolean(this.apiKey);
  }

  generate(_input?: CopilotGenerateInput): Promise<CopilotGenerateResult> {
    void _input;
    return Promise.reject(
      new Error(
        'OpenAICopilotProvider is a Phase 5 boundary only — live OpenAI calls are not enabled. Set AI_PROVIDER=mock.',
      ),
    );
  }
}
