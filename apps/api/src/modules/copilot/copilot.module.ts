import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CopilotController } from './copilot.controller';
import { CopilotService } from './copilot.service';
import { CopilotContextBuilder } from './copilot-context.builder';
import { CopilotOrchestrator } from './copilot.orchestrator';
import { MockCopilotAIProvider } from './mock-copilot-ai.provider';
import { OpenAICopilotProvider } from './openai-copilot.provider';
import { COPILOT_AI_PROVIDER } from './copilot-ai.types';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [ConfigModule, KnowledgeModule, TransactionsModule],
  controllers: [CopilotController],
  providers: [
    CopilotService,
    CopilotContextBuilder,
    CopilotOrchestrator,
    MockCopilotAIProvider,
    {
      provide: COPILOT_AI_PROVIDER,
      inject: [ConfigService, MockCopilotAIProvider],
      useFactory: (
        config: ConfigService,
        mock: MockCopilotAIProvider,
      ): MockCopilotAIProvider | OpenAICopilotProvider => {
        const mode = (config.get<string>('aiProvider') ?? 'mock').toLowerCase();
        if (mode === 'openai') {
          const key = config.get<string>('openaiApiKey') ?? '';
          if (!key) {
            throw new Error(
              'AI_PROVIDER=openai but OPENAI_API_KEY is missing. Use AI_PROVIDER=mock for local demos.',
            );
          }
          return new OpenAICopilotProvider(key);
        }
        return mock;
      },
    },
  ],
  exports: [CopilotService, CopilotOrchestrator],
})
export class CopilotModule {}
