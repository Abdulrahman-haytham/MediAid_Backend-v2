import { BadRequestException, ConflictException, Injectable, NotFoundException, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

function simpleSlugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createDto: CreateCategoryDto): Promise<Category> {
    const { name } = createDto;
    const exists = await this.categoryRepository.findOne({ where: { name } });
    if (exists) {
      throw new ConflictException('Category already exists');
    }
    const category = this.categoryRepository.create(createDto);
    return this.categoryRepository.save(category);
  }

  async update(id: string, updateDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    Object.assign(category, updateDto);
    return this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async findByName(name: string): Promise<Category | null> {
    const slug = simpleSlugify(name);
    return this.categoryRepository.findOne({ where: { slug } });
  }

  async remove(id: string): Promise<void> {
    const res = await this.categoryRepository.delete(id);
    if (!res.affected) {
      throw new NotFoundException('Category not found');
    }
  }

  async removeByName(name: string): Promise<void> {
    const slug = simpleSlugify(name);
    const res = await this.categoryRepository.delete({ slug });
    if (!res.affected) {
      throw new NotFoundException('Category not found');
    }
  }

  async findProductsByCategoryId(categoryId: string) {
    throw new NotImplementedException('Products module not implemented yet');
  }
}
