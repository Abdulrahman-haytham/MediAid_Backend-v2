import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../user/user.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { CartService } from './cart.service';
import { UpdateItemDto } from './dto/update-item.dto';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add item to cart' })
  @Post('items')
  async add(@CurrentUser() currentUser: User, @Body() dto: AddToCartDto) {
    const cart = await this.cartService.add(currentUser, dto);
    return {
      success: true,
      message: 'Product added to cart successfully.',
      cart: {
        items: cart.items,
        totalItems: (cart.items || []).reduce(
          (sum, item) => sum + item.quantity,
          0,
        ),
      },
    };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current cart' })
  @Get()
  async get(@CurrentUser() currentUser: User) {
    const cart = await this.cartService.get(currentUser);
    if (!cart) {
      return { message: 'Cart is empty', items: [] };
    }
    return cart;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update cart item quantity' })
  @Put('items/:productId')
  async update(
    @CurrentUser() currentUser: User,
    @Param('productId') productId: string,
    @Body() dto: UpdateItemDto,
    @Query('pharmacyId') pharmacyId?: string,
  ) {
    const cart = await this.cartService.updateItem(
      currentUser,
      productId,
      dto,
      pharmacyId,
    );
    return { message: 'Cart updated successfully', cart };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Remove item from cart' })
  @Delete('items/:productId')
  async remove(
    @CurrentUser() currentUser: User,
    @Param('productId') productId: string,
    @Query('pharmacyId') pharmacyId?: string,
  ) {
    const cart = await this.cartService.removeItem(
      currentUser,
      productId,
      pharmacyId,
    );
    return { message: 'Product removed from cart', cart };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Clear cart' })
  @Delete()
  async clear(@CurrentUser() currentUser: User) {
    await this.cartService.clear(currentUser);
    return { message: 'Cart cleared successfully' };
  }
}
