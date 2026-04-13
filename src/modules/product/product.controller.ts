import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsByLocationDto } from './dto/search-products-by-location.dto';
import { User } from '../user/user.entity';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../user/user.entity';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new product (Admin only)' })
  @Post()
  async create(@Req() req: any, @Body() dto: CreateProductDto) {
    const user: User = req.user;
    const product = await this.productService.create(user, dto);
    return { message: 'Product created successfully', product };
  }

  @ApiOperation({ summary: 'Get all visible products' })
  @Get()
  async getAll(@Req() req: any) {
    const products = await this.productService.findVisibleProducts(req.user);
    return products;
  }

  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiQuery({ name: 'query', required: false })
  @Get('suggestions')
  async suggestions(@Query('query') query: string) {
    return this.productService.getSuggestions(query || '');
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get user favorite products' })
  @Get('favorites')
  async getFavorites(@Req() req: any) {
    const favorites = await this.productService.findFavoriteProducts(
      req.user.id,
    );
    return { favorites };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Toggle product favorite status' })
  @Post('favorites/:productId/toggle')
  async toggleFavorite(@Req() req: any, @Param('productId') productId: string) {
    return this.productService.toggleFavorite(req.user, productId);
  }

  @ApiOperation({ summary: 'Search product by slug/name' })
  @Get('search/:name')
  async searchBySlug(@Param('name') name: string) {
    const product = await this.productService.findBySlug(name);
    if (!product || product.length === 0) {
      return { message: 'Product not found' };
    }
    return { message: 'Product found successfully', product };
  }

  @ApiOperation({ summary: 'Search products within a category' })
  @ApiQuery({ name: 'q', required: true })
  @Get('category/:categoryId/search')
  async searchByCategory(
    @Param('categoryId') categoryId: string,
    @Query('q') q: string,
  ) {
    if (!q) {
      return {
        message: 'يرجى إدخال كلمة للبحث',
        success: false,
        results: 0,
        data: [],
      };
    }
    const products = await this.productService.searchProducts(categoryId, q);
    if (!products || products.length === 0) {
      return {
        success: true,
        results: 0,
        data: [],
        message: 'لا يوجد منتجات مطابقة',
      };
    }
    return {
      success: true,
      results: products.length,
      data: products,
      message: 'تم العثور على المنتجات بنجاح',
    };
  }

  @ApiOperation({
    summary: 'Search products by location with pharmacy availability',
    description:
      'Searches for a product by name within a geographic radius, ' +
      'finds which nearby pharmacies have it in stock, and returns ' +
      'alternative products from the same sub_category. ' +
      'Uses PostGIS for accurate distance calculations. Default radius: 500km.',
  })
  @ApiQuery({
    name: 'productName',
    type: String,
    required: true,
    description: 'Product name to search for (partial match)',
    example: 'Panadol',
  })
  @ApiQuery({
    name: 'lon',
    type: Number,
    required: true,
    description: 'Longitude coordinate (GeoJSON order)',
    example: 31.2357,
  })
  @ApiQuery({
    name: 'lat',
    type: Number,
    required: true,
    description: 'Latitude coordinate (GeoJSON order)',
    example: 30.0444,
  })
  @ApiQuery({
    name: 'radius',
    type: Number,
    required: false,
    description: 'Search radius in meters (default: 500000 = 500km)',
    example: 500000,
  })
  @ApiResponse({
    status: 200,
    description: 'Products found with nearby pharmacy availability',
  })
  @Get('search-nearby')
  async searchNearby(@Query() query: SearchProductsByLocationDto) {
    const result = await this.productService.searchProductsByLocation(
      query.productName,
      query.lon,
      query.lat,
      query.radius ?? 500000,
    );

    if (!result.mainProduct && result.alternatives.length === 0) {
      return {
        success: false,
        message: `No pharmacies found with "${query.productName}" within ${query.radius ?? 500000}m`,
        mainProduct: null,
        alternatives: [],
        totalResults: 0,
      };
    }

    return {
      success: true,
      message: `Found ${result.totalResults} product(s) with nearby availability`,
      mainProduct: result.mainProduct,
      alternatives: result.alternatives,
      totalResults: result.totalResults,
    };
  }

  @ApiOperation({ summary: 'Get product by ID' })
  @Get(':id')
  async getById(@Param('id') id: string) {
    const product = await this.productService.findOne(id);
    return { message: 'Product retrieved successfully', product };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update product (Admin only)' })
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: any,
  ) {
    const product = await this.productService.update(id, dto);
    return { message: 'Product updated successfully', product };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const product = await this.productService.remove(id);
    return { message: 'Product deleted successfully', product };
  }
}
