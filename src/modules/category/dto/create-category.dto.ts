import { IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Antibiotics', description: 'Name of the category' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(32)
  name: string;

  @ApiProperty({ example: 'https://example.com/image.png', description: 'URL of the category image', required: false })
  @IsOptional()
  @IsString()
  @IsUrl()
  image?: string;
}
