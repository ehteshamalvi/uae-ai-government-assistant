import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { DocumentsService } from './documents.service';
import {
  CurrentUser,
  type RequestUser,
} from '../../common/decorators/auth.decorators';

@Controller('documents')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query('transactionId') transactionId?: string,
  ) {
    return this.documentsService.list(user, transactionId);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.documentsService.getById(user, id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('transactionId') transactionId: string,
    @Body('documentType') documentType?: string,
  ) {
    return this.documentsService.upload(user, {
      transactionId,
      documentType,
      file,
    });
  }

  @Delete(':id')
  remove(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.documentsService.remove(user, id);
  }
}
