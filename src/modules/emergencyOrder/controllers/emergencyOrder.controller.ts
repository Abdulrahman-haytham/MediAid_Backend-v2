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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmergencyOrderService } from '../services/emergencyOrder.service';
import { CreateEmergencyOrderDto } from '../dto/create-emergencyOrder.dto';
import { RespondToEmergencyOrderDto } from '../dto/respond-emergencyOrder.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/guards/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../user/user.entity';

@ApiTags('Emergency Orders')
@Controller('emergency-orders')
export class EmergencyOrderController {
  constructor(private readonly emergencyOrderService: EmergencyOrderService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create emergency order' })
  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateEmergencyOrderDto,
  ) {
    const order = await this.emergencyOrderService.createSmartOrder(user, dto);
    return {
      message:
        'Emergency order created and sent to the best-matching pharmacies.',
      order,
    };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get my emergency orders' })
  @Get()
  async getUserOrders(@CurrentUser() user: User) {
    return await this.emergencyOrderService.findUserOrders(user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('pharmacist')
  @ApiOperation({ summary: 'Get incoming emergency requests (Pharmacist)' })
  @Get('pharmacy/requests')
  async getPharmacyOrders(@CurrentUser() user: User) {
    return await this.emergencyOrderService.findOrdersForPharmacist(user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get emergency order details' })
  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return await this.emergencyOrderService.findOrderById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('pharmacist')
  @ApiOperation({ summary: 'Respond to emergency order (Pharmacist)' })
  @Put(':id/respond')
  async respond(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RespondToEmergencyOrderDto,
  ) {
    const order = await this.emergencyOrderService.respondToOrder(
      user,
      id,
      dto,
    );
    return { message: 'Response recorded successfully.', order };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Cancel emergency order' })
  @Put(':id/cancel')
  async cancel(@CurrentUser() user: User, @Param('id') id: string) {
    await this.emergencyOrderService.cancelOrder(user, id);
    return { message: 'Order canceled successfully.' };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Fulfill emergency order' })
  @Put(':id/fulfill')
  async fulfill(@CurrentUser() user: User, @Param('id') id: string) {
    const order = await this.emergencyOrderService.fulfillOrder(user, id);
    return { message: 'Order fulfilled successfully.', order };
  }
}
