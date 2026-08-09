import { Global, Module } from '@nestjs/common';
import { DemoModeService } from './demo-mode.service';
import { DemoController } from './demo.controller';

@Global()
@Module({
  controllers: [DemoController],
  providers: [DemoModeService],
  exports: [DemoModeService],
})
export class DemoModule {}
