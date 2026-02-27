import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsedMedicineService } from '../services/usedMedicine.service';
import { CreateUsedMedicineDto } from '../dto/create-usedMedicine.dto';
import { UpdateUsedMedicineDto } from '../dto/update-usedMedicine.dto';

@ApiTags('Used Medicines')
@Controller('used-medicines')
export class UsedMedicineController {
  constructor(private readonly usedService: UsedMedicineService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Add or update used medicine' })
  @Post()
  async add(@Req() req: any, @Body() dto: CreateUsedMedicineDto) {
    const result = await this.usedService.addOrUpdate(req.user, dto);
    // const statusCode = result.message.includes('updated') ? 200 : 201; // Status handling should be done via decorators or exception filters ideally
    return result;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get my used medicines' })
  @Get()
  async get(@Req() req: any) {
    const doc = await this.usedService.findUserMedicines(req.user);
    if (!doc) {
      return { error: 'No medicines found for this user' };
    }
    return doc.items;
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update used medicine details' })
  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUsedMedicineDto) {
    const medicine = await this.usedService.updateDetails(req.user, id, dto);
    return { message: 'Medicine updated successfully', medicine };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete used medicine' })
  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    await this.usedService.delete(req.user, id);
    return { message: 'Medicine removed successfully' };
  }
}
