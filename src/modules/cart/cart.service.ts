import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart, CartItem } from './cart.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Product } from '../product/product.entity';
import { Pharmacy, PharmacyMedicine } from '../pharmacy/pharmacy.entity';
import { User } from '../user/user.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart) private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem) private readonly itemRepo: Repository<CartItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Pharmacy) private readonly pharmacyRepo: Repository<Pharmacy>,
    @InjectRepository(PharmacyMedicine) private readonly pharmMedRepo: Repository<PharmacyMedicine>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private async getOrCreateCart(user: User): Promise<Cart> {
    let cart = await this.cartRepo.findOne({ where: { user: { id: user.id } }, relations: ['user', 'items'] });
    if (!cart) {
      cart = this.cartRepo.create({ user, items: [] });
      cart = await this.cartRepo.save(cart);
    }
    return cart;
  }

  async add(user: User, dto: AddToCartDto): Promise<Cart> {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('المنتج غير موجود.');
    const pharmacy = await this.pharmacyRepo.findOne({ where: { id: dto.pharmacyId } });
    if (!pharmacy) throw new NotFoundException('الصيدلية غير موجودة.');
    const stock = await this.pharmMedRepo.findOne({
      where: { pharmacy: { id: dto.pharmacyId }, product: { id: dto.productId } },
      relations: ['pharmacy', 'product'],
    });
    if (!stock || stock.quantity < dto.quantity) {
      throw new ConflictException('المنتج غير متوفر في هذه الصيدلية أو الكمية غير كافية.');
    }
    const cart = await this.getOrCreateCart(user);
    const items = await this.itemRepo.find({ where: { cart: { id: cart.id } }, relations: ['product', 'pharmacy', 'cart'] });
    const existing = items.find(i => i.product.id === product.id && i.pharmacy.id === pharmacy.id);
    if (existing) {
      existing.quantity += dto.quantity;
      await this.itemRepo.save(existing);
    } else {
      const item = this.itemRepo.create({
        cart,
        product,
        pharmacy,
        quantity: dto.quantity,
        productName: product.name,
      });
      await this.itemRepo.save(item);
    }
    const updated = await this.cartRepo.findOne({ where: { id: cart.id }, relations: ['items', 'items.product', 'items.pharmacy'] });
    if (!updated) throw new NotFoundException('Cart not found after update');
    return updated;
  }

  async get(user: User): Promise<Cart | null> {
    return this.cartRepo.findOne({ where: { user: { id: user.id } }, relations: ['items', 'items.product', 'items.pharmacy'] });
  }

  async updateItem(user: User, productId: string, dto: UpdateItemDto): Promise<Cart> {
    const cart = await this.get(user);
    if (!cart) throw new NotFoundException('Cart not found');
    const items = cart.items || [];
    const item = items.find(i => i.product.id === productId);
    if (!item) throw new NotFoundException('Product not found in cart');
    if (dto.quantity > 0) {
      item.quantity = dto.quantity;
      await this.itemRepo.save(item);
    } else {
      await this.itemRepo.delete(item.id);
    }
    const updated = await this.get(user);
    if (!updated) throw new NotFoundException('Cart not found after update');
    return updated;
  }

  async removeItem(user: User, productId: string): Promise<Cart> {
    const cart = await this.get(user);
    if (!cart) throw new NotFoundException('Cart not found');
    const item = (cart.items || []).find(i => i.product.id === productId);
    if (!item) throw new NotFoundException('Product not found in cart');
    await this.itemRepo.delete(item.id);
    const updated = await this.get(user);
    if (!updated) throw new NotFoundException('Cart not found after remove');
    return updated;
  }

  async clear(user: User): Promise<void> {
    const cart = await this.get(user);
    if (cart) {
      await this.cartRepo.delete(cart.id);
    }
  }

  async getPharmacyNamesFromCart(userId: string): Promise<string[]> {
    const cart = await this.cartRepo.findOne({ where: { user: { id: userId } }, relations: ['items', 'items.pharmacy'] });
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new ConflictException('السلة فارغة أو غير موجودة');
    }
    const pharmacyNames = Array.from(new Set(cart.items.map(i => i.pharmacy.name)));
    return pharmacyNames;
  }
}
