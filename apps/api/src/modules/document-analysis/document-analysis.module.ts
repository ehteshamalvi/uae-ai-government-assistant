import { Module } from '@nestjs/common';
import { DocumentAnalysisController } from './document-analysis.controller';
import { DocumentAnalysisService } from './document-analysis.service';
import { AiProvidersModule } from '../../providers/ai/ai-providers.module';

@Module({
  imports: [AiProvidersModule],
  controllers: [DocumentAnalysisController],
  providers: [DocumentAnalysisService],
  exports: [DocumentAnalysisService],
})
export class DocumentAnalysisModule {}
