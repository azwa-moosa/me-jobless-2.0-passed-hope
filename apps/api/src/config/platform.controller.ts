import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ROLES, SecurityContext } from '@bml/policy';
import { Ctx, Requires, RequiresAny } from '../auth/decorators';
import { ConfigService } from './config.service';
import { DbService } from '../infra/db.service';
import { AuditService } from '../audit/audit.service';
import { conflict, invalid, notFound } from '../infra/errors';

@Controller()
export class PlatformController {
  constructor(private config: ConfigService, private db: DbService, private audit: AuditService) {}

  @Get('config/lookups') @RequiresAny('config.lookups.read', 'er.case.create', 'actions.use')
  lookups(@Query('set') set?: string) { return this.config.lookups(set); }

  @Get('config/state-machines') @Requires('config.lookups.read')
  stateMachines() { return this.config.stateMachines(); }

  @Get('config/calendar') @Requires('config.lookups.read')
  calendar() { return this.config.calendar(); }

  @Get('config/roles') @Requires('config.lookups.read')
  roles() {
    return ROLES.map((r) => ({ ref: r.ref, code: r.code, name: r.name, defaultScope: r.defaultScope, status: r.status, permissions: r.permissions }));
  }

  // ---------------------------------------------------------------- feature flags (PLT-010)
  @Get('admin/feature-flags') @Requires('admin.feature_flags.manage')
  async flags() {
    return (await this.db.query(`select key, enabled, description, environment, updated_at from config.feature_flag order by key`)).rows;
  }

  @Patch('admin/feature-flags/:key') @Requires('admin.feature_flags.manage')
  async setFlag(@Ctx() ctx: SecurityContext, @Param('key') key: string, @Body() body: { enabled?: boolean }) {
    if (typeof body?.enabled !== 'boolean') throw invalid('enabled must be boolean');
    if (key === 'voice.anonymous_route' && body.enabled) {
      throw conflict('The anonymous Voice route stays disabled until IT/Security validate the anonymity model (DR-27).');
    }
    return this.db.tx(ctx, async (tx) => {
      const { rows } = await tx.query(`update config.feature_flag set enabled = $2, updated_at = now() where key = $1 returning key, enabled`, [key, body.enabled]);
      if (!rows[0]) throw notFound('Unknown flag');
      await this.audit.record(tx, { eventType: 'feature_flag.changed', module: 'admin', resourceType: 'feature_flag', resourceId: key, sensitivity: 'INT', summary: { enabled: body.enabled } });
      return { key, enabled: body.enabled };
    });
  }

  // ---------------------------------------------------------------- user directory (for assignment pickers)
  @Get('directory/users') @RequiresAny('actions.reassign', 'er.case.team.manage', 'actions.create', 'er.case.update', 'admin.users.read')
  async users(@Query('q') q = '', @Query('permission') permission?: string) {
    const params: unknown[] = [`%${q.toLowerCase()}%`];
    let permFilter = '';
    if (permission) {
      params.push(permission);
      permFilter = `and exists (select 1 from platform.user_scope s join platform.role_permission rp on rp.role_id = s.role_id
                     where s.user_id = u.id and rp.permission_code = $2 and s.status='APPROVED' and s.valid_from <= now() and (s.valid_to is null or s.valid_to > now()))`;
    }
    const { rows } = await this.db.query(
      `select u.id, u.display_name, u.upn,
              (select string_agg(distinct r.name, ', ') from platform.user_scope s join platform.role r on r.id = s.role_id
                where s.user_id = u.id and (s.valid_to is null or s.valid_to > now())) as roles
         from platform.app_user u
        where u.status = 'ACTIVE' and (lower(u.display_name) like $1 or lower(u.upn::text) like $1) ${permFilter}
        order by u.display_name limit 30`, params);
    return rows;
  }
}
