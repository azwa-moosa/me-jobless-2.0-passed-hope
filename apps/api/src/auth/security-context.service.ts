import { Injectable, UnauthorizedException } from '@nestjs/common';
import { auditModulesFor, SecurityContext } from '@bml/policy';
import { DbService } from '../infra/db.service';
import { VerifiedIdentity } from './token.service';

/**
 * Builds the SecurityContext from DB grants on every request (PLT-002). Roles and scopes are never
 * taken from the token; expired grants drop out immediately without redeploy.
 */
@Injectable()
export class SecurityContextService {
  constructor(private readonly db: DbService) {}

  async resolveUser(id: VerifiedIdentity): Promise<{ id: string; upn: string; display_name: string; employee_uid: string | null }> {
    if (id.issuer === 'entra' && id.entraObjectId) {
      // JIT provisioning on first Entra login: user row only, NO roles (grants need approval).
      const { rows } = await this.db.query(
        `insert into platform.app_user(entra_object_id, upn, display_name) values ($1,$2,$3)
         on conflict (upn) do update set entra_object_id = coalesce(platform.app_user.entra_object_id, excluded.entra_object_id)
         returning id, upn, display_name, employee_uid, status`,
        [id.entraObjectId, id.upn, id.displayName ?? id.upn]);
      if (rows[0].status !== 'ACTIVE') throw new UnauthorizedException('User disabled');
      return rows[0];
    }
    const { rows } = await this.db.query(
      `select id, upn, display_name, employee_uid, status from platform.app_user where upn = $1`, [id.upn]);
    if (!rows[0] || rows[0].status !== 'ACTIVE') throw new UnauthorizedException('Unknown or disabled user');
    return rows[0];
  }

  async build(user: { id: string; upn: string; display_name: string; employee_uid: string | null }): Promise<SecurityContext> {
    const grants = (await this.db.query(
      `select r.code, s.role_id, s.scope_type, s.org_unit_id, s.include_descendants
         from platform.user_scope s join platform.role r on r.id = s.role_id
        where s.user_id = $1 and s.status = 'APPROVED'
          and s.valid_from <= now() and (s.valid_to is null or s.valid_to > now())`, [user.id])).rows;

    const roleIds = [...new Set(grants.map((g) => g.role_id))];
    const perms = roleIds.length
      ? (await this.db.query(`select distinct permission_code from platform.role_permission where role_id = any($1)`, [roleIds])).rows.map((r) => r.permission_code)
      : [];

    const bank = grants.some((g) => g.scope_type === 'BANK');
    const unitGrants = grants.filter((g) => g.scope_type === 'ORG_UNIT');
    let orgUnitIds = new Set<string>();
    if (unitGrants.length) {
      // Expand to descendants using the org tree as-of today (effective-dated).
      const { rows } = await this.db.query(
        `with cur as (select org_unit_id, path from org.organisation_unit_version
                       where effective_from <= current_date and (effective_to is null or effective_to > current_date))
         select distinct c2.org_unit_id from cur c1 join cur c2
           on (c2.path <@ c1.path and $2::boolean) or c2.org_unit_id = c1.org_unit_id
          where c1.org_unit_id = any($1)`,
        [unitGrants.map((g) => g.org_unit_id), unitGrants.some((g) => g.include_descendants)]);
      orgUnitIds = new Set(rows.map((r) => r.org_unit_id));
    }

    const roles = [...new Set(grants.map((g) => g.code as string))];
    return {
      userId: user.id, upn: user.upn, displayName: user.display_name, employeeUid: user.employee_uid,
      roles, permissions: new Set(perms), scope: { bank, orgUnitIds }, auditModules: auditModulesFor(roles),
    };
  }
}
