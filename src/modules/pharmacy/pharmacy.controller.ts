import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../user/user.entity';
import { PharmacyService } from './pharmacy.service';
import { CartService } from '../cart/cart.service';
import { OrderService } from '../order/services/order.service';
import { CreatePharmacyDto } from './dto/create-pharmacy.dto';
import { UpdatePharmacyDto } from './dto/update-pharmacy.dto';
import { RatePharmacyDto } from './dto/rate-pharmacy.dto';
import { AddProductDto } from './dto/add-product.dto';
import { CreateProductForPharmacyDto } from './dto/create-product-for-pharmacy.dto';

@ApiTags('Pharmacies')
@Controller('pharmacies')
export class PharmacyController {
  constructor(
    private readonly pharmacyService: PharmacyService,
    private readonly cartService: CartService,
    private readonly orderService: OrderService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get expiring medicines (next 3 months)' })
  @Get('me/expiring-medicines')
  async getExpiring(@Req() req: any) {
    return this.pharmacyService.getExpiringMedicines(req.user);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get low stock medicines (default threshold: 10)' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  @Get('me/low-stock')
  async getLowStock(@Req() req: any, @Query('threshold') threshold?: number) {
    return this.pharmacyService.getLowStockMedicines(req.user, threshold ? Number(threshold) : 10);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Create a new pharmacy (Pharmacist only)' })
  @ApiResponse({ status: 201, description: 'Pharmacy created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @Post()
  async create(@Req() req: any, @Body() dto: CreatePharmacyDto) {
    const pharmacy = await this.pharmacyService.create(req.user, dto);
    return { message: 'Pharmacy created successfully', pharmacy };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Update my pharmacy details' })
  @ApiResponse({ status: 200, description: 'Pharmacy updated successfully' })
  @Put('me')
  async update(@Req() req: any, @Body() dto: UpdatePharmacyDto) {
    const pharmacy = await this.pharmacyService.updateByUser(req.user, dto);
    return { message: 'Pharmacy updated successfully', pharmacy };
  }

  // Legacy alias: PUT /api/pharmacies/updatePharmacy
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @Put('updatePharmacy')
  async updateLegacy(@Req() req: any, @Body() dto: UpdatePharmacyDto) {
    return this.update(req, dto);
  }

  @ApiOperation({ summary: 'Get all active pharmacies' })
  @ApiResponse({ status: 200, description: 'Return all active pharmacies' })
  @Get()
  async getAll() {
    return this.pharmacyService.findAllActive();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get my pharmacy details' })
  @ApiResponse({ status: 200, description: 'Return my pharmacy details' })
  @Get('me')
  async getMine(@Req() req: any) {
    return this.pharmacyService.findMine(req.user);
  }

  // Legacy alias: GET /api/pharmacies/getMyPharmacy
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @Get('getMyPharmacy')
  async getMineLegacy(@Req() req: any) {
    return this.getMine(req);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get my pharmacy orders' })
  @Get('me/orders')
  async getMyOrders(@Req() req: any) {
    return this.orderService.findOrdersForPharmacy(req.user.id);
  }

  // Legacy alias: GET /api/pharmacies/getMyPharmacyOrders
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @Get('getMyPharmacyOrders')
  async getMyOrdersLegacy(@Req() req: any) {
    return this.orderService.findOrdersForPharmacy(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Rate a pharmacy' })
  @Post(':id/rate')
  async rate(@Param('id') id: string, @Req() req: any, @Body() dto: RatePharmacyDto) {
    return this.pharmacyService.ratePharmacy(id, req.user, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Check if user has a pharmacy' })
  @Get('me/exists')
  async checkUserPharmacy(@Req() req: any) {
    return this.pharmacyService.checkUserPharmacy(req.user.id);
  }

  // Legacy alias: GET /api/pharmacies/checkUserHasPharmacy
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('checkUserHasPharmacy')
  async checkUserPharmacyLegacy(@Req() req: any) {
    return this.checkUserPharmacy(req);
  }

  @ApiOperation({ summary: 'Get medicines in a pharmacy' })
  @Get(':id/medicines')
  async getPharmacyMedicines(@Param('id') id: string) {
    return this.pharmacyService.getPharmacyMedicines(id);
  }

  // Legacy alias: GET /api/pharmacies/getPharmacyMedicines/:id
  @Get('getPharmacyMedicines/:id')
  async getPharmacyMedicinesLegacy(@Param('id') id: string) {
    return this.getPharmacyMedicines(id);
  }

  @ApiOperation({ summary: 'Search medicine in a pharmacy' })
  @Get(':pharmacyId/medicines/search')
  async searchMedicine(@Param('pharmacyId') pharmacyId: string, @Query('name') name: string) {
    return this.pharmacyService.searchMedicineInPharmacy(pharmacyId, name);
  }

  // Legacy alias: GET /api/pharmacies/pharmacies/:pharmacyId/search-medicine?name=...
  @Get('pharmacies/:pharmacyId/search-medicine')
  async searchMedicineLegacy(@Param('pharmacyId') pharmacyId: string, @Query('name') name: string) {
    return this.pharmacyService.searchMedicineInPharmacy(pharmacyId, name);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Add existing product to pharmacy stock' })
  @Post('me/products')
  async addProduct(@Req() req: any, @Body() dto: AddProductDto) {
    return this.pharmacyService.addProductToStock(req.user, dto);
  }

  // Legacy alias: POST /api/pharmacies/add-product
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @Post('add-product')
  async addProductLegacy(@Req() req: any, @Body() dto: AddProductDto) {
    return this.addProduct(req, dto);
  }

  @ApiOperation({ summary: 'Find nearby pharmacies' })
  @ApiQuery({ name: 'maxDistance', required: false })
  @Get('nearby')
  async nearby(@Query('longitude') longitude: string, @Query('latitude') latitude: string, @Query('maxDistance') maxDistance?: string) {
    return this.pharmacyService.findNearbyPharmacies(parseFloat(longitude), parseFloat(latitude), parseInt(maxDistance || '5000', 10));
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Create new product and add to pharmacy' })
  @Post('me/products/new')
  async createProduct(@Req() req: any, @Body() dto: CreateProductForPharmacyDto) {
    return this.pharmacyService.createProductAndAdd(req.user, dto);
  }

  // Legacy alias: POST /api/pharmacies/create-product
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PHARMACIST)
  @Post('create-product')
  async createProductLegacy(@Req() req: any, @Body() dto: CreateProductForPharmacyDto) {
    return this.createProduct(req, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get pharmacy name from cart items' })
  @Get('from-cart')
  async getPharmacyNameFromCart(@Req() req: any) {
    const names = await this.cartService.getPharmacyNamesFromCart(req.user.id);
    return {
      message: 'تم جلب أسماء الصيدليات بنجاح',
      pharmacies: names,
    };
  }

  // Legacy alias: GET /api/pharmacies/getPharmacyNamefromcart
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Get('getPharmacyNamefromcart')
  async getPharmacyNameFromCartLegacy(@Req() req: any) {
    return this.getPharmacyNameFromCart(req);
  }

  @ApiOperation({ summary: 'Search pharmacy by name' })
  @Get('search')
  async searchByName(@Query('name') name: string) {
    if (!name) {
      return { message: 'Please provide a name to search' };
    }
    const pharmacies = await this.pharmacyService.searchByName(name);
    if (!pharmacies || pharmacies.length === 0) {
      return { message: 'No pharmacies found with this name', pharmacies: [] };
    }
    return { message: 'Pharmacies retrieved successfully', pharmacies };
  }

  // Legacy alias: GET /api/pharmacies/searchPharmacyByName?name=...
  @Get('searchPharmacyByName')
  async searchByNameLegacy(@Query('name') name: string) {
    return this.searchByName(name);
  }

  // IMPORTANT: keep param route LAST to avoid conflicts with static routes like /nearby, /search, /from-cart, etc.
  @ApiOperation({ summary: 'Get pharmacy details by ID' })
  @Get(':id')
  async getDetails(@Param('id') id: string) {
    return this.pharmacyService.getPharmacyDetails(id);
  }

  // Legacy alias: GET /api/pharmacies/getPharmacyDetails/:id
  @Get('getPharmacyDetails/:id')
  async getDetailsLegacy(@Param('id') id: string) {
    return this.getDetails(id);
  }
}
