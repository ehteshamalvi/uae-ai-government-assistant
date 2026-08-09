import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TransactionStatus } from '@prisma/client';

export class ListTransactionsQueryDto {
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;
}
