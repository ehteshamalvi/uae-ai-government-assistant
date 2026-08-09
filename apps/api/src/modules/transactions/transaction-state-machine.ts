import { TransactionStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

/**
 * Controlled sandbox lifecycle. Invalid transitions throw.
 *
 * Demo path:
 * PREPARING → READY_FOR_REVIEW → PAYMENT_PENDING → SUBMITTED
 * → PROCESSING → COMPLETED
 */
export const TRANSACTION_TRANSITIONS: Record<
  TransactionStatus,
  TransactionStatus[]
> = {
  DRAFT: ['IDENTIFIED', 'PREPARING', 'CANCELLED'],
  IDENTIFIED: ['PREPARING', 'READY_FOR_REVIEW', 'CANCELLED'],
  PREPARING: [
    'READY_FOR_REVIEW',
    'PAYMENT_PENDING',
    'NEEDS_ACTION',
    'CANCELLED',
  ],
  READY_FOR_REVIEW: [
    'PAYMENT_PENDING',
    'UNDER_REVIEW',
    'NEEDS_ACTION',
    'CANCELLED',
  ],
  UNDER_REVIEW: [
    'PAYMENT_PENDING',
    'APPROVED',
    'REJECTED',
    'NEEDS_ACTION',
    'CANCELLED',
  ],
  PAYMENT_PENDING: ['SUBMITTED', 'NEEDS_ACTION', 'CANCELLED'],
  SUBMITTED: ['PROCESSING', 'UNDER_REVIEW', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'APPROVED', 'ISSUED', 'REJECTED', 'NEEDS_ACTION'],
  APPROVED: ['ISSUED', 'COMPLETED'],
  ISSUED: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  NEEDS_ACTION: [
    'PREPARING',
    'READY_FOR_REVIEW',
    'PAYMENT_PENDING',
    'CANCELLED',
  ],
  CANCELLED: [],
};

export function assertTransition(
  from: TransactionStatus,
  to: TransactionStatus,
): void {
  const allowed = TRANSACTION_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Invalid sandbox status transition: ${from} → ${to}`,
    );
  }
}

export function canTransition(
  from: TransactionStatus,
  to: TransactionStatus,
): boolean {
  return (TRANSACTION_TRANSITIONS[from] ?? []).includes(to);
}

/** Single-step sandbox advance after submission. */
export const SANDBOX_ADVANCE_ORDER: TransactionStatus[] = [
  TransactionStatus.SUBMITTED,
  TransactionStatus.PROCESSING,
  TransactionStatus.COMPLETED,
];

export function nextSandboxAdvance(
  current: TransactionStatus,
): TransactionStatus | null {
  const idx = SANDBOX_ADVANCE_ORDER.indexOf(current);
  if (idx < 0 || idx >= SANDBOX_ADVANCE_ORDER.length - 1) return null;
  return SANDBOX_ADVANCE_ORDER[idx + 1];
}
