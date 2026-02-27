import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../../common/guards/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../user/user.entity';
import { OrderService } from '../services/order.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderStatusDto, RateOrderDto } from '../dto/update-order.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new order' })
  @Post()
  async create(@Req() req: any, @Body() dto: CreateOrderDto) {
    const order = await this.orderService.createOrderFromCart(req.user, dto);
    return {
      message: 'Order created successfully.',
      order: {
        id: order.id,
        userId: order.user?.id,
        pharmacyId: order.pharmacy?.id,
        items: order.items,
        orderType: order.orderType,
        deliveryAddress: order.deliveryAddress,
        totalPrice: order.totalPrice,
        status: order.status,
        createdAt: order.createdAt,
      },
    };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update order status' })
  @Put(':orderId/status')
  async updateStatus(@Req() req: any, @Param('orderId') orderId: string, @Body() dto: UpdateOrderStatusDto) {
    const order = await this.orderService.updateOrderStatus(orderId, dto.status, req.user);
    return { message: `Order updated to ${dto.status}`, order };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get incoming orders for pharmacy' })
  @Get('pharmacy')
  async pharmacyOrders(@Req() req: any) {
    return this.orderService.findOrdersForPharmacy(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get my orders' })
  @Get('me')
  async userOrders(@Req() req: any) {
    return this.orderService.findOrdersForUser(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get order details' })
  @Get(':orderId')
  async orderDetails(@Param('orderId') orderId: string) {
    const order = await this.orderService.findOrderDetails(orderId);
    if (!order) {
      return { error: 'Order not found' };
    }
    return order;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Rate an order' })
  @Post(':orderId/rate')
  async rateOrder(@Req() req: any, @Param('orderId') orderId: string, @Body() dto: RateOrderDto) {
    const order = await this.orderService.rateExistingOrder(orderId, req.user.id, dto);
    return {
      message: 'Order rated successfully',
      rating: { score: order.ratingScore, comment: order.ratingComment },
      pharmacy: order.pharmacy?.name || 'Unknown Pharmacy',
    };
  }
}
