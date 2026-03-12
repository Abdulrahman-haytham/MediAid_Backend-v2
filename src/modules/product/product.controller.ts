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
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
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
