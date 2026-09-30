import { Controller, Get } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { formatRoleIds, SecurityContext } from '@bml/policy';
import { Ctx, Requires, RequiresAny } from '../auth/decorators';
import { DbService } from '../infra/db.service';

/**
 * PREVIEW endpoints for the analytics and engagement dashboards and the access register.
 * Workforce figures are live aggregates of the SYNTHETIC HRIS (not governed KPIs – the metric engine
 * and dictionary arrive in Phase 2, DR-11). Engagement figures are deterministic SAMPLE values
 * (no survey data exists – DR-21/DR-24). Both are scope-filtered server-side and apply
 * small-number suppression.
 */
const MIN_N = 5; // SAMPLE suppression threshold pending DR-22

const CUR = `cur as (select org_unit_id, name, level_type_code lvl, path from org.organisation_unit_version
                     where effective_from <= current_date and (effective_to is null or effective_to > current_date))`;

@Controller()
export class PreviewController {
  constructor(private db: DbService) {}

  private scope(ctx: SecurityContext): { sql: string; params: unknown[] } {
    return ctx.scope.bank ? { sql: 'true', params: [] } : { sql: 'e.org_unit_id = any($1)', params: [[...ctx.scope.orgUnitIds]] };
  }

  @Get('analytics/preview/workforce') @RequiresAny('analytics.dashboard.read', 'analytics.admin')
  async workforce(@Ctx() ctx: SecurityContext) {
    const s = this.scope(ctx);
    const base = `with ${CUR}, emp as (
        select e.*, d.name as division from synthetic_hris.employee e
          join cur c on c.org_unit_id = e.org_unit_id
          join cur d on d.lvl = 'DIVISION' and c.path <@ d.path
         where ${s.sql})`;
    const year = new Date().getUTCFullYear();
    const [byDiv, grades, hires, seps, kpi] = await Promise.all([
      this.db.query(`${base} select division, count(*)::int n from emp where status = 'ACTIVE' group by division order by n desc`, s.params),
      this.db.query(`${base} select grade, count(*)::int n from emp where status = 'ACTIVE' group by grade order by grade`, s.params),
      this.db.query(`${base} select extract(year from join_date)::int y, count(*)::int n from emp where join_date >= make_date(${year - 7},1,1) group by y order by y`, s.params),
      this.db.query(`${base} select division, count(*)::int n from emp where leave_date >= make_date(${year},1,1) group by division order by division`, s.params),
      this.db.query(`${base} select count(*) filter (where status='ACTIVE')::int active,
                             count(*) filter (where join_date >= make_date(${year},1,1))::int hires_ytd,
                             count(*) filter (where leave_date >= make_date(${year},1,1))::int seps_ytd from emp`, s.params),
    ]);
    const k = kpi.rows[0];
    return {
      label: 'PREVIEW – synthetic HRIS aggregates, not governed KPIs (DR-11)',
      scope: ctx.scope.bank ? 'Bank-wide' : 'Your organisational scope',
      minN: MIN_N,
      kpis: { headcount: k.active, hiresYtd: k.hires_ytd, separationsYtd: k.seps_ytd,
        turnoverYtdPct: k.active ? Math.round((k.seps_ytd / (k.active + k.seps_ytd / 2)) * 1000) / 10 : null },
      headcountByDivision: byDiv.rows.map((r) => ({ label: r.division.replace(' Division', ''), value: r.n })),
      gradeMix: grades.rows.map((r) => ({ label: r.grade, value: r.n })),
      hiresByYear: hires.rows.map((r) => ({ label: String(r.y), value: r.n })),
      separationsByDivision: seps.rows.map((r) => ({ label: r.division.replace(' Division', ''), value: r.n < MIN_N ? null : r.n })),
    };
  }

  @Get('engagement/preview') @RequiresAny('engagement.read', 'engagement.admin')
  async engagement(@Ctx() ctx: SecurityContext) {
    const s = this.scope(ctx);
    const { rows } = await this.db.query(
      `with ${CUR} select d.name as division, count(*)::int eligible
         from synthetic_hris.employee e join cur c on c.org_unit_id = e.org_unit_id
         join cur d on d.lvl = 'DIVISION' and c.path <@ d.path
        where e.status = 'ACTIVE' and ${s.sql} group by d.name order by d.name`, s.params);
    // Deterministic pseudo-values from a hash so the preview is stable between runs.
    const h = (k: string, lo: number, hi: number) => lo + (parseInt(createHash('sha256').update(k).digest('hex').slice(0, 8), 16) / 0xffffffff) * (hi - lo);
    const divisions = rows.map((r) => {
      const responded = Math.round(r.eligible * h(`${r.division}:p`, 0.55, 0.92));
      const fav = responded < MIN_N ? null : Math.round(h(`${r.division}:f`, 58, 84) * 10) / 10;
      return { label: r.division.replace(' Division', ''), eligible: r.eligible, responded, participationPct: Math.round((responded / r.eligible) * 1000) / 10, favourablePct: fav };
    });
    const quarters = ['2025 Q3', '2025 Q4', '2026 Q1', '2026 Q2', '2026 Q3'];
    const eligible = divisions.reduce((a, d) => a + d.eligible, 0);
    const responded = divisions.reduce((a, d) => a + d.responded, 0);
    return {
      label: 'SAMPLE – illustrative values, no survey data loaded (DR-21, DR-24)',
      scope: ctx.scope.bank ? 'Bank-wide' : 'Your organisational scope',
      minN: MIN_N,
      kpis: { eligible, responded, participationPct: eligible ? Math.round((responded / eligible) * 1000) / 10 : null, favourablePct: Math.round(h('bank:f', 66, 74) * 10) / 10 },
      divisions,
      trend: {
        periods: quarters,
        engagement: quarters.map((q) => Math.round(h(`${q}:e`, 63, 75) * 10) / 10),
        participation: quarters.map((q) => Math.round(h(`${q}:p`, 68, 86) * 10) / 10),
      },
    };
  }

  /** Access register (read-only in v0.1; maker-checker grant editing is Sprint 2). */
  @Get('admin/access') @Requires('admin.users.read')
  async access() {
    const { rows } = await this.db.query(
      `select u.id, u.display_name, u.upn, u.status, u.last_login_at, u.is_synthetic,
              json_agg(json_build_object('role', r.code, 'name', r.name, 'scopeType', s.scope_type, 'orgUnit', v.name,
                       'validFrom', s.valid_from, 'validTo', s.valid_to, 'active', (s.valid_to is null or s.valid_to > now()))
                       order by r.code) as grants
         from platform.app_user u
         join platform.user_scope s on s.user_id = u.id
         join platform.role r on r.id = s.role_id
         left join org.organisation_unit_version v on v.org_unit_id = s.org_unit_id
               and v.effective_from <= current_date and (v.effective_to is null or v.effective_to > current_date)
        group by u.id order by u.display_name`);
    return rows.map((r) => {
      const active = r.grants.filter((g: any) => g.active);
      const f = formatRoleIds(active.map((g: any) => g.role));
      return { id: r.id, name: r.display_name, upn: r.upn, status: r.status, lastLoginAt: r.last_login_at, synthetic: r.is_synthetic,
        roleIds: f.ids, extras: f.extras, activeGrants: active.length, expiredGrants: r.grants.length - active.length, grants: r.grants };
    });
  }
}
