import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import {
  InsightType,
  NotificationType,
  PaymentStatus,
  Prisma,
  StepStatus,
  TransactionStatus,
} from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../../common/decorators/auth.decorators';
import { isUuidLike } from '../../common/utils/is-uuid';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
  type SandboxPaymentOutcome,
} from '../../providers/payment/payment.interfaces';
import { mapPaymentStatusLabel, quoteSandboxFees } from './sandbox-fee.util';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { InsightsService } from '../transactions/insights.service';
import { ReviewService } from '../transactions/review.service';

export class ProcessPaymentDto {
  /** Explicit sandbox outcome — never random. Default SUCCESS. */
  @IsOptional()
  @IsIn(['SUCCESS', 'FAILURE'])
  outcome?: SandboxPaymentOutcome;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly insights: InsightsService,
    @Inject(forwardRef(() => ReviewService))
    private readonly review: ReviewService,
  ) {}

  getModuleName() {
    return 'payments';
  }

  async getPayment(user: RequestUser, idOrRef: string) {
    const tx = await this.loadTx(user, idOrRef);
    const quote = quoteSandboxFees(tx.service.metadata);
    const payment = tx.payments[0] ?? null;
    return this.toDto(tx, payment, quote);
  }

  async createPayment(user: RequestUser, idOrRef: string) {
    const tx = await this.loadTx(user, idOrRef);
    if (!tx.reviewConfirmedAt) {
      throw new BadRequestException(
        'Confirm final review before creating sandbox payment',
      );
    }

    const review = await this.review.getReview(user, tx.id);
    if (review.eligibility !== 'READY_FOR_REVIEW') {
      throw new BadRequestException(
        `Cannot create payment while review eligibility is ${review.eligibility}`,
      );
    }

    const quote = quoteSandboxFees(tx.service.metadata);
    const existing = tx.payments[0];
    if (existing && existing.status === PaymentStatus.SANDBOX_PAID) {
      return this.toDto(tx, existing, quote);
    }

    await this.provider.create({
      transactionId: tx.id,
      currency: quote.currency,
      serviceFee: quote.serviceFee,
      additionalFee: quote.additionalFee,
      totalAmount: quote.totalAmount,
      feeBreakdown: quote.feeBreakdown,
    });

    const payment = existing
      ? await this.prisma.payment.update({
          where: { id: existing.id },
          data: {
            serviceFee: quote.serviceFee,
            additionalFee: quote.additionalFee,
            totalAmount: quote.totalAmount,
            feeBreakdown:
              quote.feeBreakdown as unknown as Prisma.InputJsonValue,
            status: PaymentStatus.AWAITING_REVIEW,
            sandbox: true,
            reviewedAt: new Date(),
            paidAt: null,
          },
        })
      : await this.prisma.payment.create({
          data: {
            transactionId: tx.id,
            currency: quote.currency,
            serviceFee: quote.serviceFee,
            additionalFee: quote.additionalFee,
            totalAmount: quote.totalAmount,
            feeBreakdown:
              quote.feeBreakdown as unknown as Prisma.InputJsonValue,
            status: PaymentStatus.AWAITING_REVIEW,
            sandbox: true,
            reviewedAt: new Date(),
          },
        });

    if (tx.status !== TransactionStatus.PAYMENT_PENDING) {
      await this.prisma.transaction.update({
        where: { id: tx.id },
        data: { status: TransactionStatus.PAYMENT_PENDING },
      });
    }

    await this.audit.record({
      actorId: user.id,
      action: 'PAYMENT_REVIEW_OPENED',
      entityType: 'Payment',
      entityId: payment.id,
      metadata: {
        transactionId: tx.id,
        totalAmount: Number(payment.totalAmount),
        provider: this.provider.providerName(),
        // never log credentials — none exist
      },
    });

    return this.toDto(tx, payment, quote);
  }

  async processPayment(
    user: RequestUser,
    idOrRef: string,
    outcome: SandboxPaymentOutcome = 'SUCCESS',
  ) {
    const tx = await this.loadTx(user, idOrRef);
    let payment = tx.payments[0];
    if (!payment) {
      await this.createPayment(user, idOrRef);
      const refreshed = await this.loadTx(user, idOrRef);
      payment = refreshed.payments[0]!;
    }

    if (
      payment.status === PaymentStatus.SANDBOX_PAID &&
      outcome === 'SUCCESS'
    ) {
      const quote = quoteSandboxFees(tx.service.metadata);
      return this.toDto(tx, payment, quote);
    }

    const result = await this.provider.process(
      {
        id: payment.id,
        transactionId: payment.transactionId,
        currency: payment.currency,
        serviceFee: Number(payment.serviceFee),
        additionalFee: Number(payment.additionalFee),
        totalAmount: Number(payment.totalAmount),
        status: payment.status,
        feeBreakdown: payment.feeBreakdown,
        sandbox: payment.sandbox,
        reviewedAt: payment.reviewedAt,
        paidAt: payment.paidAt,
      },
      outcome,
    );

    const updated = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: result.status as PaymentStatus,
        paidAt: result.paidAt,
      },
    });

    const quote = quoteSandboxFees(tx.service.metadata);

    if (outcome === 'SUCCESS') {
      await this.prisma.transactionStep.upsert({
        where: {
          transactionId_code: { transactionId: tx.id, code: 'PAYMENT' },
        },
        create: {
          transactionId: tx.id,
          code: 'PAYMENT',
          labelEn: 'Payment',
          labelAr: 'الدفع',
          sortOrder: 5,
          status: StepStatus.COMPLETED,
          completedAt: new Date(),
          startedAt: new Date(),
          meta: { sandbox: true },
        },
        update: {
          status: StepStatus.COMPLETED,
          completedAt: new Date(),
          meta: { sandbox: true },
        },
      });

      await this.audit.record({
        actorId: user.id,
        action: 'PAYMENT_COMPLETED',
        entityType: 'Payment',
        entityId: updated.id,
        metadata: {
          transactionId: tx.id,
          totalAmount: Number(updated.totalAmount),
          sandbox: true,
        },
      });

      await this.notifications.create({
        userId: tx.userId,
        transactionId: tx.id,
        type: NotificationType.SUCCESS,
        title: 'Sandbox payment completed',
        body: `Payment of AED ${Number(updated.totalAmount).toFixed(2)} recorded for ${tx.referenceCode}. No real money was charged.`,
      });

      await this.insights.upsertInsights(tx.id, [
        {
          type: InsightType.RECOMMENDATION,
          title: 'Payment completed',
          summary: 'Payment has been completed (sandbox).',
          severity: 'info',
        },
      ]);
    } else {
      await this.audit.record({
        actorId: user.id,
        action: 'PAYMENT_FAILED',
        entityType: 'Payment',
        entityId: updated.id,
        metadata: { transactionId: tx.id, sandbox: true, outcome: 'FAILURE' },
      });
      await this.notifications.create({
        userId: tx.userId,
        transactionId: tx.id,
        type: NotificationType.WARNING,
        title: 'Sandbox payment failed',
        body: 'Demo FAILURE mode was selected. Retry with SUCCESS to continue.',
      });
    }

    return {
      ...this.toDto(tx, updated, quote),
      message: result.message,
      outcome,
    };
  }

  private toDto(
    tx: { id: string; referenceCode: string; sandbox: boolean },
    payment: {
      id: string;
      currency: string;
      serviceFee: Prisma.Decimal | number;
      additionalFee: Prisma.Decimal | number;
      totalAmount: Prisma.Decimal | number;
      status: string;
      feeBreakdown: unknown;
      sandbox: boolean;
      reviewedAt: Date | null;
      paidAt: Date | null;
    } | null,
    quote: ReturnType<typeof quoteSandboxFees>,
  ) {
    const required = quote.totalAmount > 0;
    return {
      transactionId: tx.id,
      referenceCode: tx.referenceCode,
      sandbox: true,
      label: 'SANDBOX PAYMENT',
      disclaimer: quote.disclaimer,
      provider: this.provider.providerName(),
      paymentRequired: required,
      statusLabel: mapPaymentStatusLabel(payment?.status, required),
      currency: quote.currency,
      serviceFee: quote.serviceFee,
      additionalFee: quote.additionalFee,
      totalAmount: quote.totalAmount,
      feeBreakdown: quote.feeBreakdown,
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            serviceFee: Number(payment.serviceFee),
            additionalFee: Number(payment.additionalFee),
            totalAmount: Number(payment.totalAmount),
            feeBreakdown: payment.feeBreakdown,
            sandbox: payment.sandbox,
            reviewedAt: payment.reviewedAt,
            paidAt: payment.paidAt,
          }
        : null,
      canPay: required && payment?.status !== PaymentStatus.SANDBOX_PAID,
      canSubmit:
        (!required || payment?.status === PaymentStatus.SANDBOX_PAID) && true,
    };
  }

  private async loadTx(user: RequestUser, idOrRef: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: isUuidLike(idOrRef)
        ? { OR: [{ id: idOrRef }, { referenceCode: idOrRef }] }
        : { referenceCode: idOrRef },
      include: {
        service: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!tx) throw new NotFoundException(`Transaction not found: ${idOrRef}`);
    if (!user.isAdmin && tx.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have access to this transaction',
      );
    }
    return tx;
  }
}
