import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({
    example: '2a7b9a3d-2b0d-4b8e-9f3d-4c3b5e0a1d2f',
    description: 'Order ID related to this message',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    example: 'Hello, is this available?',
    description: 'Message content',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Image URL',
    required: false,
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
