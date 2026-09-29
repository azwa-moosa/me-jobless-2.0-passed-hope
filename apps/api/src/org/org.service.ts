import { Injectable } from '@nestjs/common';
import { DbService } from '../infra/db.service';

@Injectable()
export class OrgService {
  constructor(private db: DbService) {}

  /** Org tree as-of any date (EMP-003). Reproducible for historical dates. */
  async tree(asOf: string) {
    const { rows } = await this.db.query(
      `select u.id, u.source_code as code, v.name, v.level_type_code as level, l.depth, v.parent_org_unit_id as parent_id,
              v.path::text as path, v.effective_from, v.effective_to
         from org.organisation_unit_version v
         join org.organisation_unit u on u.id = v.org_unit_id
         join org.org_level_type l on l.code = v.level_type_code
        where v.effective_from <= $1::date and (v.effective_to is null or v.effective_to > $1::date)
        order by v.path`, [asOf]);
    const levels = (await this.db.query(`select code, depth, label from org.org_level_type order by depth`)).rows;
    return { asOf, levels, units: rows };
  }

  async namesFor(ids: string[]): Promise<Map<string, string>> {
    const uniq = [...new Set(ids.filter(Boolean))];
    if (!uniq.length) return new Map();
    const { rows } = await this.db.query(
      `select org_unit_id, name from org.organisation_unit_version
        where org_unit_id = any($1) and effective_from <= current_date and (effective_to is null or effective_to > current_date)`, [uniq]);
    return new Map(rows.map((r) => [r.org_unit_id, r.name]));
  }

  async ancestry(id: string): Promise<string[]> {
    const { rows } = await this.db.query(
      `with cur as (select org_unit_id, name, path from org.organisation_unit_version
                     where effective_from <= current_date and (effective_to is null or effective_to > current_date))
       select a.name from cur t join cur a on t.path <@ a.path where t.org_unit_id = $1 order by nlevel(a.path)`, [id]);
    return rows.map((r) => r.name);
  }
}
