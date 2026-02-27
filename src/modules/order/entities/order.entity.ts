import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { User } from '../../user/user.entity';
import { Pharmacy } from '../../pharmacy/pharmacy.entity';
import { Product } from '../../product/product.entity';

export enum OrderType {
  DELIVERY = 'delivery',
  RESERVATION = 'reservation',
}

export enum OrderStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PREPARING = 'preparing',
  IN_DELIVERY = 'in_delivery',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
}

@Index('idx_order_user', ['user'])
@Index('idx_order_pharmacy', ['pharmacy'])
@Index('idx_order_status', ['status'])
@Index('idx_order_created_at', ['createdAt'])
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  user: User;

  @ManyToOne(() => Pharmacy, { nullable: false })
  pharmacy: Pharmacy;

  @OneToMany(() => OrderItem, item => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @Column({ type: 'enum', enum: OrderType })
  orderType: OrderType;

  @Column({ type: 'varchar', nullable: true })
  deliveryAddress?: string | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'float', default: 0 })
  totalPrice: number;

  @Column({ type: 'int', nullable: true })
  ratingScore?: number | null;

  @Column({ type: 'varchar', nullable: true })
  ratingComment?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, order => order.items, { nullable: false, onDelete: 'CASCADE' })
  order: Order;

  @ManyToOne(() => Product, { nullable: false })
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar' })
  name: string;
}
