import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { RequestUser } from '../../common/decorators/auth.decorators';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  getModuleName() {
    return 'notifications';
  }

  async list(user: RequestUser) {
    const rows = await this.prisma.notification.findMany({
      where: user.isAdmin ? undefined : { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      isRead: n.isRead,
      transactionId: n.transactionId,
      createdAt: n.createdAt,
    }));
  }

  async markRead(user: RequestUser, id: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n || (!user.isAdmin && n.userId !== user.id)) {
      return { updated: false };
    }
    await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return { updated: true, id };
  }

  async create(input: {
    userId: string;
    transactionId?: string | null;
    type: NotificationType;
    title: string;
    body: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: input.userId,
        transactionId: input.transactionId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
      },
    });
  }
}
