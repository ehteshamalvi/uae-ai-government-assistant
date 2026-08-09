import { Module } from '@nestjs/common';
import { IntentController } from './intent.controller';
import { IntentService } from './intent.service';
import { ServiceIdentificationService } from './service-identification.service';
import { AiProvidersModule } from '../../providers/ai/ai-providers.module';

@Module({
  imports: [AiProvidersModule],
  controllers: [IntentController],
  providers: [IntentService, ServiceIdentificationService],
  exports: [IntentService, ServiceIdentificationService],
})
export class IntentModule {}
