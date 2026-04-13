import { IsNumber, Min, Max, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class SearchProductsByLocationDto {
  @ApiProperty({
    example: 'Panadol',
    description: 'Product name to search for (partial match, case-insensitive)',
  })
  @IsNotEmpty()
  productName: string;

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
    example: 500000,
    description:
      'Search radius in meters. Default: 500000 (500km). Max: 1000000.',
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1000000)
  radius?: number;
}
