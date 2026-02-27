import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add item to cart' })
  @Post('items')
  async add(@Req() req: any, @Body() dto: AddToCartDto) {
    const cart = await this.cartService.add(req.user, dto);
    return {
      success: true,
      message: 'تمت إضافة المنتج إلى السلة بنجاح.',
      cart: {
        items: cart.items,
        totalItems: (cart.items || []).reduce((sum, item) => sum + item.quantity, 0),
      },
    };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current cart' })
  @Get()
  async get(@Req() req: any) {
    const cart = await this.cartService.get(req.user);
    if (!cart) {
      return { message: 'Cart is empty', items: [] };
    }
    return cart;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update cart item quantity' })
  @Put('items/:productId')
  async update(@Req() req: any, @Param('productId') productId: string, @Body() dto: UpdateItemDto) {
    const cart = await this.cartService.updateItem(req.user, productId, dto);
    return { message: 'Cart updated successfully', cart };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Remove item from cart' })
  @Delete('items/:productId')
  async remove(@Req() req: any, @Param('productId') productId: string) {
    const cart = await this.cartService.removeItem(req.user, productId);
    return { message: 'Product removed from cart', cart };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Clear cart' })
  @Delete()
  async clear(@Req() req: any) {
    await this.cartService.clear(req.user);
    return { message: 'Cart cleared successfully' };
  }
}
