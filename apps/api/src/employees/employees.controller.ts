import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { assertCan, canInOrg, maskRestricted, RESTRICTED_FIELDS, RestrictedField, SecurityContext } from '@bml/policy';
import { Ctx, Requires } from '../auth/decorators';
import { EMPLOYEE_PROVIDER, EmployeeProvider, EmployeeRecord } from './employee.provider';
import { forbidden, invalid, notFound } from '../infra/errors';
import { AuditService } from '../audit/audit.service';
import { DbService } from '../infra/db.service';
import { OrgService } from '../org/org.service';

@Controller('employees')
export class EmployeesController {
  constructor(
    @Inject(EMPLOYEE_PROVIDER) private provider: EmployeeProvider,
    private audit: AuditService, private db: DbService, private org: OrgService,
  ) {}

  private scopeFilter(ctx: SecurityContext): string[] | 'ALL' {
    return ctx.scope.bank ? 'ALL' : [...ctx.scope.orgUnitIds];
  }

  private async loadInScope(ctx: SecurityContext, uid: string, permission: string): Promise<EmployeeRecord> {
    const e = await this.provider.get(uid);
    if (!e) throw notFound('Employee not found');
    if (!canInOrg(ctx, permission, e.orgUnitId)) throw forbidden('Employee is outside your organisational scope');
    return e;
  }

  @Get() @Requires('employee.search')
  async search(@Ctx() ctx: SecurityContext, @Query('q') q = '', @Query('limit') limit = '25') {
    if (q.trim().length < 2) return { items: [], provider: this.provider.name };
    const rows = await this.provider.search(q.trim(), { orgUnitIds: this.scopeFilter(ctx), limit: Math.min(Number(limit) || 25, 50) });
    const names = await this.org.namesFor(rows.map((r) => r.orgUnitId));
    return {
      provider: this.provider.name,
      items: rows.map((e) => ({ uid: e.uid, fullName: e.fullName, positionTitle: e.positionTitle, grade: e.grade, status: e.status, orgUnit: names.get(e.orgUnitId) ?? null })),
    };
  }

  @Get(':uid') @Requires('employee.read')
  async get(@Ctx() ctx: SecurityContext, @Param('uid') uid: string) {
    const e = await this.loadInScope(ctx, uid, 'employee.read');
    const [names, manager] = await Promise.all([this.org.namesFor([e.orgUnitId]), e.managerUid ? this.provider.get(e.managerUid) : null]);
    const chain = await this.org.ancestry(e.orgUnitId);
    const { salary, nid, passport, currency, ...rest } = e;
    return {
      ...maskRestricted(ctx, { ...rest, salary, nid, passport }),
      orgUnit: names.get(e.orgUnitId) ?? null, orgPath: chain,
      manager: manager ? { uid: manager.uid, fullName: manager.fullName } : null,
      provider: this.provider.name,
    };
  }

  @Get(':uid/positions') @Requires('employee.positions.read')
  async positions(@Ctx() ctx: SecurityContext, @Param('uid') uid: string) {
    await this.loadInScope(ctx, uid, 'employee.positions.read');
    return { items: await this.provider.positions(uid) };
  }

  /** Audited reveal of a single restricted field (PLT-004). Value never logged or audited. */
  @Post(':uid/reveal') @HttpCode(200) @Requires('employee.read')
  async reveal(@Ctx() ctx: SecurityContext, @Param('uid') uid: string, @Body() body: { field?: string }) {
    const field = body?.field as RestrictedField;
    if (!field || !(field in RESTRICTED_FIELDS)) throw invalid('field must be one of salary, nid, passport');
    assertCan(ctx, RESTRICTED_FIELDS[field]);
    const e = await this.loadInScope(ctx, uid, 'employee.read');
    await this.db.tx(ctx, (tx) => this.audit.record(tx, {
      eventType: 'employee.restricted_field.revealed', module: 'employee', resourceType: 'employee', resourceId: uid,
      sensitivity: 'REST', summary: { field },
    }));
    const value = field === 'salary' ? `${e.currency} ${e.salary.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : e[field];
    return { field, value };
  }
}
