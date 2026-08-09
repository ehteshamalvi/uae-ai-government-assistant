import { Inject, Injectable } from '@nestjs/common';
import {
  AI_PROVIDER,
  INTENT_PROVIDER,
  type AIProvider,
  type IntentProvider,
} from '../../providers/ai/ai.interfaces';

@Injectable()
export class AiService {
  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AIProvider,
    @Inject(INTENT_PROVIDER) private readonly intent: IntentProvider,
  ) {}

  getStatus() {
    return {
      module: 'ai',
      status: 'ready',
      provider: this.ai.providerName(),
      enabled: this.ai.isEnabled(),
      message:
        'AI providers are mock/deterministic in Phase 3. OpenAI/LangGraph arrive later.',
    };
  }

  analyzeIntent(text: string) {
    return this.intent.analyze(text);
  }
}
