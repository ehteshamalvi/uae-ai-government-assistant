import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Service } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { ListServicesQueryDto } from './dto/list-services.query.dto';
import { isUuidLike } from '../../common/utils/is-uuid';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListServicesQueryDto) {
    const where: Prisma.ServiceWhereInput = {};

    if (query.category) where.category = query.category;
    if (query.active === 'true') where.isActive = true;
    if (query.active === 'false') where.isActive = false;
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { nameEn: { contains: term, mode: 'insensitive' } },
        { nameAr: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    const services = await this.prisma.service.findMany({
      where,
      include: {
        requirements: {
          select: { id: true, type: true, isMandatory: true },
        },
      },
      orderBy: { nameEn: 'asc' },
    });

    return services.map((service) => this.toListItem(service));
  }

  async getById(id: string) {
    const service = await this.prisma.service.findFirst({
      where: isUuidLike(id) ? { OR: [{ id }, { code: id }] } : { code: id },
      include: {
        requirements: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Service not found: ${id}`);
    }

    return this.toDetail(service);
  }

  private toListItem(
    service: Service & {
      requirements: Array<{ id: string; type: string; isMandatory: boolean }>;
    },
  ) {
    const metadata = (service.metadata ?? {}) as Record<string, unknown>;
    const requiredDocuments = service.requirements.filter(
      (r) => r.type === 'DOCUMENT' && r.isMandatory,
    ).length;
    const requiredFields = service.requirements.filter(
      (r) => r.type === 'FIELD' && r.isMandatory,
    ).length;

    return {
      id: service.id,
      code: service.code,
      nameEn: service.nameEn,
      nameAr: service.nameAr,
      category: service.category,
      description: service.description,
      isActive: service.isActive,
      status: service.isActive ? 'ACTIVE' : 'INACTIVE',
      estimatedSlaHours:
        typeof metadata.estimatedSlaHours === 'number'
          ? metadata.estimatedSlaHours
          : null,
      baseFeeAed:
        typeof metadata.baseFeeAed === 'number' ? metadata.baseFeeAed : null,
      requiredDocumentCount: requiredDocuments,
      requiredInformationCount: requiredFields,
      sandbox: Boolean(metadata.sandbox ?? true),
    };
  }

  private toDetail(
    service: Service & {
      requirements: Array<{
        id: string;
        type: string;
        code: string;
        labelEn: string;
        labelAr: string;
        dataType: string | null;
        documentType: string | null;
        isMandatory: boolean;
        validationRules: unknown;
        sortOrder: number;
      }>;
    },
  ) {
    return {
      ...this.toListItem(service),
      requirements: service.requirements.map((r) => ({
        id: r.id,
        code: r.code,
        type: r.type,
        name: r.labelEn,
        nameAr: r.labelAr,
        description: r.labelEn,
        required: r.isMandatory,
        dataType: r.dataType,
        documentType: r.documentType,
        validationRules: r.validationRules,
        displayOrder: r.sortOrder,
      })),
    };
  }
}
