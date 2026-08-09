import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ServiceCategory } from '@prisma/client';
import { Transform } from 'class-transformer';

export class ListServicesQueryDto {
  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true') return 'true';
    if (value === false || value === 'false') return 'false';
    return String(value);
  })
  @IsBooleanString()
  active?: string;
}
