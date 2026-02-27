import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({ example: 'Hello, is this available?', description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', description: 'Image URL', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
