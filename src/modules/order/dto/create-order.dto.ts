import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrderType } from '../entities/order.entity';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  pharmacyName: string;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;
}
