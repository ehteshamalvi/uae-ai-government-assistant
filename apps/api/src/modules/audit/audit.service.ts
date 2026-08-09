import { Injectable } from '@nestjs/common';
import { AuditAction, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  getModuleName() {
    return 'audit';
  }

  async record(input: {
    actorId?: string | null;
    action: AuditAction;
    entityType: string;
    entityId?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
      },
    });
  }

  async listForEntity(entityType: string, entityId: string, take = 20) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
