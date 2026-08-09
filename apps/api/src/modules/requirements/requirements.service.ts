import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isUuidLike } from '../../common/utils/is-uuid';

@Injectable()
export class RequirementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForService(serviceIdOrCode: string) {
    const service = await this.prisma.service.findFirst({
      where: isUuidLike(serviceIdOrCode)
        ? { OR: [{ id: serviceIdOrCode }, { code: serviceIdOrCode }] }
        : { code: serviceIdOrCode },
    });
    if (!service) {
      throw new NotFoundException(`Service not found: ${serviceIdOrCode}`);
    }

    const requirements = await this.prisma.serviceRequirement.findMany({
      where: { serviceId: service.id },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      serviceId: service.id,
      serviceCode: service.code,
      requirements: requirements.map((r) => ({
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

  async listForTransaction(transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: isUuidLike(transactionId)
        ? { OR: [{ id: transactionId }, { referenceCode: transactionId }] }
        : { referenceCode: transactionId },
      include: { service: true },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction not found: ${transactionId}`);
    }

    const payload = await this.listForService(transaction.serviceId);
    return {
      transactionId: transaction.id,
      referenceCode: transaction.referenceCode,
      ...payload,
    };
  }
}
