import { IsNotEmpty, IsOptional, IsString, IsUrl, MinLength, IsEnum, IsNumber, Min } from 'class-validator';
import { ProductType } from '../../product/product.entity';

export class CreateProductForPharmacyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @IsString()
  @IsNotEmpty()
  categoryName: string;

  @IsOptional()
  @IsString()
  sub_category?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  imageUrl?: string;

  @IsNumber()
  @Min(0)
  price: number;
}
