import { Injectable } from '@nestjs/common';
import { addBusinessDays, formatSequence, periodKey, StateMachineDef } from '@bml/policy';
import { DbService, Tx } from '../infra/db.service';
import { invalid } from '../infra/errors';

/** ConfigurationService core (CFG-001/002/003). Rules are data; nothing here encodes BML policy. */
@Injectable()
export class ConfigService {
  constructor(private db: DbService) {}

  async lookups(setCode?: string) {
    const { rows } = await this.db.query(
      `select s.code as set_code, s.description, s.is_sample, v.code, v.label, v.sort
         from config.lookup_set s join config.lookup_value v on v.set_code = s.code
        where v.active and ($1::text is null or s.code = $1)
          and v.effective_from <= current_date and (v.effective_to is null or v.effective_to > current_date)
        order by s.code, v.sort`, [setCode ?? null]);
    const sets: Record<string, { description: string; isSample: boolean; values: Array<{ code: string; label: string }> }> = {};
    for (const r of rows) {
      sets[r.set_code] ??= { description: r.description, isSample: r.is_sample, values: [] };
      sets[r.set_code].values.push({ code: r.code, label: r.label });
    }
    return sets;
  }

  async assertLookup(setCode: string, code: string | undefined, field: string) {
    const { rowCount } = await this.db.query(`select 1 from config.lookup_value where set_code = $1 and code = $2 and active`, [setCode, code ?? '']);
    if (!rowCount) throw invalid(`${field} must be a configured value of ${setCode}`);
  }

  async stateMachine(code: string): Promise<StateMachineDef> {
    const { rows } = await this.db.query(
      `select definition from config.state_machine where code = $1 and status = 'APPROVED' and effective_from <= current_date order by version desc limit 1`, [code]);
    if (!rows[0]) throw new Error(`No approved state machine ${code}`);
    return rows[0].definition;
  }

  async stateMachines() {
    return (await this.db.query(`select code, version, is_sample, effective_from, definition from config.state_machine order by code, version`)).rows;
  }

  async value<T = unknown>(namespace: string, key: string, fallback: T): Promise<T> {
    const { rows } = await this.db.query(
      `select value from config.configuration_item where namespace = $1 and key = $2 and status = 'APPROVED'
          and effective_from <= current_date and (effective_to is null or effective_to > current_date)
        order by effective_from desc limit 1`, [namespace, key]);
    return rows[0] ? (rows[0].value as T) : fallback;
  }

  async calendar(code = 'DEFAULT') {
    const cal = (await this.db.query(`select * from config.business_calendar where code = $1`, [code])).rows[0];
    const hol = (await this.db.query(`select to_char(date,'YYYY-MM-DD') d, name from config.calendar_holiday where calendar_code = $1 order by date`, [code])).rows;
    return { code: cal.code, name: cal.name, workingDays: cal.working_days as number[], timezone: cal.timezone, isSample: cal.is_sample, holidays: hol };
  }

  async addBusinessDays(from: Date, days: number) {
    const cal = await this.calendar();
    return addBusinessDays(from, days, cal.workingDays, cal.holidays.map((h: any) => h.d));
  }

  /** Gap-free, concurrency-safe reference allocation (row lock on the counter). */
  async nextReference(tx: Tx, ruleCode: string): Promise<string> {
    const rule = (await tx.query(`select format, reset_policy from config.sequence_rule where code = $1`, [ruleCode])).rows[0];
    if (!rule) throw new Error(`No sequence rule ${ruleCode}`);
    const now = new Date();
    const key = periodKey(rule.reset_policy, now);
    await tx.query(`insert into config.sequence_counter(rule_code, period_key, last_value) values ($1,$2,0) on conflict do nothing`, [ruleCode, key]);
    const { rows } = await tx.query(
      `update config.sequence_counter set last_value = last_value + 1 where rule_code = $1 and period_key = $2 returning last_value`, [ruleCode, key]);
    return formatSequence(rule.format, Number(rows[0].last_value), now);
  }
}
