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
export class EmergencyOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, eager: true })
  user: User;

  @Column({ type: 'varchar' })
  requestedMedicine: string;

  @Column({ type: 'text', nullable: true })
  additionalNotes: string;

  // Storing location as GeoJSON or simple lat/lng.
  // Given Pharmacy uses lat/lng columns, let's stick to consistency or use JSON if we want full Point structure.
  // Legacy used { type: 'Point', coordinates: [lng, lat] }.
  // Let's use simple lat/lng for easier querying with Pharmacy entity which uses lat/lng.
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
