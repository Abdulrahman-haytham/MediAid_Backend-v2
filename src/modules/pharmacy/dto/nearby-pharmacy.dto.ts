import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class NearbyPharmacyQueryDto {
  @ApiProperty({
    example: 31.2357,
    description:
      'Longitude coordinate. IMPORTANT: GeoJSON uses [longitude, latitude] order.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon: number;

  @ApiProperty({
    example: 30.0444,
    description:
      'Latitude coordinate. IMPORTANT: GeoJSON uses [longitude, latitude] order.',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({
    example: 5000,
    description: 'Search radius in meters. Default: 5000 (5km).',
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(100000)
  radius?: number;
}
