import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
  ManyToOne,
} from 'typeorm';
import { Category } from '../category/category.entity';
import { User } from '../user/user.entity';

export enum ProductType {
  MEDICINE = 'Medicine',
  MEDICAL_SUPPLY = 'Medical Supply',
  PERSONAL_CARE = 'Personal Care',
  VITAMIN = 'Vitamin',
  OTHER = 'Other',
}

function simpleSlugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160, unique: true })
  slug: string;

  @Column({ type: 'enum', enum: ProductType, default: ProductType.MEDICINE })
  type: ProductType;

  @ManyToOne(() => Category, { eager: false, nullable: false })
  category: Category;

  @Column({ type: 'varchar', length: 128, nullable: true })
  sub_category?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  brand?: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  manufacturer?: string | null;

  @Column({ type: 'varchar' })
  imageUrl: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'float' })
  price: number;

  @ManyToOne(() => User, { eager: false, nullable: false })
  createdBy: User;

  @Column({ type: 'boolean', default: false })
  isAdminCreated: boolean;

  @Column({ type: 'boolean', default: false })
  requiresPrescription: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  setSlug() {
    if (this.name) {
      this.slug = simpleSlugify(this.name);
    }
  }
}
