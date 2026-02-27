import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { KafuPostType } from '../entities/kafuPost.entity';

export class CreateKafuPostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;

  @IsEnum(KafuPostType)
  @IsNotEmpty()
  type: KafuPostType;

  @IsOptional()
  @IsString()
  medicineName?: string;

  @IsOptional()
  @IsString()
  pharmacyName?: string;

  @IsString()
  @IsNotEmpty()
  areaName: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInDays?: number;
}
