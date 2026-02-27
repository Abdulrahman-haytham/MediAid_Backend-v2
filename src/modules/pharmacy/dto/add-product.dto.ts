import { IsInt, IsNotEmpty, IsNumber, IsString, Min, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddProductDto {
  @ApiProperty({ example: 'uuid', description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 10, description: 'Quantity' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 50.5, description: 'Price' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: '2025-12-31T00:00:00Z', description: 'Expiry Date', required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ example: 'BATCH123', description: 'Batch Number', required: false })
  @IsOptional()
  @IsString()
  batchNumber?: string;
}
