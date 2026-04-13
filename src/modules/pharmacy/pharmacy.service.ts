import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, LessThan } from 'typeorm';
import { Pharmacy, PharmacyMedicine, PharmacyReview } from './pharmacy.entity';
import { CreatePharmacyDto } from './dto/create-pharmacy.dto';
import { UpdatePharmacyDto } from './dto/update-pharmacy.dto';
import { RatePharmacyDto } from './dto/rate-pharmacy.dto';
import { AddProductDto } from './dto/add-product.dto';
import { CreateProductForPharmacyDto } from './dto/create-product-for-pharmacy.dto';
import { User, UserRole } from '../user/user.entity';
import { Product, ProductType } from '../product/product.entity';
import { Category } from '../category/category.entity';

export interface NearbyPharmacyResult {
  id: string;
  name: string;
  address: string;
  phone: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  distance_meters: number;
  averageRating: number;
  services: string[];
  imageUrl: string;
}

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(PharmacyMedicine)
    private readonly pharmMedRepo: Repository<PharmacyMedicine>,
    @InjectRepository(PharmacyReview)
    private readonly reviewRepo: Repository<PharmacyReview>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async create(user: User, dto: CreatePharmacyDto): Promise<Pharmacy> {
    if (!user) throw new ForbiddenException('Authentication required');
    if (user.type !== UserRole.PHARMACIST)
      throw new ForbiddenException('Only pharmacists can create pharmacies');
    const exists = await this.pharmacyRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });
    if (exists)
      throw new ConflictException('Pharmacy already exists for this user');
    const pharmacy = this.pharmacyRepo.create({
      user,
      name: dto.name,
      address: dto.address,
      // Set both legacy lat/lng columns and the new PostGIS geometry column
      latitude: dto.location.latitude,
      longitude: dto.location.longitude,
      location: {
        type: 'Point',
        coordinates: [dto.location.longitude, dto.location.latitude],
      },
      phone: dto.phone,
      openingMorningFrom: dto.openingHours.morningFrom,
      openingMorningTo: dto.openingHours.morningTo,
      openingEveningFrom: dto.openingHours.eveningFrom,
      openingEveningTo: dto.openingHours.eveningTo,
      workingDays: dto.workingDays || [],
      imageUrl: dto.imageUrl,
      description: dto.description,
      services: dto.services || [],
      facebook: dto.facebook,
      instagram: dto.instagram,
      twitter: dto.twitter,
      website: dto.website,
      isActive: true,
      hasDelivery: dto.hasDelivery ?? false,
    });
    return this.pharmacyRepo.save(pharmacy);
  }

  async updateByUser(user: User, dto: UpdatePharmacyDto): Promise<Pharmacy> {
    if (!user) throw new ForbiddenException('Authentication required');
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });
    if (!pharmacy)
      throw new NotFoundException('Pharmacy not found or unauthorized');
    if (dto.location) {
      pharmacy.latitude = dto.location.latitude;
      pharmacy.longitude = dto.location.longitude;
      // Sync the PostGIS geometry column as well
      pharmacy.location = {
        type: 'Point',
        coordinates: [dto.location.longitude, dto.location.latitude],
      };
      delete (dto as any).location;
    }
    if (dto.openingHours) {
      pharmacy.openingMorningFrom =
        dto.openingHours.morningFrom ?? pharmacy.openingMorningFrom;
      pharmacy.openingMorningTo =
        dto.openingHours.morningTo ?? pharmacy.openingMorningTo;
      pharmacy.openingEveningFrom =
        dto.openingHours.eveningFrom ?? pharmacy.openingEveningFrom;
      pharmacy.openingEveningTo =
        dto.openingHours.eveningTo ?? pharmacy.openingEveningTo;
      delete (dto as any).openingHours;
    }
    Object.assign(pharmacy, dto);
    return this.pharmacyRepo.save(pharmacy);
  }

  async findAllActive() {
    const items = await this.pharmacyRepo.find({ where: { isActive: true } });
    return items.map((ph) => ({
      id: ph.id,
      name: ph.name,
      address: ph.address,
      phone: ph.phone,
      openingHours: {
        formatted: `الصباح: من ${ph.openingMorningFrom} إلى ${ph.openingMorningTo}, المساء: من ${ph.openingEveningFrom} إلى ${ph.openingEveningTo}`,
        raw: {
          morningFrom: ph.openingMorningFrom,
          morningTo: ph.openingMorningTo,
          eveningFrom: ph.openingEveningFrom,
          eveningTo: ph.openingEveningTo,
        },
      },
      workingDays: ph.workingDays,
      imageUrl: ph.imageUrl,
      averageRating: ph.averageRating,
      services: ph.services,
      latitude: ph.latitude,
      longitude: ph.longitude,
    }));
  }

  async searchByName(name: string) {
    return this.pharmacyRepo.find({
      where: { name: ILike(`%${name}%`), isActive: true },
    });
  }

  async findMine(user: User) {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });
    if (!pharmacy)
      throw new NotFoundException('لم يتم العثور على صيدلية لهذا المستخدم');
    const reviews = await this.reviewRepo.find({
      where: { pharmacy: { id: pharmacy.id } },
      relations: ['user'],
    });
    const reviewCount = reviews.length;
    const avg = pharmacy.averageRating;
    let ratingLabel = '';
    if (avg >= 4.5) ratingLabel = 'ممتاز';
    else if (avg >= 3.5) ratingLabel = 'جيد جداً';
    else if (avg >= 2.5) ratingLabel = 'جيد';
    else if (avg > 0) ratingLabel = 'ضعيف';
    else ratingLabel = 'لا يوجد تقييم بعد';
    return {
      pharmacy: {
        id: pharmacy.id,
        name: pharmacy.name,
        address: pharmacy.address,
        phone: pharmacy.phone,
        openingHours: {
          formatted: `الصباح: من ${pharmacy.openingMorningFrom} إلى ${pharmacy.openingMorningTo}, المساء: من ${pharmacy.openingEveningFrom} إلى ${pharmacy.openingEveningTo}`,
          raw: {
            morningFrom: pharmacy.openingMorningFrom,
            morningTo: pharmacy.openingMorningTo,
            eveningFrom: pharmacy.openingEveningFrom,
            eveningTo: pharmacy.openingEveningTo,
          },
        },
        workingDays: pharmacy.workingDays,
        imageUrl: pharmacy.imageUrl,
        description: pharmacy.description,
        location: {
          longitude: pharmacy.longitude,
          latitude: pharmacy.latitude,
        },
        services: pharmacy.services,
        socialMedia: {
          facebook: pharmacy.facebook,
          instagram: pharmacy.instagram,
          twitter: pharmacy.twitter,
        },
        website: pharmacy.website,
        reviews: reviews.map((r) => ({ userId: r.user.id, rating: r.rating })),
        reviewCount,
        averageRating: pharmacy.averageRating,
        ratingLabel,
        isActive: pharmacy.isActive,
        createdAt: pharmacy.createdAt,
        updatedAt: pharmacy.updatedAt,
      },
    };
  }

  async checkUserPharmacy(userId: string) {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (pharmacy) {
      return {
        hasPharmacy: true,
        pharmacyId: pharmacy.id,
        pharmacyName: pharmacy.name,
      };
    }
    return { hasPharmacy: false };
  }

  async ratePharmacy(pharmacyId: string, user: User, dto: RatePharmacyDto) {
    if (dto.rating < 0 || dto.rating > 5) {
      throw new ConflictException('Rating must be between 0 and 5');
    }
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { id: pharmacyId },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');
    const existing = await this.reviewRepo.findOne({
      where: { pharmacy: { id: pharmacyId }, user: { id: user.id } },
      relations: ['pharmacy', 'user'],
    });
    if (existing)
      throw new ConflictException('You have already rated this pharmacy');
    const review = this.reviewRepo.create({
      pharmacy,
      user,
      rating: dto.rating,
    });
    await this.reviewRepo.save(review);
    const all = await this.reviewRepo.find({
      where: { pharmacy: { id: pharmacyId } },
    });
    const avg = all.length
      ? all.reduce((a, b) => a + b.rating, 0) / all.length
      : 0;
    pharmacy.averageRating = avg;
    await this.pharmacyRepo.save(pharmacy);
    return { averageRating: pharmacy.averageRating };
  }

  async getPharmacyDetails(pharmacyId: string) {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { id: pharmacyId },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');
    return {
      id: pharmacy.id,
      name: pharmacy.name,
      imageUrl: pharmacy.imageUrl,
      address: pharmacy.address,
      phone: pharmacy.phone,
      openingHours: {
        formatted: `الصباح: من ${pharmacy.openingMorningFrom} إلى ${pharmacy.openingMorningTo}, المساء: من ${pharmacy.openingEveningFrom} إلى ${pharmacy.openingEveningTo}`,
        raw: {
          morningFrom: pharmacy.openingMorningFrom,
          morningTo: pharmacy.openingMorningTo,
          eveningFrom: pharmacy.openingEveningFrom,
          eveningTo: pharmacy.openingEveningTo,
        },
      },
      workingDays: pharmacy.workingDays,
      description: pharmacy.description,
      services: pharmacy.services,
      socialMedia: {
        facebook: pharmacy.facebook,
        instagram: pharmacy.instagram,
        twitter: pharmacy.twitter,
      },
      website: pharmacy.website,
      averageRating: pharmacy.averageRating,
      isActive: pharmacy.isActive,
      location: { longitude: pharmacy.longitude, latitude: pharmacy.latitude },
    };
  }

  async addProductToStock(user: User, dto: AddProductDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');

    const where: any = {
      pharmacy: { id: pharmacy.id },
      product: { id: product.id },
    };
    if (dto.batchNumber) {
      where.batchNumber = dto.batchNumber;
    }

    let record = await this.pharmMedRepo.findOne({
      where,
      relations: ['pharmacy', 'product'],
    });

    if (record) {
      record.quantity += dto.quantity;
      record.price = dto.price;
    } else {
      record = this.pharmMedRepo.create({
        pharmacy,
        product,
        quantity: dto.quantity,
        price: dto.price,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        batchNumber: dto.batchNumber,
      });
    }
    await this.pharmMedRepo.save(record);
    return { pharmacyId: pharmacy.id };
  }

  async getPharmacyMedicines(pharmacyId: string) {
    const items = await this.pharmMedRepo.find({
      where: { pharmacy: { id: pharmacyId } },
      relations: ['product'],
    });
    return {
      pharmacyId,
      medicines: items.map((m) => ({
        medicineId: m.product.id,
        name: m.product.name,
        imageUrl: m.product.imageUrl,
        description: m.product.description,
        category: (m.product as any).category,
        quantity: m.quantity,
        price: m.price,
      })),
    };
  }

  async searchMedicineInPharmacy(pharmacyId: string, name: string) {
    if (!name) throw new ConflictException('يرجى تحديد اسم الدواء للبحث');
    const items = await this.pharmMedRepo.find({
      where: { pharmacy: { id: pharmacyId } },
      relations: ['product'],
    });
    const matched = items
      .filter((i) => i.product.name.toLowerCase().includes(name.toLowerCase()))
      .map((m) => ({
        id: m.product.id,
        name: m.product.name,
        imageUrl: m.product.imageUrl,
        price: m.price,
      }));
    return { medicines: matched };
  }

  async getExpiringMedicines(user: User) {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { user: { id: user.id } },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');

    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    const items = await this.pharmMedRepo.find({
      where: {
        pharmacy: { id: pharmacy.id },
        expiryDate: LessThan(threeMonthsFromNow),
      },
      relations: ['product'],
    });

    return items.map((m) => ({
      id: m.id,
      productName: m.product.name,
      expiryDate: m.expiryDate,
      quantity: m.quantity,
      batchNumber: m.batchNumber,
    }));
  }

  async getLowStockMedicines(user: User, threshold: number = 10) {
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { user: { id: user.id } },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');

    const items = await this.pharmMedRepo.find({
      where: {
        pharmacy: { id: pharmacy.id },
        quantity: LessThan(threshold),
      },
      relations: ['product'],
    });

    return items.map((m) => ({
      id: m.id,
      productName: m.product.name,
      quantity: m.quantity,
      price: m.price,
    }));
  }

  /**
   * Find nearby pharmacies using PostGIS spatial functions.
   * Uses ST_DWithin for efficient filtering (leverages GIST index)
   * and ST_Distance with ::geography casting for accurate meter-level distances.
   *
   * @param lon Longitude (GeoJSON coordinate order: [lon, lat])
   * @param lat Latitude
   * @param maxDistance Search radius in meters (default: 5000)
   * @returns Array of nearby pharmacies sorted by distance ascending
   */
  async findNearbyPharmacies(
    lon: number,
    lat: number,
    maxDistance = 5000,
  ): Promise<NearbyPharmacyResult[]> {
    // ST_DWithin with ::geography uses the GIST spatial index for efficient filtering.
    // ST_Distance with ::geography returns accurate meter-level distances on the spheroid.
    // ST_AsGeoJSON converts the geometry to GeoJSON format for frontend compatibility.
    const rawResults = await this.pharmacyRepo
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.name AS name',
        'p.address AS address',
        'p.phone AS phone',
        'p."averageRating" AS "averageRating"',
        'p.services AS services',
        'p."imageUrl" AS "imageUrl"',
        'ST_AsGeoJSON(p.location)::json AS location',
        'ST_Distance(p.location::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography) AS distance_meters',
      ])
      .where(
        `ST_DWithin(p.location::geography, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, :radius)`,
        { lon, lat, radius: maxDistance },
      )
      .andWhere('p."isActive" = :isActive', { isActive: true })
      .orderBy('distance_meters', 'ASC')
      .getRawMany();

    return rawResults.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      averageRating: parseFloat(row.averageRating) || 0,
      services: Array.isArray(row.services) ? row.services : [],
      imageUrl: row.imageurl || row.imageUrl,
      location:
        typeof row.location === 'string'
          ? JSON.parse(row.location)
          : row.location,
      distance_meters: parseFloat(row.distance_meters),
    }));
  }

  async createProductAndAdd(user: User, dto: CreateProductForPharmacyDto) {
    const currentUser = await this.userRepo.findOne({ where: { id: user.id } });
    if (!currentUser) throw new NotFoundException('User not found');
    const category = await this.categoryRepo.findOne({
      where: [{ name: dto.categoryName }, { slug: dto.categoryName }],
    });
    if (!category) throw new NotFoundException('Category not found');
    const newProduct = this.productRepo.create({
      name: dto.name,
      type: dto.type ?? ProductType.MEDICINE,
      category,
      sub_category: dto.sub_category,
      brand: dto.brand,
      description: dto.description ?? '',
      manufacturer: dto.manufacturer,
      imageUrl: dto.imageUrl ?? 'https://placehold.co/600x400',
      price: dto.price,
      createdBy: currentUser,
      isAdminCreated: currentUser.type === UserRole.ADMIN,
    });
    await this.productRepo.save(newProduct);
    const pharmacy = await this.pharmacyRepo.findOne({
      where: { user: { id: user.id } },
      relations: ['user'],
    });
    if (!pharmacy) {
      const created = await this.create(currentUser, {
        name: 'My Pharmacy',
        address: 'Unknown',
        location: { latitude: 0, longitude: 0 },
        phone: '+000000000',
        openingHours: {
          morningFrom: '08:00',
          morningTo: '12:00',
          eveningFrom: '13:00',
          eveningTo: '17:00',
        },
        imageUrl: 'https://placehold.co/600x400',
        workingDays: ['Sunday', 'Monday'],
      } as any);
      await this.pharmMedRepo.save(
        this.pharmMedRepo.create({
          pharmacy: created,
          product: newProduct,
          quantity: 1,
          price: dto.price,
        }),
      );
      return { product: newProduct, pharmacy: created };
    } else {
      await this.pharmMedRepo.save(
        this.pharmMedRepo.create({
          pharmacy,
          product: newProduct,
          quantity: 1,
          price: dto.price,
        }),
      );
      return { product: newProduct, pharmacy };
    }
  }
}
