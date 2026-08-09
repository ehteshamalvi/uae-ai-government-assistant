import {
  IsArray,
  ArrayMaxSize,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @IsUUID()
  serviceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  intentText?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}

export class UpdateTransactionFieldDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  code!: string;

  @IsString()
  @MaxLength(500)
  value!: string;

  @IsOptional()
  @IsIn(['USER_PROVIDED', 'AI_EXTRACTED', 'SYSTEM_VERIFIED'])
  source?: 'USER_PROVIDED' | 'AI_EXTRACTED' | 'SYSTEM_VERIFIED';
}

export class UpdateTransactionFieldsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => UpdateTransactionFieldDto)
  fields!: UpdateTransactionFieldDto[];
}
