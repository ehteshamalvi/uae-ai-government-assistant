import { Prisma } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../../common/decorators/auth.decorators';
import { isUuidLike } from '../../common/utils/is-uuid';
import { CopilotOrchestrator } from './copilot.orchestrator';

export class CreateSessionDto {
  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsUUID()
  documentId?: string;
}

@Injectable()
export class CopilotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: CopilotOrchestrator,
  ) {}

  getModuleName() {
    return 'copilot';
  }

  async createSession(user: RequestUser, dto: CreateSessionDto) {
    let transactionId: string | null = null;
    let title = dto.title?.trim() || 'Copilot session';

    if (dto.transactionId) {
      const tx = await this.resolveTransaction(user, dto.transactionId);
      transactionId = tx.id;
      title = dto.title?.trim() || `${tx.title} Copilot`;
    }

    const session = await this.prisma.copilotSession.create({
      data: {
        userId: user.id,
        transactionId,
        title,
      },
    });

    return this.toSessionDto(session);
  }

  async listSessions(user: RequestUser) {
    const sessions = await this.prisma.copilotSession.findMany({
      where: user.isAdmin ? undefined : { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      include: {
        transaction: {
          select: { referenceCode: true, title: true, status: true },
        },
        _count: { select: { messages: true } },
      },
    });
    return sessions.map((s) => ({
      ...this.toSessionDto(s),
      messageCount: s._count.messages,
      transaction: s.transaction
        ? {
            referenceCode: s.transaction.referenceCode,
            title: s.transaction.title,
            status: s.transaction.status,
          }
        : null,
    }));
  }

  async getSession(user: RequestUser, id: string) {
    const session = await this.prisma.copilotSession.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' }, take: 100 },
        transaction: {
          select: {
            id: true,
            referenceCode: true,
            title: true,
            status: true,
            readinessScore: true,
            service: { select: { nameEn: true, code: true } },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Copilot session not found');
    this.assertSessionAccess(user, session.userId);

    return {
      ...this.toSessionDto(session),
      transaction: session.transaction
        ? {
            id: session.transaction.id,
            referenceCode: session.transaction.referenceCode,
            title: session.transaction.title,
            status: session.transaction.status,
            readinessScore: session.transaction.readinessScore,
            serviceName: session.transaction.service.nameEn,
            serviceCode: session.transaction.service.code,
          }
        : null,
      messages: session.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations,
        createdAt: m.createdAt,
      })),
    };
  }

  async sendMessage(user: RequestUser, sessionId: string, dto: SendMessageDto) {
    const session = await this.prisma.copilotSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 8 },
        transaction: { select: { id: true, referenceCode: true } },
      },
    });
    if (!session) throw new NotFoundException('Copilot session not found');
    this.assertSessionAccess(user, session.userId);

    const content = dto.content.trim();
    if (!content) throw new BadRequestException('content is required');

    const userMsg = await this.prisma.copilotMessage.create({
      data: {
        sessionId: session.id,
        role: 'USER',
        content,
      },
    });

    const recent = [...session.messages]
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    const started = Date.now();
    const reply = await this.orchestrator.reply({
      user,
      message: content,
      transactionId: session.transactionId,
      documentId: dto.documentId,
      recentMessages: recent,
    });

    const assistantMsg = await this.prisma.copilotMessage.create({
      data: {
        sessionId: session.id,
        role: 'ASSISTANT',
        content: reply.answer,
        citations: {
          confidence: reply.confidence,
          confidenceBand: reply.confidenceBand,
          sources: reply.sources,
          suggestedActions: reply.suggestedActions,
          queryClass: reply.queryClass,
          provider: reply.provider,
          noKnowledge: reply.noKnowledge ?? false,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    await this.prisma.copilotSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    await this.prisma.aIAction.create({
      data: {
        transactionId: session.transactionId,
        userId: user.id,
        type: 'COPILOT_REPLY',
        agentName: reply.provider,
        inputSummary: content.slice(0, 200),
        outputSummary: reply.answer.slice(0, 200),
        success: true,
        latencyMs: Date.now() - started,
      },
    });

    return {
      userMessage: {
        id: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        createdAt: userMsg.createdAt,
      },
      assistantMessage: {
        id: assistantMsg.id,
        role: assistantMsg.role,
        content: assistantMsg.content,
        createdAt: assistantMsg.createdAt,
        confidence: reply.confidence,
        confidenceBand: reply.confidenceBand,
        sources: reply.sources,
        suggestedActions: reply.suggestedActions,
        queryClass: reply.queryClass,
        provider: reply.provider,
        noKnowledge: reply.noKnowledge ?? false,
      },
    };
  }

  private async resolveTransaction(user: RequestUser, idOrRef: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: isUuidLike(idOrRef)
        ? { OR: [{ id: idOrRef }, { referenceCode: idOrRef }] }
        : { referenceCode: idOrRef },
    });
    if (!tx) throw new NotFoundException(`Transaction not found: ${idOrRef}`);
    if (!user.isAdmin && tx.userId !== user.id) {
      throw new ForbiddenException(
        'You do not have access to this transaction',
      );
    }
    return tx;
  }

  private assertSessionAccess(user: RequestUser, ownerId: string) {
    if (!user.isAdmin && user.id !== ownerId) {
      throw new ForbiddenException(
        'You do not have access to this Copilot session',
      );
    }
  }

  private toSessionDto(session: {
    id: string;
    userId: string;
    transactionId: string | null;
    title: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: session.id,
      userId: session.userId,
      transactionId: session.transactionId,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
