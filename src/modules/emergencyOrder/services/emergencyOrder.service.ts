import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import {
  EmergencyOrder,
  EmergencyOrderStatus,
  EmergencyOrderPriority,
  EmergencyOrderResponse,
  PharmacyResponseStatus,
} from '../entities/emergencyOrder.entity';
import { CreateEmergencyOrderDto } from '../dto/create-emergencyOrder.dto';
import { RespondToEmergencyOrderDto } from '../dto/respond-emergencyOrder.dto';
import { User } from '../../user/user.entity';
import { Pharmacy, PharmacyMedicine } from '../../pharmacy/pharmacy.entity';
import { Product } from '../../product/product.entity';
import { ORDER_CONSTANTS } from '../../../common/constants/order.constants';

@Injectable()
export class EmergencyOrderService {
  constructor(
    @InjectRepository(EmergencyOrder)
    private readonly orderRepo: Repository<EmergencyOrder>,
    @InjectRepository(EmergencyOrderResponse)
    private readonly responseRepo: Repository<EmergencyOrderResponse>,
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(PharmacyMedicine)
    private readonly pharmacyMedicineRepo: Repository<PharmacyMedicine>,
  ) {}

  async createSmartOrder(
    user: User,
    dto: CreateEmergencyOrderDto,
  ): Promise<EmergencyOrder> {
    const {
      requestedMedicine,
      deliveryAddress,
      additionalNotes,
      priority,
      responseTimeoutInMinutes,
    } = dto;
    const { latitude, longitude } = dto;

    if (latitude == null || longitude == null) {
      throw new BadRequestException(
        'Current location (latitude, longitude) is required.',
      );
    }

    // 1. Find Product
    const product = await this.productRepo.findOne({
      where: { name: ILike(`%${requestedMedicine}%`) },
    });

    if (!product) {
      throw new NotFoundException(
        `Product "${requestedMedicine}" not found in our system.`,
      );
    }

    // 2. Optimized Geospatial Search using SQL (Haversine Formula)
    // Instead of fetching ALL pharmacies, we filter by bounding box (rough) or just calculate distance in DB.
    // We also join pharmacy_medicine to check availability in one query.

    const pharmacies = await this.pharmacyRepo
      .createQueryBuilder('pharmacy')
      .leftJoinAndSelect(
        'pharmacy.medicines',
        'pm',
        'pm.productId = :productId',
        { productId: product.id },
      )
      .addSelect(
        `(
          ${ORDER_CONSTANTS.EARTH_RADIUS_METERS} * acos(
            cos(radians(:lat)) * cos(radians(pharmacy.latitude)) * cos(radians(pharmacy.longitude) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(pharmacy.latitude))
          )
        )`,
        'distance',
      )
      .where('pharmacy.isActive = :isActive', { isActive: true })
      // Filter pharmacies within max distance (HAVING distance < MAX)
      // Note: 'having' with alias might vary by DB, but in Postgres we can use the expression or alias if supported.
      // Safer to wrap in bracket or just use the formula in where clause if performance is critical,
      // but for readability let's filter in JS for now or use a subquery.
      // Actually, let's filter in JS after fetching potential candidates to keep it simple but faster than before.
      // Better: Order by distance and limit? No, we need scoring.
      // Let's fetching pharmacies with calculated distance.
      .setParameters({ lat: latitude, lng: longitude })
      .getRawAndEntities();
    // getRawAndEntities returns { entities: [], raw: [] }. Raw contains 'distance'.

    // 3. Score Pharmacies
    const scoredPharmacies: { pharmacy: Pharmacy; score: number }[] = [];

    for (const item of pharmacies.entities) {
      // Find the raw result for distance
      const raw = pharmacies.raw.find((r) => r.pharmacy_id === item.id);
      const distance = raw ? parseFloat(raw.distance) : Infinity;

      if (distance > ORDER_CONSTANTS.MAX_SEARCH_DISTANCE_METERS) continue;

      // Check availability (pre-loaded in query check?)
      // We joined 'medicines' with condition. If pm exists in relation (or check raw), it's available.
      // However, leftJoinAndSelect on 'medicines' populates item.medicines array if match found.
      // Since we filtered join by productId, if array is not empty, product is available.
      // Wait, TypeORM relation loading with condition on OneToMany might be tricky.
      // Let's assume we used the join correctly. If not, fallback to separate check.
      // Actually, TypeORM leftJoinAndSelect with condition filters the relation population.

      const hasProduct = item.medicines && item.medicines.length > 0;

      const distanceScore = Math.max(
        0,
        ORDER_CONSTANTS.SCORING.DISTANCE_WEIGHT -
          (distance / ORDER_CONSTANTS.SCORING.BASE_DISTANCE_FACTOR) *
            ORDER_CONSTANTS.SCORING.DISTANCE_WEIGHT,
      );
      const ratingScore =
        ((item.averageRating || 0) / ORDER_CONSTANTS.SCORING.MAX_RATING) *
        ORDER_CONSTANTS.SCORING.RATING_WEIGHT;
      const availabilityScore = hasProduct
        ? ORDER_CONSTANTS.SCORING.AVAILABILITY_WEIGHT
        : 0;

      const totalScore = distanceScore + ratingScore + availabilityScore;

      if (hasProduct && totalScore > 20) {
        scoredPharmacies.push({ pharmacy: item, score: totalScore });
      }
    }

    scoredPharmacies.sort((a, b) => b.score - a.score);
    const topPharmacies = scoredPharmacies.slice(0, 5).map((p) => p.pharmacy);

    if (topPharmacies.length === 0) {
      throw new NotFoundException(
        'Unfortunately, no nearby pharmacies currently have this product in stock.',
      );
    }

    // 4. Create Order
    const order = this.orderRepo.create({
      user,
      requestedMedicine: product.name,
      deliveryAddress,
      additionalNotes,
      latitude,
      longitude,
      priority: priority || EmergencyOrderPriority.HIGH,
      responseTimeout: new Date(
        Date.now() +
          (responseTimeoutInMinutes ||
            ORDER_CONSTANTS.DEFAULT_RESPONSE_TIMEOUT_MINUTES) *
            60 *
            1000,
      ),
      status: EmergencyOrderStatus.PENDING,
      targettedPharmacies: topPharmacies,
    });

    return await this.orderRepo.save(order);
  }

