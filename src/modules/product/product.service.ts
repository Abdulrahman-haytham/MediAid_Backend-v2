import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Product, ProductType } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from '../category/category.entity';
import { User, UserRole } from '../user/user.entity';
import { Pharmacy, PharmacyMedicine } from '../pharmacy/pharmacy.entity';

export interface PharmacyAvailabilityResult {
  pharmacyId: string;
  pharmacyName: string;
  pharmacyAddress: string;
  phone: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  distance_meters: number;
  averageRating: number;
  stockPrice: number;
  stockQuantity: number;
  imageUrl: string;
}

export interface ProductWithPharmaciesResult {
  product: {
    id: string;
    name: string;
    slug: string;
    sub_category: string | null;
    brand: string | null;
    description: string;
    manufacturer: string | null;
    imageUrl: string;
    basePrice: number;
  };
  pharmacies: PharmacyAvailabilityResult[];
}

export interface SearchProductsByLocationResponse {
  mainProduct: ProductWithPharmaciesResult | null;
  alternatives: ProductWithPharmaciesResult[];
  totalResults: number;
}

function simpleSlugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Pharmacy)
    private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(PharmacyMedicine)
    private readonly pharmacyMedicineRepo: Repository<PharmacyMedicine>,
  ) {}

  async create(currentUser: User, dto: CreateProductDto): Promise<Product> {
    if (!currentUser) throw new ForbiddenException('Authentication required');
    if (currentUser.type !== UserRole.ADMIN)
      throw new ForbiddenException('Access denied');

    const exists = await this.productRepo.findOne({
      where: { name: dto.name },
    });
    if (exists)
      throw new ConflictException('Product already exists with this name');

    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const product = this.productRepo.create({
      name: dto.name,
      type: dto.type,
      category,
      sub_category: dto.sub_category,
      brand: dto.brand,
      description: dto.description,
      manufacturer: dto.manufacturer,
      imageUrl: dto.imageUrl,
      isActive: dto.isActive ?? true,
      price: dto.price,
      createdBy: currentUser,
      isAdminCreated: currentUser.type === UserRole.ADMIN,
    });
    return this.productRepo.save(product);
  }

  async findVisibleProducts(currentUser?: User): Promise<Product[]> {
    if (!currentUser) {
      return this.productRepo.find();
    }
    if (
      currentUser.type === UserRole.ADMIN ||
      currentUser.type === UserRole.USER
    ) {
      return this.productRepo.find();
    }
    if (currentUser.type === UserRole.PHARMACIST) {
      return this.productRepo.find({
        where: [
          { isAdminCreated: true },
          { createdBy: { id: currentUser.id } },
        ],
        relations: ['createdBy'],
      });
    }
    throw new ForbiddenException('Access denied. Invalid user role.');
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Category not found');
      (product as any).category = category;
      delete (dto as any).categoryId;
    }
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async remove(id: string): Promise<Product> {
    const product = await this.findOne(id);
    await this.productRepo.delete(id);
    return product;
  }

  async findBySlug(name: string): Promise<Product[]> {
    const slug = simpleSlugify(name);
    return this.productRepo.find({
      where: { slug: ILike(`%${slug}%`) },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        price: true,
        imageUrl: true,
        brand: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getSuggestions(query: string): Promise<Array<{ name: string }>> {
    const items = await this.productRepo.find({
      where: { name: ILike(`%${query}%`) },
      take: 10,
      select: { name: true },
    });
    return items.map((i) => ({ name: i.name }));
  }

  async toggleFavorite(currentUser: User, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const user = await this.userRepo.findOne({
      where: { id: currentUser.id },
      relations: ['favorites'],
    });
    if (!user) throw new NotFoundException('User not found');

    const exists = (user.favorites || []).find((p) => p.id === product.id);
    if (exists) {
      user.favorites = (user.favorites || []).filter(
        (p) => p.id !== product.id,
      );
      await this.userRepo.save(user);
      return {
        message: 'Product removed from favorites',
        favorites: user.favorites,
      };
    } else {
      user.favorites = [...(user.favorites || []), product];
      await this.userRepo.save(user);
      return {
        message: 'Product added to favorites',
        favorites: user.favorites,
      };
    }
  }

  async findFavoriteProducts(userId: string): Promise<Product[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['favorites'],
    });
    if (!user || !Array.isArray(user.favorites)) {
      throw new ConflictException('Invalid favorites');
    }
    return user.favorites;
  }

  async searchProducts(
    categoryId: string,
    searchTerm: string,
  ): Promise<Product[]> {
    return this.productRepo.find({
      where: { category: { id: categoryId }, name: ILike(`%${searchTerm}%`) },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        price: true,
        imageUrl: true,
        brand: true,
      },
    });
  }

  /**
   * Search for a product by name within a geographic radius,
   * find which nearby pharmacies have it in stock, and also
   * return alternative products from the same sub_category.
   *
   * Uses PostGIS ST_DWithin + ST_Distance with ::geography
   * for accurate meter-level distance calculations.
   *
   * @param productName Product name (partial, case-insensitive)
   * @param lon User longitude
   * @param lat User latitude
   * @param radiusMeters Search radius in meters (default: 500km)
   * @returns Main product with pharmacies + alternatives from same sub_category
   */
  async searchProductsByLocation(
    productName: string,
    lon: number,
    lat: number,
    radiusMeters = 500000,
  ): Promise<SearchProductsByLocationResponse> {
    // 1. Find the main product (best match by name)
    const mainProduct = await this.productRepo.findOne({
      where: { name: ILike(`%${productName}%`) },
      order: { createdAt: 'DESC' },
    });

    let mainResult: ProductWithPharmaciesResult | null = null;

    if (mainProduct) {
      const pharmacies = await this._findPharmaciesWithProduct(
        mainProduct.id,
        lon,
        lat,
        radiusMeters,
      );
      mainResult = {
        product: {
          id: mainProduct.id,
          name: mainProduct.name,
          slug: mainProduct.slug,
          sub_category: mainProduct.sub_category ?? null,
          brand: mainProduct.brand ?? null,
          description: mainProduct.description,
          manufacturer: mainProduct.manufacturer ?? null,
          imageUrl: mainProduct.imageUrl,
          basePrice: mainProduct.price,
        },
        pharmacies,
      };
    }

    // 2. Find alternative products from the same sub_category
    const alternatives: ProductWithPharmaciesResult[] = [];

    if (mainProduct?.sub_category) {
      const altProducts = await this.productRepo.find({
        where: {
          sub_category: mainProduct.sub_category,
        },
        // Exclude the main product itself
        // (we filter in JS since ILike doesn't support != easily)
        order: { createdAt: 'DESC' },
        take: 10,
      });

      for (const alt of altProducts) {
        if (alt.id === mainProduct.id) continue;

        const altPharmacies = await this._findPharmaciesWithProduct(
          alt.id,
          lon,
          lat,
          radiusMeters,
        );

        // Only include alternatives that have at least one pharmacy nearby
        if (altPharmacies.length > 0) {
          alternatives.push({
            product: {
              id: alt.id,
              name: alt.name,
              slug: alt.slug,
              sub_category: alt.sub_category ?? null,
              brand: alt.brand ?? null,
              description: alt.description,
              manufacturer: alt.manufacturer ?? null,
              imageUrl: alt.imageUrl,
              basePrice: alt.price,
            },
            pharmacies: altPharmacies,
          });
        }
      }
    }

    return {
      mainProduct: mainResult,
      alternatives,
      totalResults: (mainResult ? 1 : 0) + alternatives.length,
    };
  }

  /**
   * Internal helper: find nearby active pharmacies that have a given product in stock.
   * Uses PostGIS ST_DWithin for filtering and ST_Distance for distance calculation.
   */
  private async _findPharmaciesWithProduct(
    productId: string,
    lon: number,
    lat: number,
    radiusMeters: number,
  ): Promise<PharmacyAvailabilityResult[]> {
    // Raw SQL query that joins pharmacies with pharmacy_medicines
    // and filters by distance using PostGIS ::geography for accuracy.
    const results = await this.pharmacyRepo.query(
      `
      SELECT
        p.id AS "pharmacyId",
        p.name AS "pharmacyName",
        p.address AS "pharmacyAddress",
        p.phone AS phone,
        p."averageRating" AS "averageRating",
        p."imageUrl" AS "imageUrl",
        ST_AsGeoJSON(p.location)::json AS location,
        ST_Distance(
          p.location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS distance_meters,
        pm.price AS "stockPrice",
        pm.quantity AS "stockQuantity"
      FROM pharmacies p
      INNER JOIN pharmacy_medicines pm ON pm."pharmacyId" = p.id
      WHERE p."isActive" = true
        AND pm."productId" = $3
        AND pm.quantity > 0
        AND ST_DWithin(
          p.location::geography,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          $4
        )
      ORDER BY distance_meters ASC
      `,
      [lon, lat, productId, radiusMeters],
    );

    return results.map((row: any) => ({
      pharmacyId: row.pharmacyId,
      pharmacyName: row.pharmacyName,
      pharmacyAddress: row.pharmacyAddress,
      phone: row.phone,
      averageRating: parseFloat(row.averageRating) || 0,
      imageUrl: row.imageurl || row.imageUrl || '',
      location:
        typeof row.location === 'string'
          ? JSON.parse(row.location)
          : row.location,
      distance_meters: Math.round(parseFloat(row.distance_meters)),
      stockPrice: parseFloat(row.stockPrice),
      stockQuantity: parseInt(row.stockQuantity, 10),
    }));
  }
}
