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
  OneToMany,
} from 'typeorm';
import { User } from '../user/user.entity';
import { Product } from '../product/product.entity';

function simpleSlugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

@Entity('pharmacies')
export class Pharmacy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160, unique: true })
  slug: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'float' })
  latitude: number;

  @Column({ type: 'float' })
  longitude: number;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'varchar' })
  openingMorningFrom: string;

  @Column({ type: 'varchar' })
  openingMorningTo: string;

  @Column({ type: 'varchar' })
  openingEveningFrom: string;

  @Column({ type: 'varchar' })
  openingEveningTo: string;

  @Column({ type: 'simple-array', default: '' })
  workingDays: string[];

  @Column({ type: 'varchar' })
  imageUrl: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'simple-array', default: '' })
  services: string[];

  @Column({ type: 'boolean', default: false })
  hasDelivery: boolean;

  @Column({ type: 'varchar', nullable: true })
  facebook?: string | null;

  @Column({ type: 'varchar', nullable: true })
  instagram?: string | null;

  @Column({ type: 'varchar', nullable: true })
  twitter?: string | null;

  @Column({ type: 'varchar', nullable: true })
  website?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'float', default: 0 })
  averageRating: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => PharmacyMedicine, pm => pm.pharmacy)
  medicines: PharmacyMedicine[];

  @BeforeInsert()
  @BeforeUpdate()
  setSlug() {
    if (this.name) {
      this.slug = simpleSlugify(this.name);
    }
  }
}

@Entity('pharmacy_medicines')
export class PharmacyMedicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Pharmacy, pharmacy => pharmacy.medicines, { nullable: false })
  pharmacy: Pharmacy;

  @ManyToOne(() => Product, { nullable: false })
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'float' })
  price: number;

  @Column({ type: 'timestamp', nullable: true })
  expiryDate?: Date;

  @Column({ type: 'varchar', nullable: true })
  batchNumber?: string;
}

@Entity('pharmacy_reviews')
export class PharmacyReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Pharmacy, { nullable: false })
  pharmacy: Pharmacy;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Column({ type: 'int' })
  rating: number;

  @CreateDateColumn()
  createdAt: Date;
}
