import { Controller, Get, Query } from '@nestjs/common';
import { SecurityContext } from '@bml/policy';
import { Ctx, Requires } from '../auth/decorators';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  @Get('events') @Requires('audit.read')
  events(@Ctx() ctx: SecurityContext, @Query('module') module?: string, @Query('limit') limit?: string, @Query('before') before?: string) {
    return this.audit.list(ctx, { module, limit: limit ? Number(limit) : undefined, beforeSeq: before ? Number(before) : undefined });
  }

  @Get('verify') @Requires('audit.verify')
  async verify() {
    const result = await this.audit.verify();
    await this.audit.recordStandalone({ eventType: 'audit.verify.run', module: 'audit', resourceType: 'audit_chain', sensitivity: 'CONF', summary: result });
    return result;
  }
}
