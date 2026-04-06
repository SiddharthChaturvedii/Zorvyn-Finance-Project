import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Gateway')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Gateway Welcome' })
  getHello() {
    return {
      project: 'Zorvyn Finance Institutional API',
      status: 'OPERATIONAL',
      version: '1.0.0',
      documentation: '/docs',
      timestamp: new Date().toISOString(),
    };
  }
}
