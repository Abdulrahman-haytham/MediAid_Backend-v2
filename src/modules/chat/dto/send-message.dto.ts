import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'ID of the order related to this message' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Content of the message', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
