import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../user/user.entity';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    const category = await this.categoryService.create(dto);
    return { message: 'Category created successfully', category };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update an existing category (Admin only)' })
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const category = await this.categoryService.update(id, dto);
    return { message: 'Category updated successfully', category };
  }

  @ApiOperation({ summary: 'Get all categories' })
  @Get()
  async findAll() {
    const categories = await this.categoryService.findAll();
    return { message: 'Categories retrieved successfully', categories };
  }

  @ApiOperation({ summary: 'Get category by ID' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const category = await this.categoryService.findOne(id);
    return { message: 'Category retrieved successfully', category };
  }

  @ApiOperation({ summary: 'Search category by name' })
  @Get('search/:name')
  async searchByName(@Param('name') name: string) {
    const category = await this.categoryService.findByName(name);
    if (!category) {
      return { message: 'Category not found' };
    }
    return { message: 'Category found successfully', category };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete category by ID (Admin only)' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.categoryService.remove(id);
    return { message: 'Category deleted successfully' };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete category by name (Admin only)' })
  @Delete('name/:name')
  async removeByName(@Param('name') name: string) {
    await this.categoryService.removeByName(name);
    return { message: 'Category deleted successfully' };
  }

  @ApiOperation({ summary: 'Get all products in a specific category' })
  @Get(':categoryId/products')
  async getProductsByCategory(@Param('categoryId') categoryId: string) {
    return this.categoryService.findProductsByCategoryId(categoryId);
  }
}
