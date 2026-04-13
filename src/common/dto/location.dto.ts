import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LocationDto {
  @ApiProperty({ example: 40.7128, description: 'Latitude coordinate' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ example: -74.006, description: 'Longitude coordinate' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Search radius in meters (default: 5000, min: 100, max: 50000)',
    minimum: 100,
    maximum: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(50000)
  @Type(() => Number)
  radius?: number = 5000;
}
