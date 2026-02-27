import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { KafuPost, KafuPostStatus } from '../entities/kafuPost.entity';
import { CreateKafuPostDto } from '../dto/create-kafuPost.dto';
import { User, UserRole } from '../../user/user.entity';

@Injectable()
export class KafuPostService {
  constructor(
    @InjectRepository(KafuPost)
    private readonly kafuPostRepository: Repository<KafuPost>,
  ) {}

  async create(user: User, createKafuPostDto: CreateKafuPostDto): Promise<KafuPost> {
    const { expiresInDays, ...data } = createKafuPostDto;
    const days = expiresInDays || 3;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const post = this.kafuPostRepository.create({
      ...data,
      user,
      expiresAt,
    });

    return await this.kafuPostRepository.save(post);
  }

  async findAllOpen(): Promise<KafuPost[]> {
    return await this.kafuPostRepository.find({
      where: { status: KafuPostStatus.OPEN },
      relations: ['user'],
    });
  }

  async findByArea(areaName: string): Promise<KafuPost[]> {
    return await this.kafuPostRepository.find({
      where: {
        areaName,
        status: KafuPostStatus.OPEN,
      },
      relations: ['user'],
    });
  }

  async acceptRequest(postId: string, helper: User): Promise<KafuPost> {
    const post = await this.kafuPostRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== KafuPostStatus.OPEN) {
      throw new BadRequestException('Request not available');
    }

    // Prevent user from accepting their own post
    if (post.user.id === helper.id) {
        throw new BadRequestException('You cannot accept your own request');
    }

    post.helper = helper;
    post.status = KafuPostStatus.IN_PROGRESS;

    return await this.kafuPostRepository.save(post);
  }

  async completeRequest(postId: string, helper: User): Promise<KafuPost> {
    const post = await this.kafuPostRepository.findOne({ 
        where: { id: postId },
        relations: ['helper']
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== KafuPostStatus.IN_PROGRESS) {
        throw new BadRequestException('Invalid request completion status');
    }
    
    if (!post.helper || post.helper.id !== helper.id) {
      throw new BadRequestException('You are not the helper for this request');
    }

    post.status = KafuPostStatus.COMPLETED;

    return await this.kafuPostRepository.save(post);
  }

  async delete(postId: string, user: User): Promise<void> {
    const post = await this.kafuPostRepository.findOne({ 
        where: { id: postId },
        relations: ['user'] 
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.user.id !== user.id && user.type !== UserRole.ADMIN) {
      throw new ForbiddenException('You are not authorized to delete this post.');
    }

    await this.kafuPostRepository.remove(post);
  }

  // This can be called by a cron job
  async deleteExpiredPosts(): Promise<void> {
    const now = new Date();
    const expiredPosts = await this.kafuPostRepository.find({
      where: {
        expiresAt: LessThan(now),
        status: KafuPostStatus.OPEN,
      },
    });

    if (expiredPosts.length > 0) {
      await this.kafuPostRepository.remove(expiredPosts);
    }
  }
}
