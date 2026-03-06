import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MinLength, ValidateNested, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

class UpdateLocationCoordinatesDto {
  @IsArray()
  @IsNumber({}, { each: true })
  coordinates?: number[];
}

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateLocationCoordinatesDto)
  location?: UpdateLocationCoordinatesDto;
}
