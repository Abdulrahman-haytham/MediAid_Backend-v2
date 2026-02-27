import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PharmacyResponseStatus } from '../entities/emergencyOrder.entity';

export class RespondToEmergencyOrderDto {
  @IsEnum(PharmacyResponseStatus)
  @IsNotEmpty()
  response: PharmacyResponseStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
