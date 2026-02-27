import { Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany, Column, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../user/user.entity';
import { Product } from '../../product/product.entity';

@Entity('used_medicine')
export class UsedMedicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @OneToMany(() => UsedMedicineItem, item => item.usedMedicine, { cascade: true, eager: true })
  items: UsedMedicineItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('used_medicine_item')
export class UsedMedicineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UsedMedicine, um => um.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn()
  usedMedicine: UsedMedicine;

  @ManyToOne(() => Product, { nullable: false })
  product: Product;

  @Column({ type: 'varchar' })
  dosage: string;

  @Column({ type: 'varchar' })
  frequency: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  reminderTime?: string | null;

  @OneToMany(() => UsedMedicineHistory, h => h.item, { cascade: true, eager: true })
  history: UsedMedicineHistory[];
}

@Entity('used_medicine_history')
export class UsedMedicineHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UsedMedicineItem, item => item.history, { nullable: false, onDelete: 'CASCADE' })
  item: UsedMedicineItem;

  @Column({ type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'varchar' })
  changes: string;
}
