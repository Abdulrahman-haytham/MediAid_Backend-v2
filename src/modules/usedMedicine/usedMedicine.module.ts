import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsedMedicine, UsedMedicineItem, UsedMedicineHistory } from './entities/usedMedicine.entity';
import { Product } from '../product/product.entity';
import { User } from '../user/user.entity';
import { UsedMedicineService } from './services/usedMedicine.service';
import { UsedMedicineController } from './controllers/usedMedicine.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UsedMedicine, UsedMedicineItem, UsedMedicineHistory, Product, User])],
  controllers: [UsedMedicineController],
  providers: [UsedMedicineService],
  exports: [UsedMedicineService],
})
export class UsedMedicineModule {}
