import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pharmacy, PharmacyMedicine, PharmacyReview } from './pharmacy.entity';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';
import { Category } from '../category/category.entity';
import { PharmacyService } from './pharmacy.service';
import { PharmacyController } from './pharmacy.controller';
import { CartModule } from '../cart/cart.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pharmacy, PharmacyMedicine, PharmacyReview, Product, User, Category]),
    CartModule,
    OrderModule,
  ],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
