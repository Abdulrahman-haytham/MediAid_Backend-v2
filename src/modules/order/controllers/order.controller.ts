import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/guards/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { User, UserRole } from '../../user/user.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { RateOrderDto, UpdateOrderStatusDto } from '../dto/update-order.dto';
import { OrderService } from '../services/order.service';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new order' })
  @Post()
  async create(@CurrentUser() currentUser: User, @Body() dto: CreateOrderDto) {
    const order = await this.orderService.createOrderFromCart(currentUser, dto);
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
  async updateStatus(
    @CurrentUser() currentUser: User,
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.orderService.updateOrderStatus(
      orderId,
      dto.status,
      currentUser,
    );
    return { message: `Order updated to ${dto.status}`, order };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get incoming orders for pharmacy' })
  @Get('pharmacy')
  async pharmacyOrders(@CurrentUser() currentUser: User) {
    return this.orderService.findOrdersForPharmacy(currentUser.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get my orders' })
  @Get('me')
  async userOrders(@CurrentUser() currentUser: User) {
    return this.orderService.findOrdersForUser(currentUser.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get order details' })
  @Get(':orderId')
  async orderDetails(
    @CurrentUser() currentUser: User,
    @Param('orderId') orderId: string,
  ) {
    return this.orderService.findOrderDetails(orderId, currentUser);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Rate an order' })
  @Post(':orderId/rate')
  async rateOrder(
    @CurrentUser() currentUser: User,
    @Param('orderId') orderId: string,
    @Body() dto: RateOrderDto,
  ) {
    const order = await this.orderService.rateExistingOrder(
      orderId,
      currentUser.id,
      dto,
    );
    return {
      message: 'Order rated successfully',
      rating: { score: order.ratingScore, comment: order.ratingComment },
      pharmacy: order.pharmacy?.name || 'Unknown Pharmacy',
    };
  }
}
