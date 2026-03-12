import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart, CartItem } from './cart.entity';
import { Product } from '../product/product.entity';
import { Pharmacy, PharmacyMedicine } from '../pharmacy/pharmacy.entity';
import { User } from '../user/user.entity';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      Product,
      Pharmacy,
      PharmacyMedicine,
      User,
    ]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
