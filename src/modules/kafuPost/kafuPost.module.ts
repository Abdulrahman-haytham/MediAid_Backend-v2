import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafuPost } from './entities/kafuPost.entity';
import { KafuPostController } from './controllers/kafuPost.controller';
import { KafuPostService } from './services/kafuPost.service';

@Module({
  imports: [TypeOrmModule.forFeature([KafuPost])],
  controllers: [KafuPostController],
  providers: [KafuPostService],
  exports: [KafuPostService],
})
export class KafuPostModule {}
