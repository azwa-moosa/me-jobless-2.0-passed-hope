import { Controller, Get, Query } from '@nestjs/common';
import { Requires } from '../auth/decorators';
import { invalid } from '../infra/errors';
import { OrgService } from './org.service';

@Controller('org-units')
export class OrgController {
  constructor(private org: OrgService) {}

  @Get('tree') @Requires('org.read')
  tree(@Query('asOf') asOf?: string) {
    const d = asOf ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw invalid('asOf must be YYYY-MM-DD');
    return this.org.tree(d);
  }
}
