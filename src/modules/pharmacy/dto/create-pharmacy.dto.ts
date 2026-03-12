import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class OpeningHoursDto {
  @ApiProperty({
    example: '08:00',
    description: 'Morning opening time (HH:mm)',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  morningFrom: string;

  @ApiProperty({
    example: '12:00',
    description: 'Morning closing time (HH:mm)',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  morningTo: string;

  @ApiProperty({
    example: '16:00',
    description: 'Evening opening time (HH:mm)',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  eveningFrom: string;

  @ApiProperty({
    example: '22:00',
    description: 'Evening closing time (HH:mm)',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  eveningTo: string;
}

class LocationDto {
  @ApiProperty({ example: 31.2357, description: 'Longitude coordinate' })
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: 30.0444, description: 'Latitude coordinate' })
  @IsNumber()
  latitude: number;
}

export class CreatePharmacyDto {
  @ApiProperty({
    example: 'Al-Amal Pharmacy',
    description: 'Name of the pharmacy',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: '123 Main St, Cairo',
    description: 'Address of the pharmacy',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    type: LocationDto,
    description: 'Geographical location of the pharmacy',
  })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({
    example: '+201234567890',
    description: 'Contact phone number',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    type: OpeningHoursDto,
    description: 'Opening hours of the pharmacy',
  })
  @ValidateNested()
  @Type(() => OpeningHoursDto)
  openingHours: OpeningHoursDto;

  @ApiProperty({
    example: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    description: 'Working days',
    required: false,
  })
  @IsArray()
  @IsOptional()
  workingDays?: string[];

  @ApiProperty({
    example: 'https://example.com/pharmacy.jpg',
    description: 'Pharmacy image URL',
  })
  @IsString()
  @IsUrl()
  imageUrl: string;

  @ApiProperty({
    example: 'Best pharmacy in town...',
    description: 'Description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: ['Delivery', 'Consultation'],
    description: 'Services offered',
    required: false,
  })
  @IsArray()
  @IsOptional()
  services?: string[];

  @ApiProperty({
    example: true,
    description: 'Does the pharmacy offer delivery?',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  hasDelivery?: boolean;

  @ApiProperty({
    example: 'https://facebook.com/pharmacy',
    description: 'Facebook link',
    required: false,
  })
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiProperty({
    example: 'https://instagram.com/pharmacy',
    description: 'Instagram link',
    required: false,
  })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiProperty({
    example: 'https://twitter.com/pharmacy',
    description: 'Twitter link',
    required: false,
  })
  @IsOptional()
  @IsString()
  twitter?: string;

  @ApiProperty({
    example: 'https://pharmacy.com',
    description: 'Website link',
    required: false,
  })
  @IsOptional()
  @IsString()
  website?: string;
}
