import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/user.entity';
import { Pharmacy } from '../../pharmacy/pharmacy.entity';

// Custom type for PostGIS geometry columns in TypeORM
type PointGeometry = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

export enum EmergencyOrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  FULFILLED = 'fulfilled',
  CANCELED = 'canceled',
  NO_RESPONSE = 'no_response',
}

export enum EmergencyOrderPriority {
  HIGH = 'high',
  NORMAL = 'normal',
}

@Entity('emergency_orders')
@Index('idx_emergency_orders_location_gist', ['location'], { spatial: true })
export class EmergencyOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, eager: true })
  user: User;

  @Column({ type: 'varchar' })
  requestedMedicine: string;

  @Column({ type: 'text', nullable: true })
  additionalNotes: string;

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
  deliveryAddress: string;

  @Column({
    type: 'enum',
    enum: EmergencyOrderStatus,
    default: EmergencyOrderStatus.PENDING,
  })
  status: EmergencyOrderStatus;

  @ManyToMany(() => Pharmacy)
  @JoinTable()
  targettedPharmacies: Pharmacy[];

  @OneToMany(() => EmergencyOrderResponse, (response) => response.order, {
    cascade: true,
    eager: true,
  })
  responses: EmergencyOrderResponse[];

  @ManyToOne(() => Pharmacy, { nullable: true })
  acceptedPharmacy: Pharmacy;

  @Column({
    type: 'enum',
    enum: EmergencyOrderPriority,
    default: EmergencyOrderPriority.HIGH,
  })
  priority: EmergencyOrderPriority;

  @Column({ type: 'timestamp' })
  responseTimeout: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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
}

export enum PharmacyResponseStatus {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('emergency_order_responses')
export class EmergencyOrderResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EmergencyOrder, (order) => order.responses, {
    onDelete: 'CASCADE',
  })
  order: EmergencyOrder;

  @ManyToOne(() => Pharmacy, { nullable: false, eager: true })
  pharmacy: Pharmacy;

  @Column({
    type: 'enum',
    enum: PharmacyResponseStatus,
  })
  response: PharmacyResponseStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  responseTime: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string;
}
