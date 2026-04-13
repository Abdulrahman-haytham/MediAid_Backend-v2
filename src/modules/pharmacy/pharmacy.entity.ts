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

// Custom type for PostGIS geometry columns in TypeORM
type PointGeometry = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

function simpleSlugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

@Entity('pharmacies')
@Index('idx_pharmacies_location_gist', ['location'], { spatial: true })
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

  // PostGIS geometry column for spatial queries
  // Uses SRID 4326 (WGS84) with Point feature type
  // Stored as GeoJSON: { type: 'Point', coordinates: [longitude, latitude] }
  @Column('geometry', {
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: PointGeometry;

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

  @OneToMany(() => PharmacyMedicine, (pm) => pm.pharmacy)
  medicines: PharmacyMedicine[];

  /**
   * Extract longitude from PostGIS geometry column.
   * GeoJSON Point coordinates are [longitude, latitude].
   */
  getLon(): number | null {
    return this.location?.coordinates?.[0] ?? null;
  }

  /**
   * Extract latitude from PostGIS geometry column.
   * GeoJSON Point coordinates are [longitude, latitude].
   */
  getLat(): number | null {
    return this.location?.coordinates?.[1] ?? null;
  }

  /**
   * Set the PostGIS geometry column from longitude and latitude.
   * IMPORTANT: GeoJSON Point coordinates order is [longitude, latitude].
   */
  setLocation(lon: number, lat: number): void {
    this.location = {
      type: 'Point',
      coordinates: [lon, lat],
    };
  }

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

  @ManyToOne(() => Pharmacy, (pharmacy) => pharmacy.medicines, {
    nullable: false,
  })
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
