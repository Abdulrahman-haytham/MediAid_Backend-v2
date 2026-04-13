import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Order,
  OrderItem,
  OrderStatus,
  OrderType,
} from '../entities/order.entity';
import { OrderReview } from '../entities/order-review.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { CreateOrderReviewDto } from '../dto/create-order-review.dto';
import { RateOrderDto } from '../dto/update-order.dto';
import { User, UserRole } from '../../user/user.entity';
import { Pharmacy } from '../../pharmacy/pharmacy.entity';
import { Product } from '../../product/product.entity';
import { Cart, CartItem } from '../../cart/cart.entity';
import { PharmacyMedicine } from '../../pharmacy/pharmacy.entity';

function simpleSlugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(OrderReview)
    private readonly orderReviewRepo: Repository<OrderReview>,
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
  ) {}

  private async assertCanAccessOrder(order: Order, user: User): Promise<void> {
    if (user.type === UserRole.ADMIN) {
      return;
    }
    if (user.type === UserRole.USER) {
      if (order.user.id !== user.id) {
        throw new ForbiddenException('Unauthorized access to this order');
      }
      return;
    }
    if (user.type === UserRole.PHARMACIST) {
      const pharmacy = await this.pharmacyRepo.findOne({
        where: { user: { id: user.id } },
        relations: ['user'],
      });
      if (!pharmacy || pharmacy.id !== order.pharmacy.id) {
        throw new ForbiddenException('Unauthorized access to this order');
      }
      return;
    }
    throw new ForbiddenException('Unauthorized role');
  }

  async createOrderFromCart(user: User, dto: CreateOrderDto): Promise<Order> {
    return this.orderRepo.manager.transaction(async (manager) => {
      const { pharmacyName, orderType, deliveryAddress, prescriptionImageUrl } = dto;
      if (!pharmacyName || !orderType) {
        throw new ConflictException(
          'Pharmacy name and order type are required.',
        );
      }
      if (orderType === OrderType.DELIVERY && !deliveryAddress) {
        throw new ConflictException(
          'Delivery address is required for delivery orders.',
        );
      }

      const pharmacySlug = simpleSlugify(pharmacyName);
      const pharmacyRepo = manager.getRepository(Pharmacy);
      const cartRepo = manager.getRepository(Cart);
      const cartItemRepo = manager.getRepository(CartItem);
      const pharmMedRepo = manager.getRepository(PharmacyMedicine);
      const orderRepo = manager.getRepository(Order);
      const orderItemRepo = manager.getRepository(OrderItem);

      // Load cart
      const cart = await cartRepo.findOne({
        where: { user: { id: user.id } },
        relations: ['items', 'items.product', 'items.pharmacy'],
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        throw new ConflictException('Your cart is empty.');
      }

      // Check if any product requires prescription
      const hasPrescriptionProduct = cart.items.some(
        (item) => item.product?.requiresPrescription,
      );

      if (hasPrescriptionProduct && !prescriptionImageUrl) {
        throw new BadRequestException(
          'One or more products require a prescription. Please provide prescriptionImageUrl.',
        );
      }

      const pharmacy = await pharmacyRepo.findOne({
        where: { slug: pharmacySlug },
      });
      if (!pharmacy) {
        throw new NotFoundException(`Pharmacy "${pharmacyName}" not found.`);
      }

      const validPharmacyItems: Array<{
        cartItemId: string;
        product: Product;
        quantity: number;
        price: number;
        name: string;
        stock: PharmacyMedicine;
      }> = [];
      let totalPrice = 0;
      for (const cartItem of cart.items) {
        if (cartItem.pharmacy.id === pharmacy.id) {
          const stock = await pharmMedRepo
            .createQueryBuilder('pm')
            .leftJoinAndSelect('pm.pharmacy', 'pharmacy')
            .leftJoinAndSelect('pm.product', 'product')
            .where('pharmacy.id = :pharmacyId', { pharmacyId: pharmacy.id })
            .andWhere('product.id = :productId', {
              productId: cartItem.product.id,
            })
            .setLock('pessimistic_write')
            .getOne();
          if (stock) {
            const itemPrice = stock.price || 0;
            const quantity = cartItem.quantity || 0;
            if (quantity <= 0 || stock.quantity < quantity) {
              throw new ConflictException(
                `Insufficient stock for ${cartItem.product.name}.`,
              );
            }
            const itemTotalPrice = quantity * itemPrice;
            const itemName = cartItem.product.name || 'Unknown Product';
            validPharmacyItems.push({
              cartItemId: cartItem.id,
              product: cartItem.product,
              quantity,
              price: itemPrice,
              name: itemName,
              stock,
            });
            totalPrice += itemTotalPrice;
          }
        }
      }
      if (validPharmacyItems.length === 0) {
        throw new ConflictException(
          `No valid items from ${pharmacyName} found in your cart to create an order.`,
        );
      }
      const order = orderRepo.create({
        user,
        pharmacy,
        orderType,
        deliveryAddress:
          orderType === OrderType.DELIVERY ? deliveryAddress : null,
        prescriptionImageUrl: prescriptionImageUrl || null,
        status: OrderStatus.PENDING,
        totalPrice,
      });
      const savedOrder = await orderRepo.save(order);
      for (const item of validPharmacyItems) {
        const orderItem = orderItemRepo.create({
          order: savedOrder,
          product: item.product,
          quantity: item.quantity,
          name: item.name,
        });
        await orderItemRepo.save(orderItem);
        item.stock.quantity -= item.quantity;
        await pharmMedRepo.save(item.stock);
      }
      const orderedCartItemIds = new Set(
        validPharmacyItems.map((i) => i.cartItemId),
      );
      for (const cartItem of cart.items) {
        if (orderedCartItemIds.has(cartItem.id)) {
          await cartItemRepo.delete(cartItem.id);
        }
      }
      const finalOrder = await orderRepo.findOne({
        where: { id: savedOrder.id },
        relations: ['items', 'pharmacy', 'user'],
      });
      if (!finalOrder)
        throw new NotFoundException('Order not found after creation');
      return finalOrder;
    });
  }

  private validateStatusTransition(
    current: OrderStatus,
    next: OrderStatus,
    user: User,
  ) {
    const allowedNext: Record<
      UserRole,
      Partial<Record<OrderStatus, OrderStatus[]>>
    > = {
      [UserRole.USER]: {
        [OrderStatus.PENDING]: [OrderStatus.CANCELED],
      },
      [UserRole.PHARMACIST]: {
        [OrderStatus.PENDING]: [
          OrderStatus.ACCEPTED,
          OrderStatus.REJECTED,
          OrderStatus.CANCELED,
        ],
        [OrderStatus.ACCEPTED]: [
          OrderStatus.PREPARING,
          OrderStatus.IN_DELIVERY,
          OrderStatus.CANCELED,
        ],
        [OrderStatus.PREPARING]: [
          OrderStatus.IN_DELIVERY,
          OrderStatus.CANCELED,
        ],
        [OrderStatus.IN_DELIVERY]: [
          OrderStatus.DELIVERED,
          OrderStatus.CANCELED,
        ],
      },
      [UserRole.ADMIN]: {
        [OrderStatus.PENDING]: [
          OrderStatus.ACCEPTED,
          OrderStatus.REJECTED,
          OrderStatus.PREPARING,
          OrderStatus.IN_DELIVERY,
          OrderStatus.DELIVERED,
          OrderStatus.CANCELED,
        ],
        [OrderStatus.ACCEPTED]: [
          OrderStatus.PREPARING,
          OrderStatus.IN_DELIVERY,
          OrderStatus.DELIVERED,
          OrderStatus.CANCELED,
        ],
        [OrderStatus.PREPARING]: [
          OrderStatus.IN_DELIVERY,
          OrderStatus.DELIVERED,
          OrderStatus.CANCELED,
        ],
        [OrderStatus.IN_DELIVERY]: [
          OrderStatus.DELIVERED,
          OrderStatus.CANCELED,
        ],
      },
    };
    const roleTransitions = allowedNext[user.type];
    if (!roleTransitions) {
      throw new ForbiddenException('Unauthorized type to update this order');
    }
    const allowed = roleTransitions[current] || [];
    if (!allowed.includes(next)) {
      if (user.type === UserRole.USER && next !== OrderStatus.CANCELED) {
        throw new ForbiddenException(
          'Users can only cancel their pending orders',
        );
      }
      if (user.type === UserRole.PHARMACIST) {
        if (next === OrderStatus.ACCEPTED || next === OrderStatus.REJECTED) {
          throw new ConflictException(
            'Order cannot be accepted or rejected at this stage',
          );
        }
        if (
          [
            OrderStatus.PREPARING,
            OrderStatus.IN_DELIVERY,
            OrderStatus.DELIVERED,
          ].includes(next)
        ) {
          throw new ConflictException(
            'Order must be accepted first before moving to the next stages',
          );
        }
        if (next === OrderStatus.CANCELED) {
          throw new ConflictException('Cannot cancel order at this stage');
        }
        throw new ConflictException('Invalid status change by pharmacist');
      }
      throw new ConflictException('Invalid status update');
    }
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    user: User,
  ): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'pharmacy', 'items', 'items.product'],
    });
    if (!order) throw new NotFoundException('Order not found');
    await this.assertCanAccessOrder(order, user);
    const validStatuses: OrderStatus[] = [
      OrderStatus.ACCEPTED,
      OrderStatus.REJECTED,
      OrderStatus.PREPARING,
      OrderStatus.IN_DELIVERY,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELED,
    ];
    if (!validStatuses.includes(newStatus)) {
      throw new ConflictException('Invalid status update');
    }
    this.validateStatusTransition(order.status, newStatus, user);

    // Restore stock if order is canceled or rejected
    if (newStatus === OrderStatus.CANCELED || newStatus === OrderStatus.REJECTED) {
      await this.restoreOrderItemsStock(order);
    }

    order.status = newStatus;
    await this.orderRepo.save(order);
    return order;
  }

  private async restoreOrderItemsStock(order: Order): Promise<void> {
    for (const item of order.items) {
      const stock = await this.orderRepo.manager
        .getRepository(PharmacyMedicine)
        .createQueryBuilder('pm')
        .leftJoinAndSelect('pm.pharmacy', 'pharmacy')
        .leftJoinAndSelect('pm.product', 'product')
        .where('pharmacy.id = :pharmacyId', { pharmacyId: order.pharmacy.id })
        .andWhere('product.id = :productId', { productId: item.product.id })
        .setLock('pessimistic_write')
        .getOne();

      if (stock) {
        stock.quantity += item.quantity;
        await this.orderRepo.manager.save(PharmacyMedicine, stock);
      }
    }
  }

  async findOrdersForPharmacy(userId: string) {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!pharmacy) throw new ForbiddenException('Unauthorized access');
    return this.orderRepo.find({
      where: { pharmacy: { id: pharmacy.id } },
      relations: ['user', 'items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOrdersForUser(userId: string) {
    const orders = await this.orderRepo.find({
      where: { user: { id: userId } },
      relations: ['pharmacy'],
      order: { createdAt: 'DESC' },
    });
    return orders.map((order) => ({
      orderId: order.id,
      pharmacyId: order.pharmacy?.id,
      pharmacyName: order.pharmacy?.name,
      status: order.status,
      orderType: order.orderType,
      createdAt: order.createdAt,
      totalPrice: order.totalPrice,
    }));
  }

  async findOrderDetails(orderId: string, user: User) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'items', 'items.product', 'pharmacy'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    await this.assertCanAccessOrder(order, user);
    return order;
  }

  async rateExistingOrder(orderId: string, userId: string, dto: RateOrderDto) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'pharmacy'],
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.user.id !== userId)
      throw new ForbiddenException('Unauthorized to rate this order');
    if (order.status !== OrderStatus.DELIVERED)
      throw new ConflictException('You can only rate delivered orders');
    if (order.ratingScore)
      throw new ConflictException('Order has already been rated');
    order.ratingScore = dto.rating;
    order.ratingComment = dto.comment || null;
    await this.orderRepo.save(order);
    return order;
  }

  async submitOrderReview(
    orderId: string,
    user: User,
    dto: CreateOrderReviewDto,
  ) {
    // Find order with relations
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'pharmacy'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify ownership
    if (order.user.id !== user.id) {
      throw new ForbiddenException('Unauthorized to review this order');
    }

    // Verify order is delivered
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('You can only review delivered orders');
    }

    // Check if review already exists
    const existingReview = await this.orderReviewRepo.findOne({
      where: { order: { id: orderId } },
    });

    if (existingReview) {
      throw new ConflictException('Order has already been reviewed');
    }

    // Create review
    const review = this.orderReviewRepo.create({
      order,
      orderId: order.id,
      user,
      pharmacy: order.pharmacy,
      rating: dto.rating,
      comment: dto.comment || null,
    });

    const savedReview = await this.orderReviewRepo.save(review);

    return {
      message: 'Review submitted successfully',
      review: savedReview,
    };
  }

  async getPharmacyReviews(pharmacyId: string) {
    const reviews = await this.orderReviewRepo.find({
      where: { pharmacy: { id: pharmacyId } },
      relations: ['user', 'order'],
      order: { createdAt: 'DESC' },
    });

    return {
      pharmacyId,
      reviews,
      averageRating:
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0,
      totalReviews: reviews.length,
    };
  }

  async cancelOrderByUser(orderId: string, user: User) {
    return this.orderRepo.manager.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: ['user', 'items', 'items.product', 'pharmacy'],
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Verify ownership
      if (order.user.id !== user.id && user.type !== UserRole.ADMIN) {
        throw new ForbiddenException('Unauthorized to cancel this order');
      }

      // Can only cancel pending orders
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          'Only pending orders can be canceled. Current status: ' + order.status,
        );
      }

      // Restore stock for each item
      const pharmMedRepo = manager.getRepository(PharmacyMedicine);
      for (const item of order.items) {
        const stock = await pharmMedRepo.findOne({
          where: {
            pharmacy: { id: order.pharmacy.id },
            product: { id: item.product.id },
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (stock) {
          stock.quantity += item.quantity;
          await pharmMedRepo.save(stock);
        }
      }

      // Update order status
      order.status = OrderStatus.CANCELED;
      await manager.save(Order, order);

      return {
        message: 'Order canceled successfully',
        orderId: order.id,
        refundedItems: order.items.length,
      };
    });
  }
}
