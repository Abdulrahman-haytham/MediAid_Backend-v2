import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateUsedMedicineDto {
  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  reminderTime?: string;
}
