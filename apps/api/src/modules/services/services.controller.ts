import { Controller, Get, Param, Query } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ListServicesQueryDto } from './dto/list-services.query.dto';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  list(@Query() query: ListServicesQueryDto) {
    return this.servicesService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.servicesService.getById(id);
  }

  @Get(':id/requirements')
  async getRequirements(@Param('id') id: string) {
    const detail = await this.servicesService.getById(id);
    return detail.requirements;
  }
}
