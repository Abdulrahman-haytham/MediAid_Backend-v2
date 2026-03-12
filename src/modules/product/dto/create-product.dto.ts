import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductType } from '../product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'Panadol Extra', description: 'Name of the product' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: ProductType,
    example: ProductType.MEDICINE,
    description: 'Type of the product',
  })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiProperty({
    example: 'uuid-category-id',
    description: 'ID of the category',
  })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({
    example: 'Pain Killers',
    description: 'Sub-category name',
    required: false,
  })
  @IsOptional()
  @IsString()
  sub_category?: string;

  @ApiProperty({
    example: 'GSK',
    description: 'Brand of the product',
    required: false,
  })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({
    example: 'Effective pain relief...',
    description: 'Detailed description of the product',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  description: string;

  @ApiProperty({
    example: 'GlaxoSmithKline',
    description: 'Manufacturer name',
    required: false,
  })
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty({
    example: 'https://example.com/panadol.png',
    description: 'URL of the product image',
  })
  @IsString()
  @IsUrl()
  imageUrl: string;

  @ApiProperty({
    example: true,
    description: 'Is the product active?',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 15.5, description: 'Price of the product' })
  @IsNumber()
  @Min(0)
  price: number;
}