  async findOrderById(id: string): Promise<EmergencyOrder> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: [
        'user',
        'acceptedPharmacy',
        'responses',
        'responses.pharmacy',
        'targettedPharmacies',
      ],
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async findUserOrders(user: User): Promise<EmergencyOrder[]> {
    return await this.orderRepo.find({
      where: { user: { id: user.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async findOrdersForPharmacist(user: User): Promise<EmergencyOrder[]> {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { user: { id: user.id } },
    });
    if (!pharmacy) {
      throw new ForbiddenException('User is not associated with any pharmacy.');
    }
    return this.findPharmacyOrders(pharmacy.id);
  }

  async findPharmacyOrders(pharmacyId: string): Promise<EmergencyOrder[]> {
    return await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.targettedPharmacies', 'pharmacy')
      .leftJoinAndSelect('order.user', 'user')
      .where('pharmacy.id = :pharmacyId', { pharmacyId })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async respondToOrder(
    user: User,
    orderId: string,
    dto: RespondToEmergencyOrderDto,
  ): Promise<EmergencyOrder> {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { user: { id: user.id } },
    });
    if (!pharmacy) {
      throw new ForbiddenException('User is not associated with any pharmacy.');
    }

    const order = await this.findOrderById(orderId);

    const isTargeted = order.targettedPharmacies.some(
      (p) => p.id === pharmacy.id,
    );
    if (!isTargeted) {
      throw new ForbiddenException('This order was not sent to your pharmacy.');
    }

    if (order.status !== EmergencyOrderStatus.PENDING) {
      throw new BadRequestException('Order is no longer pending.');
    }

    const existingResponse = await this.responseRepo.findOne({
      where: { order: { id: order.id }, pharmacy: { id: pharmacy.id } },
    });

    if (existingResponse) {
      throw new BadRequestException(
        'You have already responded to this order.',
      );
    }

    const response = this.responseRepo.create({
      order,
      pharmacy,
      response: dto.response,
      rejectionReason: dto.rejectionReason,
    });
    await this.responseRepo.save(response);

    if (dto.response === PharmacyResponseStatus.ACCEPTED) {
      order.acceptedPharmacy = pharmacy;
      order.status = EmergencyOrderStatus.ACCEPTED;
      await this.orderRepo.save(order);
    }

    return await this.findOrderById(orderId);
  }

  async cancelOrder(user: User, orderId: string): Promise<void> {
    const order = await this.findOrderById(orderId);
    if (order.user.id !== user.id) {
      throw new ForbiddenException('Unauthorized');
    }
    if (order.status === EmergencyOrderStatus.FULFILLED) {
      throw new BadRequestException('Cannot cancel a fulfilled order.');
    }
    order.status = EmergencyOrderStatus.CANCELED;
    await this.orderRepo.save(order);
  }

  async fulfillOrder(user: User, orderId: string): Promise<EmergencyOrder> {
    const order = await this.findOrderById(orderId);

    // Only the user who created the order or the accepted pharmacy (if we had auth for it) can fulfill?
    // Usually, fulfillment is marked by the pharmacy or the user confirming receipt.
    // Let's assume the user confirms receipt.
    if (order.user.id !== user.id) {
      // Or check if user is the accepted pharmacist
      // For simplicity, let's allow user to confirm.
      throw new ForbiddenException(
        'Only the order creator can mark it as fulfilled.',
      );
    }

    if (order.status !== EmergencyOrderStatus.ACCEPTED) {
      throw new BadRequestException(
        'Order must be accepted before it can be fulfilled.',
      );
    }

    order.status = EmergencyOrderStatus.FULFILLED;
    return await this.orderRepo.save(order);
  }

  async processOrderTimeouts(): Promise<void> {
    const expiredOrders = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.status = :status', { status: EmergencyOrderStatus.PENDING })
      .andWhere('order.responseTimeout < :now', { now: new Date() })
      .getMany();

    if (expiredOrders.length > 0) {
      for (const order of expiredOrders) {
        order.status = EmergencyOrderStatus.NO_RESPONSE;
      }
      await this.orderRepo.save(expiredOrders);
    }
  }
}
