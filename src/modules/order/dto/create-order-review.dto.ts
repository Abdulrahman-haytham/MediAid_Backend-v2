import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderReviewDto {
  @ApiProperty({ example: 5, description: 'Rating score (1-5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Great service!', description: 'Optional comment', required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}
