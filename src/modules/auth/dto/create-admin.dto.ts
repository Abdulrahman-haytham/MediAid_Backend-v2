import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateUserDto } from '../../user/dto/create-user.dto';

export class CreateAdminDto extends CreateUserDto {
  @ApiProperty({ example: 'super-secret', description: 'Admin creation secret key' })
  @IsString()
  @IsNotEmpty({ message: 'secret_key is required' })
  secret_key: string;
}

