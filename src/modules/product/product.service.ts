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
}
