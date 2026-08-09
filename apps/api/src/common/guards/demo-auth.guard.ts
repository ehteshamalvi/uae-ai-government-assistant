import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, type RequestUser } from '../decorators/auth.decorators';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * Phase 2 demo identity guard.
 * Resolves the acting user from `X-Demo-User-Email` (default: seeded demo user).
 * JWT auth replaces this in a later phase — keep ownership checks in services.
 */
@Injectable()
export class DemoAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: RequestUser;
    }>();

    const header = request.headers['x-demo-user-email'];
    const email =
      (Array.isArray(header) ? header[0] : header)?.trim() ||
      'khalid.demo@govflow.ai';

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Demo user not found or inactive');
    }

    const roles = user.roles.map((r) => r.role.code);
    request.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      roles,
      isAdmin: roles.includes('ADMIN'),
    };

    return true;
  }
}
