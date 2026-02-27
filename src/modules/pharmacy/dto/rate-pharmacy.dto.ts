import { IsInt, Min, Max } from 'class-validator';

export class RatePharmacyDto {
  @IsInt()
  @Min(0)
  @Max(5)
  rating: number;
}
