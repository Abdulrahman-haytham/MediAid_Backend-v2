import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AiBotChatDto {
  @ApiProperty({ description: "User's medical question", example: 'ما هي أعراض التهاب اللوزتين؟' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question: string;

  @ApiProperty({
    required: false,
    description:
      "Previous messages in format [{role:'user'|'assistant', content:'...'}]",
    example: [{ role: 'user', content: 'مرحبا' }, { role: 'assistant', content: 'مرحبًا! كيف أساعدك؟' }],
  })
  @IsOptional()
  @IsArray()
  chat_history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

