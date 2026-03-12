import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  EmergencyOrder,
  EmergencyOrderResponse,
} from './entities/emergencyOrder.entity';
import { EmergencyOrderController } from './controllers/emergencyOrder.controller';
import { EmergencyOrderService } from './services/emergencyOrder.service';
import { Pharmacy, PharmacyMedicine } from '../pharmacy/pharmacy.entity';
import { Product } from '../product/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmergencyOrder,
      EmergencyOrderResponse,
      Pharmacy,
      PharmacyMedicine,
      Product,
    ]),
  ],
  controllers: [EmergencyOrderController],
  providers: [EmergencyOrderService],
  exports: [EmergencyOrderService],
})
export class EmergencyOrderModule {}
