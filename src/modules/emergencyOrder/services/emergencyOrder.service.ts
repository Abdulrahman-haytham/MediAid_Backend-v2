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

export interface SmartMatchResult {
  pharmacyId: string;
  pharmacyName: string;
  score: number;
  distance_meters: number;
  rating: number;
  hasProduct: boolean;
}

export interface SmartOrderResponse {
  order: EmergencyOrder;
  matchedPharmacies: SmartMatchResult[];
}

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

  /**
   * Create a smart emergency order using PostGIS spatial scoring.
   *
   * Scoring equation (out of 100):
   *   - Distance score (0-50): GREATEST(0, 50 - (distance_meters / max_distance) * 50)
   *   - Rating score (0-30):  (rating / 5) * 30
   *   - Availability score (0-20): 20 if drug is available, 0 otherwise
   *
   * Uses ::geography casting for accurate meter-level distance calculations
   * on the WGS84 spheroid instead of planar geometry which would be inaccurate.
   */
  async createSmartOrder(
    user: User,
    dto: CreateEmergencyOrderDto,
  ): Promise<SmartOrderResponse> {
    const {
      requestedMedicine,
      deliveryAddress,
      additionalNotes,
      priority,
      responseTimeoutInMinutes,
      latitude,
      longitude,
    } = dto;

    if (latitude == null || longitude == null) {
      throw new BadRequestException(
        'Current location (latitude, longitude) is required.',
      );
    }

    // 1. Find the matching product
    const product = await this.productRepo.findOne({
      where: { name: ILike(`%${requestedMedicine}%`) },
    });

    if (!product) {
      throw new NotFoundException(
        `Product "${requestedMedicine}" not found in our system.`,
      );
    }

    const maxDistance = ORDER_CONSTANTS.MAX_SEARCH_DISTANCE_METERS; // 50km

    // 2. Use raw SQL with PostGIS for scoring.
    // We use repository.query() because the scoring equation is complex.
    // The ::geography cast ensures accurate distance on the spheroid (not planar projection).
    // ST_DWithin uses the GIST spatial index for efficient filtering.
    const scoredResults = await this.pharmacyRepo.query(
      `
      SELECT
        p.id AS "pharmacyId",
        p.name AS "pharmacyName",
        p."averageRating" AS rating,
        ST_Distance(
          p.location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS distance_meters,
        GREATEST(0, 50 - (
          ST_Distance(
            p.location::geography,
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) / $3 * 50
        ))
        + (COALESCE(p."averageRating", 0) / 5.0 * 30)
        + (
          CASE WHEN EXISTS (
            SELECT 1 FROM pharmacy_medicines pm
            WHERE pm."pharmacyId" = p.id
              AND pm."productId" = $4
              AND pm.quantity > 0
          ) THEN 20 ELSE 0 END
        ) AS total_score,
        EXISTS (
          SELECT 1 FROM pharmacy_medicines pm
          WHERE pm."pharmacyId" = p.id
            AND pm."productId" = $4
            AND pm.quantity > 0
        ) AS "hasProduct"
      FROM pharmacies p
      WHERE p."isActive" = true
        AND ST_DWithin(
          p.location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $3
        )
      ORDER BY total_score DESC
      LIMIT 5
      `,
      [longitude, latitude, maxDistance, product.id],
    );

    if (scoredResults.length === 0) {
      throw new NotFoundException(
        'Unfortunately, no nearby pharmacies currently have this product in stock.',
      );
    }

    // 3. Build the matched pharmacies list
    const matchedPharmacies: SmartMatchResult[] = scoredResults.map(
      (row: any) => ({
        pharmacyId: row.pharmacyId,
        pharmacyName: row.pharmacyName,
        score: Math.round(parseFloat(row.total_score) * 100) / 100,
        distance_meters: Math.round(parseFloat(row.distance_meters)),
        rating: parseFloat(row.rating) || 0,
        hasProduct: row.hasProduct === true || row.hasProduct === 't',
      }),
    );

    // 4. Fetch full Pharmacy entities for the order relation
    const pharmacyIds = matchedPharmacies.map((p) => p.pharmacyId);
    const pharmacies = await this.pharmacyRepo.findByIds(pharmacyIds);

    // 5. Create the emergency order
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
      targettedPharmacies: pharmacies,
    });

    // Set the PostGIS geometry column for the order
    order.setLocation(longitude, latitude);

    const savedOrder = await this.orderRepo.save(order);

    return {
      order: savedOrder,
      matchedPharmacies,
    };
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
