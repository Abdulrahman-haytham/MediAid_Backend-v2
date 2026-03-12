import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order, OrderItem } from './entities/order.entity';
import { OrderService } from './services/order.service';
import { OrderController } from './controllers/order.controller';
import { User } from '../user/user.entity';
import { Pharmacy, PharmacyMedicine } from '../pharmacy/pharmacy.entity';
import { Product } from '../product/product.entity';
import { Category } from '../category/category.entity';
import { Cart, CartItem } from '../cart/cart.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      User,
      Pharmacy,
      PharmacyMedicine,
      Product,
      Category,
      Cart,
      CartItem,
    ]),
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
