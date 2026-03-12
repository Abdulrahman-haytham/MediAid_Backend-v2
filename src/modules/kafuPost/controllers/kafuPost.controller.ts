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
import { KafuPostService } from '../services/kafuPost.service';
import { CreateKafuPostDto } from '../dto/create-kafuPost.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';

@ApiTags('Kafu Posts')
@Controller('kafu-posts')
export class KafuPostController {
  constructor(private readonly kafuPostService: KafuPostService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new Kafu post' })
  @Post()
  async create(@Req() req: any, @Body() createKafuPostDto: CreateKafuPostDto) {
    return await this.kafuPostService.create(req.user, createKafuPostDto);
  }

  @ApiOperation({ summary: 'Get all open Kafu posts' })
  @Get()
  async findAllOpen() {
    return await this.kafuPostService.findAllOpen();
  }

  @ApiOperation({ summary: 'Find Kafu posts by area' })
  @ApiQuery({ name: 'areaName', required: true })
  @Get('area')
  async findByArea(@Query('areaName') areaName: string) {
    if (!areaName) {
      // Handle missing areaName similar to legacy code which returns 400 if manually checked,
      // but here it might be better to return empty list or throw exception if strict.
      // Legacy code: if (!areaName) return res.status(400)
      // Let's rely on service or return error here.
      // Or simply if service doesn't throw, we are fine. But service expects string.
      // Let's throw BadRequest if missing.
      throw new Error('areaName is required');
    }
    return await this.kafuPostService.findByArea(areaName);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Accept a Kafu post request' })
  @Put(':id/accept')
  async acceptRequest(@Req() req: any, @Param('id') id: string) {
    const post = await this.kafuPostService.acceptRequest(id, req.user);
    return { message: 'You are now helping with this request.', post };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Mark Kafu post as completed' })
  @Put(':id/complete')
  async completeRequest(@Req() req: any, @Param('id') id: string) {
    const post = await this.kafuPostService.completeRequest(id, req.user);
    return { message: 'Request marked as completed.', post };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete Kafu post' })
  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    await this.kafuPostService.delete(id, req.user);
    return { message: 'Request deleted successfully.' };
  }
}
