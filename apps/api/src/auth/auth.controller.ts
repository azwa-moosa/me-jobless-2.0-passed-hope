import { Body, Controller, Get, HttpCode, NotFoundException, Post, UnauthorizedException } from '@nestjs/common';
import { navigationFor, ROLES, SecurityContext } from '@bml/policy';
import { Authenticated, Ctx, Public } from './decorators';
import { TokenService } from './token.service';
import { DbService } from '../infra/db.service';
import { AuditService } from '../audit/audit.service';

@Controller()
export class AuthController {
  constructor(private tokens: TokenService, private db: DbService, private audit: AuditService) {}

  /** DEV persona list for the sign-in picker. 404 outside dev. */
  @Public() @Get('auth/personas')
  async personas() {
    if (!this.tokens.mockEnabled) throw new NotFoundException();
    const { rows } = await this.db.query(
      `select u.upn, u.display_name, r.code as role_code, r.name as role_name, s.scope_type, s.valid_to, s.grant_reason,
              v.name as scope_name
         from platform.app_user u
         join platform.user_scope s on s.user_id = u.id
         join platform.role r on r.id = s.role_id
         left join org.organisation_unit_version v on v.org_unit_id = s.org_unit_id
               and v.effective_from <= current_date and (v.effective_to is null or v.effective_to > current_date)
        where u.is_synthetic and u.status = 'ACTIVE' order by r.code, u.upn`);
    return rows.map((r) => ({
      upn: r.upn, displayName: r.display_name, roleCode: r.role_code, roleName: r.role_name,
      ref: ROLES.find((x) => x.code === r.role_code)?.ref, scope: r.scope_name ?? r.scope_type,
      expired: !!r.valid_to && new Date(r.valid_to) < new Date(), note: String(r.grant_reason).replace('DEV persona – ', ''),
    }));
  }

  /** DEV mock IdP. Refused (404) unless PLATFORM_ENV=dev and MOCK_IDP_ENABLED=true. */
  @Public() @Post('auth/dev-login') @HttpCode(200)
  async devLogin(@Body() body: { upn?: string }) {
    if (!this.tokens.mockEnabled) throw new NotFoundException();
    const { rows } = await this.db.query(`select id, upn, display_name from platform.app_user where upn = $1 and is_synthetic and status = 'ACTIVE'`, [body?.upn ?? '']);
    if (!rows[0]) {
      await this.audit.recordStandalone({ eventType: 'auth.login.failed', module: 'auth', resourceType: 'session', outcome: 'FAILED', sensitivity: 'CONF', summary: { method: 'mock-idp' }, actorUserId: null });
      throw new UnauthorizedException('Unknown persona');
    }
    const token = await this.tokens.issueMockToken(rows[0].upn, rows[0].display_name);
    await this.db.tx(null, async (tx) => {
      await tx.query('update platform.app_user set last_login_at = now() where id = $1', [rows[0].id]);
      await this.audit.record(tx, { eventType: 'auth.login.succeeded', module: 'auth', resourceType: 'session', sensitivity: 'CONF', summary: { method: 'mock-idp' }, actorUserId: rows[0].id, actorType: 'USER' });
    });
    return { token, expiresIn: 8 * 3600 };
  }

  @Authenticated() @Post('auth/logout') @HttpCode(204)
  async logout(@Ctx() ctx: SecurityContext) {
    await this.audit.recordStandalone({ eventType: 'auth.logout', module: 'auth', resourceType: 'session', sensitivity: 'CONF', actorUserId: ctx.userId });
  }

  @Authenticated() @Get('me')
  me(@Ctx() ctx: SecurityContext) {
    return {
      userId: ctx.userId, upn: ctx.upn, displayName: ctx.displayName, employeeUid: ctx.employeeUid,
      roles: ctx.roles.map((c) => ({ code: c, name: ROLES.find((r) => r.code === c)?.name ?? c })),
      scope: { bank: ctx.scope.bank, orgUnits: ctx.scope.orgUnitIds.size },
      hasAccess: ctx.permissions.size > 0,
    };
  }

  /** Navigation hints derived from server capabilities. The API still enforces every call. */
  @Authenticated() @Get('me/capabilities')
  capabilities(@Ctx() ctx: SecurityContext) {
    return { permissions: [...ctx.permissions].sort(), navigation: navigationFor(ctx) };
  }

  @Public() @Get('health')
  health() { return { status: 'ok' }; }

  @Public() @Get('ready')
  async ready() {
    await this.db.query('select 1');
    const m = await this.db.query(`select count(*)::int as n from public.schema_migrations`).catch(() => ({ rows: [{ n: 0 }] }));
    return { status: 'ready', migrations: m.rows[0].n };
  }
}
