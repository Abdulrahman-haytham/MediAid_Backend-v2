import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsOptional,
  ValidateNested,
  IsArray,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../user.entity';
import { ApiProperty } from '@nestjs/swagger';

class LocationCoordinatesDto {
  @ApiProperty({
    example: [30.0444, 31.2357],
    description: 'Array of coordinates [latitude, longitude]',
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty()
  coordinates: number[]; // [latitude, longitude]
}

export class CreateUserDto {
  @ApiProperty({
    enum: UserRole,
    example: UserRole.USER,
    description: 'User role (admin, user, pharmacist)',
  })
  @IsEnum(UserRole, {
    message: 'Type must be either admin, user, or pharmacist',
  })
  type: UserRole;

  @ApiProperty({ example: 'johndoe', description: 'Unique username' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  username: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({
    example: 'securePass123',
    description: 'Password (min 6 chars)',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '+201000000000', description: 'Phone number' })
  @IsString()
  @Matches(/^[0-9+()-]+$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ example: 'Cairo, Egypt', description: 'User address' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    type: LocationCoordinatesDto,
    description: 'User location coordinates',
  })
  @ValidateNested()
  @Type(() => LocationCoordinatesDto)
  @IsNotEmpty()
  location: LocationCoordinatesDto;

  @ApiProperty({
    example: 'LIC-12345',
    description: 'Pharmacist license number (required if type is pharmacist)',
    required: false,
  })
  @IsOptional()
  @IsString()
  license?: string;
}
