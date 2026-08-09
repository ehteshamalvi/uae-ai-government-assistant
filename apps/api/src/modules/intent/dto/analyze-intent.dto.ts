import { IsString, MaxLength, MinLength } from 'class-validator';

export class AnalyzeIntentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}
