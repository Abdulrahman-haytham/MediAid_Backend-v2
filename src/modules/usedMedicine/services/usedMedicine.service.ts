import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsedMedicine, UsedMedicineItem, UsedMedicineHistory } from '../entities/usedMedicine.entity';
import { CreateUsedMedicineDto } from '../dto/create-usedMedicine.dto';
import { UpdateUsedMedicineDto } from '../dto/update-usedMedicine.dto';
import { User } from '../../user/user.entity';
import { Product } from '../../product/product.entity';

@Injectable()
export class UsedMedicineService {
  constructor(
    @InjectRepository(UsedMedicine) private readonly usedRepo: Repository<UsedMedicine>,
    @InjectRepository(UsedMedicineItem) private readonly itemRepo: Repository<UsedMedicineItem>,
    @InjectRepository(UsedMedicineHistory) private readonly historyRepo: Repository<UsedMedicineHistory>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  async addOrUpdate(user: User, dto: CreateUsedMedicineDto) {
    let doc = await this.usedRepo.findOne({ where: { user: { id: user.id } }, relations: ['items', 'items.product', 'items.history'] });
    if (!doc) {
      doc = this.usedRepo.create({ user, items: [] });
      doc = await this.usedRepo.save(doc);
    }
    const applyOne = async (input: { productId: string; dosage: string; frequency: string; startDate: string; endDate?: string; reminderTime?: string }) => {
      const product = await this.productRepo.findOne({ where: { id: input.productId } });
      if (!product) throw new NotFoundException('Product not found');
      const items = await this.itemRepo.find({ where: { usedMedicine: { id: doc.id } }, relations: ['usedMedicine', 'product', 'history'] });
      const existing = items.find(i => i.product.id === product.id);
      if (existing) {
        existing.dosage = input.dosage;
        existing.frequency = input.frequency;
        existing.startDate = input.startDate ? new Date(input.startDate) : existing.startDate;
        existing.endDate = input.endDate ? new Date(input.endDate) : existing.endDate;
        existing.reminderTime = input.reminderTime ?? existing.reminderTime;
        await this.itemRepo.save(existing);
        await this.historyRepo.save(this.historyRepo.create({ item: existing, updatedAt: new Date(), changes: 'Updated dosage/frequency' }));
        return { updated: true, item: existing };
      } else {
        const item = this.itemRepo.create({
          usedMedicine: doc,
          product,
          dosage: input.dosage,
          frequency: input.frequency,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : null,
          reminderTime: input.reminderTime || null,
        });
        const saved = await this.itemRepo.save(item);
        await this.historyRepo.save(this.historyRepo.create({ item: saved, updatedAt: new Date(), changes: 'Created medicine entry' }));
        return { updated: false, item: saved };
      }
    };
    if (dto.medicines && dto.medicines.length > 0) {
      for (const m of dto.medicines) {
        await applyOne(m);
      }
      const full = await this.usedRepo.findOne({ where: { id: doc.id }, relations: ['items', 'items.product', 'items.history'] });
      return { message: 'Medicine added successfully', medicine: full };
    } else {
      if (!dto.productId || !dto.dosage || !dto.frequency || !dto.startDate) {
        throw new NotFoundException('Missing required fields');
      }
      const res = await applyOne({
        productId: dto.productId,
        dosage: dto.dosage,
        frequency: dto.frequency,
        startDate: dto.startDate,
        endDate: dto.endDate,
        reminderTime: dto.reminderTime,
      });
      if (res.updated) {
        return { message: 'Medicine updated successfully', medicine: res.item };
      } else {
        const full = await this.usedRepo.findOne({ where: { id: doc.id }, relations: ['items', 'items.product', 'items.history'] });
        return { message: 'Medicine added successfully', medicine: full };
      }
    }
  }

  async findUserMedicines(user: User) {
    return this.usedRepo.findOne({ where: { user: { id: user.id } }, relations: ['items', 'items.product', 'items.history'] });
  }

  async updateDetails(user: User, itemId: string, dto: UpdateUsedMedicineDto) {
    const doc = await this.usedRepo.findOne({ where: { user: { id: user.id } } });
    if (!doc) throw new NotFoundException('No medicines found for this user');
    const item = await this.itemRepo.findOne({ where: { id: itemId, usedMedicine: { id: doc.id } }, relations: ['history'] });
    if (!item) throw new NotFoundException('Medicine not found');
    item.dosage = dto.dosage ?? item.dosage;
    item.frequency = dto.frequency ?? item.frequency;
    item.endDate = dto.endDate ? new Date(dto.endDate) : item.endDate;
    item.reminderTime = dto.reminderTime ?? item.reminderTime;
    await this.itemRepo.save(item);
    await this.historyRepo.save(this.historyRepo.create({ item, updatedAt: new Date(), changes: 'Updated medicine details' }));
    return item;
  }

  async delete(user: User, itemId: string) {
    const doc = await this.usedRepo.findOne({ where: { user: { id: user.id } }, relations: ['items'] });
    if (!doc) throw new NotFoundException('No medicines found for this user');
    const item = await this.itemRepo.findOne({ where: { id: itemId, usedMedicine: { id: doc.id } } });
    if (!item) throw new NotFoundException('Medicine not found');
    await this.itemRepo.delete(item.id);
  }
}
