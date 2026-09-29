import { Injectable } from '@nestjs/common';
import { DbService } from '../infra/db.service';
import { EmployeeProvider, EmployeeRecord, PositionEntry } from './employee.provider';

const iso = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : null);

function map(r: any): EmployeeRecord {
  return {
    uid: r.uid, fullName: r.full_name, email: r.email, status: r.status, joinDate: iso(r.join_date)!, leaveDate: iso(r.leave_date),
    grade: r.grade, positionTitle: r.position_title, orgUnitId: r.org_unit_id, managerUid: r.manager_uid,
    salary: Number(r.salary), currency: r.currency, nid: r.nid, passport: r.passport,
  };
}

/** DEV/UAT only: reads the synthetic_hris schema, which is never created in PROD. */
@Injectable()
export class SyntheticEmployeeProvider implements EmployeeProvider {
  readonly name = 'synthetic';
  constructor(private db: DbService) {}

  async search(q: string, opts: { orgUnitIds: string[] | 'ALL'; limit: number }) {
    const params: unknown[] = [`%${q.toLowerCase()}%`, opts.limit];
    let scope = '';
    if (opts.orgUnitIds !== 'ALL') { params.push(opts.orgUnitIds); scope = `and org_unit_id = any($3)`; }
    const { rows } = await this.db.query(
      `select * from synthetic_hris.employee
        where (lower(full_name) like $1 or lower(uid) like $1 or lower(position_title) like $1) ${scope}
        order by full_name limit $2`, params);
    return rows.map(map);
  }

  async get(uid: string) {
    const { rows } = await this.db.query(`select * from synthetic_hris.employee where uid = $1`, [uid]);
    return rows[0] ? map(rows[0]) : null;
  }

  async getMany(uids: string[]) {
    if (!uids.length) return [];
    const { rows } = await this.db.query(`select * from synthetic_hris.employee where uid = any($1)`, [uids]);
    return rows.map(map);
  }

  async positions(uid: string): Promise<PositionEntry[]> {
    const { rows } = await this.db.query(
      `select p.*, v.name as org_name from synthetic_hris.position_history p
         left join org.organisation_unit_version v on v.org_unit_id = p.org_unit_id
               and v.effective_from <= p.effective_from and (v.effective_to is null or v.effective_to > p.effective_from)
        where p.uid = $1 order by p.effective_from`, [uid]);
    return rows.map((r) => ({
      positionTitle: r.position_title, grade: r.grade, orgUnitId: r.org_unit_id, orgUnitName: r.org_name,
      effectiveFrom: iso(r.effective_from)!, effectiveTo: iso(r.effective_to), changeType: r.change_type,
    }));
  }
}
