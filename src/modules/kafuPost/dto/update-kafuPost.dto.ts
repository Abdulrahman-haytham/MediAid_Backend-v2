import { PartialType } from '@nestjs/mapped-types';
import { CreateKafuPostDto } from './create-kafuPost.dto';

export class UpdateKafuPostDto extends PartialType(CreateKafuPostDto) {}
