import { PartialType, OmitType } from '@nestjs/mapped-types';
import {
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

class UpdateLocationCoordinatesDto {
  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: number[];
}

// Omit 'type' to prevent role escalation, and other sensitive fields
export class UpdateUserDto extends OmitType(PartialType(CreateUserDto), [
  'type',
] as const) {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocationCoordinatesDto)
  location?: UpdateLocationCoordinatesDto;
}
