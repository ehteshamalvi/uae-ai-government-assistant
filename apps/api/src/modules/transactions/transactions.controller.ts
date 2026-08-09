import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { TransactionsService } from './transactions.service';
import { ListTransactionsQueryDto } from './dto/list-transactions.query.dto';
import {
  CreateTransactionDto,
  UpdateTransactionFieldsDto,
} from './dto/create-transaction.dto';
import {
  CurrentUser,
  type RequestUser,
} from '../../common/decorators/auth.decorators';
import { RequirementsService } from '../requirements/requirements.service';
import { ReviewService } from './review.service';
import { LifecycleService } from './lifecycle.service';
import {
  PaymentsService,
  ProcessPaymentDto,
} from '../payments/payments.service';

class ConfirmReviewDto {
  @IsBoolean()
  confirmed!: boolean;
}

@Controller('transactions')
@Throttle({ default: { limit: 80, ttl: 60_000 } })
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly requirementsService: RequirementsService,
    private readonly reviewService: ReviewService,
    private readonly lifecycleService: LifecycleService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: RequestUser,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.transactionsService.list(user, query);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() body: CreateTransactionDto) {
    return this.transactionsService.create(user, body);
  }

  @Get(':id')
  getById(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.transactionsService.getById(user, id);
  }

  @Get(':id/workspace')
  getWorkspace(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.transactionsService.getWorkspace(user, id);
  }

  @Post(':id/prepare')
  prepare(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.transactionsService.prepare(user, id);
  }

  @Patch(':id/fields')
  updateFields(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: UpdateTransactionFieldsDto,
  ) {
    return this.transactionsService.updateFields(user, id, body);
  }

  @Get(':id/review')
  getReview(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.reviewService.getReview(user, id);
  }

  @Post(':id/review/confirm')
  confirmReview(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: ConfirmReviewDto,
  ) {
    return this.reviewService.confirmReview(user, id, body.confirmed);
  }

  @Get(':id/payment')
  getPayment(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.paymentsService.getPayment(user, id);
  }

  @Post(':id/payment')
  createPayment(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.paymentsService.createPayment(user, id);
  }

  @Post(':id/payment/process')
  processPayment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: ProcessPaymentDto,
  ) {
    return this.paymentsService.processPayment(
      user,
      id,
      body.outcome ?? 'SUCCESS',
    );
  }

  @Post(':id/submit')
  submit(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.lifecycleService.submit(user, id);
  }

  @Get(':id/monitor')
  getMonitor(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.lifecycleService.getMonitor(user, id);
  }

  @Post(':id/sandbox/advance')
  sandboxAdvance(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.lifecycleService.sandboxAdvance(user, id);
  }

  @Post(':id/sandbox/reset')
  demoReset(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.lifecycleService.demoReset(user, id);
  }

  @Get(':id/readiness')
  getReadiness(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.transactionsService.getReadiness(user, id);
  }

  @Get(':id/steps')
  getSteps(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.transactionsService.getSteps(user, id);
  }

  @Get(':id/fields')
  getFields(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.transactionsService.getFields(user, id);
  }

  @Get(':id/documents')
  getDocuments(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.transactionsService.getDocuments(user, id);
  }

  @Get(':id/requirements')
  getRequirements(@Param('id') id: string) {
    return this.requirementsService.listForTransaction(id);
  }
}
