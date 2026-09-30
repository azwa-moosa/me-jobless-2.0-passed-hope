/**
 * DEV seed – SYNTHETIC DATA ONLY.
 * Loads the permission catalogue, role bundles, synthetic org/employees/personas and SAMPLE configuration.
 * Every business value below (categories, statuses, numbering formats, working week) is a labelled
 * placeholder pending the BML decision noted beside it. None of it is BML policy.
 */
import { resolve } from 'node:path';
import { Client } from 'pg';
import { config } from 'dotenv';
import { PERMISSIONS, ROLES } from '@bml/policy';
import { generate, datasetHash, SYNTHETIC_MARKER } from '@bml/synthetic-data';
import { FieldCipher } from '@bml/crypto';

config({ path: resolve(__dirname, '../../../.env') });

const DAY = 86400000;

async function main() {
  const env = process.env.PLATFORM_ENV;
  if (env !== 'dev' && env !== 'uat') throw new Error('Synthetic seed may only run in dev or uat');
  const db = new Client({ connectionString: process.env.DATABASE_URL_MIGRATOR });
  await db.connect();
  const cipher = new FieldCipher(process.env.FIELD_ENCRYPTION_KEY ?? '');
  const q = (sql: string, params: unknown[] = []) => db.query(sql, params);

  const already = await q('select count(*)::int as n from platform.role');
  if (already.rows[0].n > 0) {
    console.log('Database already seeded – run `pnpm db:reset` for a clean DEV database.');
    await db.end();
    return;
  }

  const ds = generate();
  console.log(`${SYNTHETIC_MARKER} · seed ${ds.seed} · dataset hash ${datasetHash(ds).slice(0, 16)}…`);
  await q('begin');

  // ---------------------------------------------------------------- permissions & roles
  for (const p of PERMISSIONS) {
    await q('insert into platform.permission(code, module, description, is_restricted_field) values ($1,$2,$3,$4)',
      [p.code, p.module, p.description, !!p.restrictedField]);
  }
  const roleId = new Map<string, string>();
  for (const r of ROLES) {
    const scopes = r.defaultScope === 'ORG_UNIT' ? ['ORG_UNIT', 'BANK'] : [r.defaultScope];
    const { rows } = await q(
      'insert into platform.role(code, name, description, is_privileged, allowed_scope_types, status_note) values ($1,$2,$3,$4,$5,$6) returning id',
      [r.code, r.name, `${r.ref} – ${r.name}`, !!r.privileged, scopes, r.status]);
    roleId.set(r.code, rows[0].id);
    for (const p of r.permissions) await q('insert into platform.role_permission values ($1,$2)', [rows[0].id, p]);
  }

  // ---------------------------------------------------------------- organisation (effective-dated)
  for (const l of ds.levels) await q('insert into org.org_level_type values ($1,$2,$3)', [l.code, l.depth, l.label]);
  const orgId = new Map<string, string>();
  for (const u of ds.org) {
    const { rows } = await q('insert into org.organisation_unit(source_code) values ($1) returning id', [u.code]);
    orgId.set(u.code, rows[0].id);
  }
  const parentAt = (code: string, date: string): string | null => {
    const u = ds.org.find((o) => o.code === code)!;
    const v = u.versions.find((x) => x.from <= date && (!x.to || date < x.to)) ?? u.versions[0];
    return v.parentCode;
  };
  const pathAt = (code: string, date: string): string => {
    const parts = [code];
    let p = parentAt(code, date);
    while (p) { parts.unshift(p); p = parentAt(p, date); }
    return parts.map((x) => x.toLowerCase()).join('.');
  };
  for (const u of ds.org) {
    for (const v of u.versions) {
      await q(`insert into org.organisation_unit_version(org_unit_id, parent_org_unit_id, level_type_code, name, path, effective_from, effective_to)
               values ($1,$2,$3,$4,$5::ltree,$6,$7)`,
        [orgId.get(u.code), v.parentCode ? orgId.get(v.parentCode) : null, v.level, v.name, pathAt(u.code, v.from), v.from, v.to]);
    }
  }

  // ---------------------------------------------------------------- synthetic HRIS
  const chunk = <T>(a: T[], n: number) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
  for (const part of chunk(ds.employees, 200)) {
    const vals: unknown[] = [];
    const tuples = part.map((e, i) => {
      vals.push(e.uid, e.fullName, e.email, e.status, e.joinDate, e.leaveDate, e.grade, e.positionTitle, orgId.get(e.orgCode), e.managerUid, e.nid, e.passport, e.salary);
      const b = i * 13;
      return `(${Array.from({ length: 13 }, (_, k) => `$${b + k + 1}`).join(',')})`;
    });
    await q(`insert into synthetic_hris.employee(uid, full_name, email, status, join_date, leave_date, grade, position_title, org_unit_id, manager_uid, nid, passport, salary) values ${tuples.join(',')}`, vals);
  }
  for (const part of chunk(ds.positions, 300)) {
    const vals: unknown[] = [];
    const tuples = part.map((p, i) => {
      vals.push(p.uid, p.title, p.grade, orgId.get(p.orgCode), p.from, p.to, p.changeType);
      const b = i * 7;
      return `(${Array.from({ length: 7 }, (_, k) => `$${b + k + 1}`).join(',')})`;
    });
    await q(`insert into synthetic_hris.position_history(uid, position_title, grade, org_unit_id, effective_from, effective_to, change_type) values ${tuples.join(',')}`, vals);
  }

  // ---------------------------------------------------------------- personas (app users + scope grants)
  const userId = new Map<string, string>();
  for (const p of ds.personas) {
    const { rows } = await q('insert into platform.app_user(upn, display_name, employee_uid, is_synthetic) values ($1,$2,$3,true) returning id',
      [p.upn, p.displayName, p.employeeUid ?? null]);
    userId.set(p.upn, rows[0].id);
  }
  const sysUser = (await q(`insert into platform.app_user(upn, display_name, is_synthetic, status) values ('system@dev.synthetic.local','System',true,'DISABLED') returning id`)).rows[0].id;
  let sort = 0;
  for (const p of ds.personas) {
    for (const g of p.grants) {
      await q(`insert into platform.user_scope(user_id, role_id, scope_type, org_unit_id, valid_from, valid_to, grant_reason, created_by, approved_by)
               values ($1,$2,$3,$4,'2025-01-01',$5,$6,$7,$7)`,
        [userId.get(p.upn), roleId.get(g.roleCode), g.scopeType, g.orgCode ? orgId.get(g.orgCode) : null, g.validTo ?? null,
         `DEV persona – ${p.title}`, sysUser]);
    }
    await q(`insert into platform.dev_persona(user_id, title, scope_label, persona_group, sort_order, note) values ($1,$2,$3,$4,$5,$6)`,
      [userId.get(p.upn), p.title, p.scopeLabel, p.group, sort++, p.note]);
  }
  const U = (k: string) => userId.get(`${k}@dev.synthetic.local`)!;

  // ---------------------------------------------------------------- teams
  const erTeam = (await q(`insert into platform.team(code, name, module) values ('ER_TEAM','ER Team','er') returning id`)).rows[0].id;
  const anTeam = (await q(`insert into platform.team(code, name, module) values ('ANALYTICS_TEAM','Analytics Team','analytics') returning id`)).rows[0].id;
  await q(`insert into platform.team_member(team_id, user_id, role_in_team) values ($1,$2,'LEAD'),($1,$3,'MEMBER'),($1,$4,'MEMBER'),($5,$6,'LEAD')`,
    [erTeam, U('er.manager'), U('er.officer'), U('er.officer2'), anTeam, U('analytics.admin')]);

  // ---------------------------------------------------------------- SAMPLE configuration
  const lookups: Record<string, [string, string, Array<[string, string]>]> = {
    'action.priority': ['Action priority (SAMPLE)', 'DR-36', [['LOW', 'Low'], ['MEDIUM', 'Medium'], ['HIGH', 'High'], ['URGENT', 'Urgent']]],
    'er.case_type': ['ER case type (SAMPLE – NOT BML POLICY)', 'DR-15', [['DISCIPLINARY', 'Disciplinary'], ['GRIEVANCE', 'Grievance'], ['INVESTIGATION', 'Investigation']]],
    'er.category': ['ER category (SAMPLE – NOT BML POLICY)', 'DR-15', [['CONDUCT', 'Conduct'], ['ATTENDANCE', 'Attendance'], ['POLICY_BREACH', 'Policy breach'], ['INTERPERSONAL', 'Interpersonal'], ['OTHER', 'Other']]],
    'er.source': ['ER case source (SAMPLE)', 'DR-15', [['DIRECT', 'Direct report to ER'], ['MANAGER', 'Manager referral'], ['VOICE', 'Employee Voice'], ['OTHER', 'Other']]],
    'er.priority': ['ER priority (SAMPLE)', 'DR-15', [['LOW', 'Low'], ['MEDIUM', 'Medium'], ['HIGH', 'High']]],
    'er.confidentiality': ['ER confidentiality level (SAMPLE)', 'DR-20', [['STANDARD', 'Standard'], ['HIGH', 'High'], ['RESTRICTED', 'Restricted']]],
    'er.participant_role': ['ER participant role (SAMPLE)', 'DR-15', [['SUBJECT', 'Subject'], ['COMPLAINANT', 'Complainant'], ['WITNESS', 'Witness'], ['REPRESENTATIVE', 'Representative']]],
    'er.event_type': ['ER chronology entry type (SAMPLE)', 'DR-15', [['NOTE', 'File note'], ['CONTACT', 'Contact with party'], ['DOCUMENT_RECEIVED', 'Document received'], ['MEETING_HELD', 'Meeting held'], ['OTHER', 'Other']]],
  };
  for (const [code, [desc, dr, values]] of Object.entries(lookups)) {
    await q('insert into config.lookup_set(code, description, is_sample) values ($1,$2,true)', [code, `${desc} · pending ${dr}`]);
    let i = 0;
    for (const [v, label] of values) await q('insert into config.lookup_value(set_code, code, label, sort) values ($1,$2,$3,$4)', [code, v, label, i++]);
  }

  const actionSM = {
    initial: 'OPEN',
    states: [
      { code: 'OPEN', label: 'Open' }, { code: 'IN_PROGRESS', label: 'In progress' }, { code: 'BLOCKED', label: 'Blocked' },
      { code: 'COMPLETED', label: 'Completed', terminal: true }, { code: 'CANCELLED', label: 'Cancelled', terminal: true },
    ],
    transitions: [
      { from: ['OPEN'], to: 'IN_PROGRESS', permission: 'actions.use', label: 'Start' },
      { from: ['OPEN', 'IN_PROGRESS'], to: 'BLOCKED', permission: 'actions.use', requiresReason: true, label: 'Mark blocked' },
      { from: ['BLOCKED'], to: 'IN_PROGRESS', permission: 'actions.use', label: 'Unblock' },
      { from: ['OPEN', 'IN_PROGRESS'], to: 'COMPLETED', permission: 'actions.use', label: 'Complete' },
      { from: ['OPEN', 'IN_PROGRESS', 'BLOCKED'], to: 'CANCELLED', permission: 'actions.reassign', requiresReason: true, label: 'Cancel' },
      { from: ['COMPLETED'], to: 'IN_PROGRESS', permission: 'actions.reopen', requiresReason: true, label: 'Reopen' },
    ],
  };
  const erSM = {
    initial: 'INTAKE',
    states: [
      { code: 'INTAKE', label: 'Intake' }, { code: 'ASSESSMENT', label: 'Assessment' }, { code: 'INVESTIGATION', label: 'Investigation' },
      { code: 'OUTCOME_PENDING', label: 'Outcome pending' }, { code: 'ON_HOLD', label: 'On hold' }, { code: 'CLOSED', label: 'Closed', terminal: true },
    ],
    transitions: [
      { from: ['INTAKE'], to: 'ASSESSMENT', permission: 'er.case.status', label: 'Start assessment' },
      { from: ['ASSESSMENT'], to: 'INVESTIGATION', permission: 'er.case.status', label: 'Open investigation' },
      { from: ['INVESTIGATION'], to: 'OUTCOME_PENDING', permission: 'er.case.status', label: 'Move to outcome' },
      { from: ['INTAKE', 'ASSESSMENT', 'INVESTIGATION', 'OUTCOME_PENDING'], to: 'ON_HOLD', permission: 'er.case.status', requiresReason: true, label: 'Put on hold' },
      { from: ['ON_HOLD'], to: 'ASSESSMENT', permission: 'er.case.status', label: 'Resume (assessment)' },
      { from: ['ON_HOLD'], to: 'INVESTIGATION', permission: 'er.case.status', label: 'Resume (investigation)' },
      { from: ['ASSESSMENT', 'OUTCOME_PENDING'], to: 'CLOSED', permission: 'er.case.close', requiresReason: true, label: 'Close case' },
    ],
  };
  await q(`insert into config.state_machine(code, version, definition, is_sample) values ('actions.action',1,$1,true),('er.case',1,$2,true)`,
    [JSON.stringify(actionSM), JSON.stringify(erSM)]);

  await q(`insert into config.sequence_rule(code, format, reset_policy) values
           ('ER_CASE','ER-{YYYY}-{SEQ:4}','YEARLY'), ('ACTION','ACT-{YYYY}-{SEQ:6}','YEARLY')`);
  // Working week is data, not code. SAMPLE (Sun–Thu) – confirm with HR/IT, DR-35. No holidays loaded until an approved source exists.
  await q(`insert into config.business_calendar(code, name, working_days) values ('DEFAULT','Default business calendar (SAMPLE – DR-35)','{7,1,2,3,4}')`);
  await q(`insert into config.feature_flag(key, enabled, description) values
    ('module.actions', true, 'HR Action Centre – My Work'),
    ('module.er', true, 'ER Case Management MVP'),
    ('module.analytics', false, 'People Analytics (Phase 2)'),
    ('voice.anonymous_route', false, 'Anonymous Voice route – OFF until DR-27 sign-off'),
    ('ai.real_provider', false, 'Real AI provider – mock only until DR-32')`);
  for (const [code, desc] of [['RC-ER', 'ER case records'], ['RC-VOICE', 'Employee Voice'], ['RC-AUDIT', 'Audit events'], ['RC-ACTION', 'Actions & approvals'],
    ['RC-PLATFORM', 'Platform identity/config'], ['RC-AI', 'AI interaction logs'], ['RC-ANALYTICS-SRC', 'Analytics source files'], ['RC-DOC-ISSUED', 'Issued documents']]) {
    await q('insert into config.retention_class(code, description) values ($1,$2)', [code, `${desc} – period not set (DR-09); no automated deletion`]);
  }
  await q(`insert into config.configuration_item(namespace, key, value, status, effective_from, created_by, approved_by, approved_at)
           values ('er','closure.require_no_open_mandatory_actions','true','APPROVED','2025-01-01',$1,$1,now()),
                  ('actions','due_soon.business_days','3','APPROVED','2025-01-01',$1,$1,now())`, [sysUser]);

  // ---------------------------------------------------------------- SAMPLE ER cases & actions
  const year = new Date().getUTCFullYear();
  let caseSeq = 0, actSeq = 0;
  const caseRef = () => `ER-${year}-${String(++caseSeq).padStart(4, '0')}`;
  const actRef = () => `ACT-${year}-${String(++actSeq).padStart(6, '0')}`;
  const now = Date.now();
  const ts = (offsetDays: number) => new Date(now + offsetDays * DAY).toISOString();

  const subject = (i: number) => ds.employees.filter((e) => e.status === 'ACTIVE')[i].uid;

  async function createCase(o: { by: string; status: string; type: string; category: string; source: string; priority: string; conf: string;
    summary: string; openedDaysAgo: number; team: Array<[string, string]>; subjectUid: string; closed?: boolean }) {
    const { rows } = await q(`insert into er.er_case(reference, case_type_code, category_code, source_code, summary_enc, reported_date, priority_code,
        confidentiality_level, status_code, lead_officer_user_id, opened_at, created_at, created_by, closed_at, closure_reason)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,$12,$13,$14) returning id, reference`,
      [caseRef(), o.type, o.category, o.source, cipher.encrypt(o.summary), ts(-o.openedDaysAgo).slice(0, 10), o.priority, o.conf, o.status,
       U(o.team[0][0]), ts(-o.openedDaysAgo), U(o.by), o.closed ? ts(-2) : null, o.closed ? 'SAMPLE: no case to answer' : null]);
    const id = rows[0].id;
    for (const [who, role] of o.team) await q('insert into er.case_team_member(case_id, user_id, case_role, valid_from, granted_by) values ($1,$2,$3,$4,$5)', [id, U(who), role, ts(-o.openedDaysAgo), U(o.by)]);
    await q('insert into er.case_participant(case_id, participant_role, employee_uid, created_by) values ($1,$2,$3,$4)', [id, 'SUBJECT', o.subjectUid, U(o.by)]);
    const ev = async (type: string, daysAgo: number, text: string) =>
      q('insert into er.case_event(case_id, event_type, event_at, recorded_at, summary_enc, recorded_by) values ($1,$2,$3,$3,$4,$5)', [id, type, ts(-daysAgo), cipher.encrypt(text), U(o.by)]);
    await ev('CREATED', o.openedDaysAgo, `Case opened (SAMPLE). ${o.summary}`);
    return { id, reference: rows[0].reference as string, ev };
  }

  async function action(o: { module: string; type: string; recordId: string; title: string; detail?: string; owner?: string; team?: string;
    priority: string; status: string; dueDays: number | null; vis?: string; mandatory?: boolean; by: string; completedDaysAgo?: number }) {
    const { rows } = await q(`insert into actions.action(reference, source_module, source_record_type, source_record_id, title_safe, detail_restricted,
        owner_user_id, owner_team_id, priority_code, status_code, due_at, visibility_class, is_mandatory, created_by, completed_at, completed_by, completion_notes)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) returning id`,
      [actRef(), o.module, o.type, o.recordId, o.title, o.detail ?? null, o.owner ? U(o.owner) : null, o.team ?? null, o.priority, o.status,
       o.dueDays === null ? null : ts(o.dueDays), o.vis ?? 'STANDARD', !!o.mandatory, U(o.by),
       o.completedDaysAgo !== undefined ? ts(-o.completedDaysAgo) : null, o.completedDaysAgo !== undefined ? (o.owner ? U(o.owner) : null) : null,
       o.completedDaysAgo !== undefined ? 'Completed (SAMPLE)' : null]);
    await q(`insert into actions.action_event(action_id, event_type, to_value, actor, created_at) values ($1,'CREATED',$2,$3,now())`, [rows[0].id, o.status, U(o.by)]);
    return rows[0].id;
  }

  const c1 = await createCase({ by: 'er.officer', status: 'ASSESSMENT', type: 'DISCIPLINARY', category: 'ATTENDANCE', source: 'MANAGER', priority: 'MEDIUM', conf: 'STANDARD',
    summary: 'SAMPLE – repeated unapproved absence reported by line manager (synthetic scenario).', openedDaysAgo: 18,
    team: [['er.officer', 'LEAD'], ['er.manager', 'REVIEWER'], ['humaam', 'OFFICER']], subjectUid: subject(10) });
  await c1.ev('NOTE', 16, 'SAMPLE – initial review of attendance extract completed.');
  await c1.ev('STATUS_CHANGED', 15, 'Status INTAKE → ASSESSMENT');
  await action({ module: 'er', type: 'er_case', recordId: c1.id, title: 'ER follow-up task', detail: `${c1.reference}: obtain attendance records from manager`, owner: 'er.officer',
    priority: 'HIGH', status: 'IN_PROGRESS', dueDays: -3, vis: 'CASE_RESTRICTED', mandatory: true, by: 'er.officer' });
  await action({ module: 'er', type: 'er_case', recordId: c1.id, title: 'ER follow-up task', detail: `${c1.reference}: provide rota for the period`, owner: 'manager',
    priority: 'MEDIUM', status: 'OPEN', dueDays: 2, vis: 'CASE_RESTRICTED', by: 'er.officer' });

  const c2 = await createCase({ by: 'er.manager', status: 'INVESTIGATION', type: 'GRIEVANCE', category: 'INTERPERSONAL', source: 'DIRECT', priority: 'HIGH', conf: 'RESTRICTED',
    summary: 'SAMPLE – grievance about team conduct (synthetic scenario).', openedDaysAgo: 30,
    team: [['er.manager', 'LEAD']], subjectUid: subject(42) });
  await c2.ev('STATUS_CHANGED', 25, 'Status ASSESSMENT → INVESTIGATION');
  await action({ module: 'er', type: 'er_case', recordId: c2.id, title: 'ER follow-up task', detail: `${c2.reference}: schedule interviews`, owner: 'er.manager',
    priority: 'HIGH', status: 'OPEN', dueDays: 1, vis: 'CASE_RESTRICTED', mandatory: true, by: 'er.manager' });

  const c3 = await createCase({ by: 'er.officer', status: 'CLOSED', type: 'INVESTIGATION', category: 'POLICY_BREACH', source: 'OTHER', priority: 'LOW', conf: 'STANDARD',
    summary: 'SAMPLE – minor policy query, closed after assessment (synthetic scenario).', openedDaysAgo: 60,
    team: [['er.officer', 'LEAD'], ['er.manager', 'REVIEWER']], subjectUid: subject(77), closed: true });
  await c3.ev('CLOSED', 2, 'Case closed. Reason: SAMPLE: no case to answer');

  // General (non-ER) sample actions so every persona's My Work has content.
  const general: Array<[string, string, string, number | null, string, number?]> = [
    ['analytics.admin', 'Prepare dataset inventory template (Phase 0 – DR-12)', 'HIGH', -1, 'IN_PROGRESS'],
    ['analytics.admin', 'Draft metric dictionary headings (DR-11)', 'MEDIUM', 5, 'OPEN'],
    ['analytics.admin', 'Confirm golden test scenarios with HR', 'LOW', 12, 'OPEN'],
    ['engagement.hr', 'Record survey provider decision input (DR-21)', 'MEDIUM', 3, 'OPEN'],
    ['engagement.hr', 'Collate action-plan rule options (DR-25)', 'LOW', -6, 'BLOCKED'],
    ['hr.leadership', 'Name module owners (DR-01)', 'URGENT', -2, 'OPEN'],
    ['division.head', 'Review division access list (SAMPLE)', 'MEDIUM', 4, 'OPEN'],
    ['department.head', 'Confirm department reporting lines (SAMPLE)', 'LOW', 9, 'OPEN'],
    ['manager', 'Complete probation check-in (SAMPLE)', 'MEDIUM', 6, 'OPEN'],
    ['employee', 'Acknowledge policy update (SAMPLE)', 'LOW', 10, 'OPEN'],
    ['document.hr', 'Collect approved letter templates (DR-30)', 'HIGH', 2, 'OPEN'],
    ['document.approver', 'Nominate signatories per letter type (DR-30)', 'MEDIUM', 7, 'OPEN'],
    ['platform.admin', 'Request Entra DEV app registration', 'HIGH', 1, 'IN_PROGRESS'],
    ['voice.triage', 'Review draft triage categories (DR-28)', 'LOW', 14, 'OPEN'],
    ['fwt.coordinator', 'Gather quarter activity plan (SAMPLE)', 'LOW', 8, 'OPEN'],
    ['access.approver', 'Review pending access recertification (SAMPLE)', 'MEDIUM', 0.5, 'OPEN'],
    ['er.officer', 'Update D&G tracker reference mapping (DR-19)', 'MEDIUM', -8, 'COMPLETED', 1],
    ['azwa.moosa', 'Circulate access matrix review sheet (DR-06/DR-07)', 'HIGH', 2, 'IN_PROGRESS'],
    ['azwa.moosa', 'Confirm Entra DEV app registration request with IT', 'MEDIUM', -1, 'OPEN'],
    ['azwa.moosa', 'Review BML design tokens with Brand team', 'LOW', 9, 'OPEN'],
    ['azwa.moosa.2', 'Prepare monthly absence extract (SAMPLE)', 'MEDIUM', 4, 'OPEN'],
    ['maiz', 'Name module owners (DR-01)', 'URGENT', -3, 'OPEN'],
    ['maiz', 'Approve Sprint 2 scope', 'HIGH', 5, 'OPEN'],
    ['shai', 'Confirm ER SLA matrix (DR-16)', 'HIGH', 3, 'OPEN'],
    ['shai', 'Nominate letter signatories (DR-30)', 'MEDIUM', -2, 'BLOCKED'],
    ['rayya', 'Agree ER workflow statuses (DR-15)', 'HIGH', 1, 'IN_PROGRESS'],
    ['rayya', 'Set engagement anonymity threshold (DR-22)', 'MEDIUM', 6, 'OPEN'],
    ['humaam', 'Update case chronology for ER-2026-0001 (SAMPLE)', 'MEDIUM', 2, 'OPEN'],
    ['anj', 'Collect approved letter templates (DR-30)', 'HIGH', 3, 'OPEN'],
    ['arif', 'Review division access list (SAMPLE)', 'MEDIUM', 5, 'OPEN'],
    ['ish', 'Acknowledge policy update (SAMPLE)', 'LOW', 10, 'OPEN'],
    ['bishwajit', 'Provision UAT environment request (DR-03)', 'MEDIUM', 7, 'OPEN'],
  ];
  for (const [owner, title, pr, due, st, done] of general) {
    await action({ module: 'platform', type: 'phase0_task', recordId: sysUser, title, owner, priority: pr, status: st, dueDays: due, by: 'hr.leadership', completedDaysAgo: done });
  }
  await action({ module: 'platform', type: 'phase0_task', recordId: sysUser, title: 'Triage unassigned ER mailbox items (SAMPLE)', team: erTeam, priority: 'MEDIUM', status: 'OPEN', dueDays: 1, by: 'er.manager' });

  await q(`insert into config.sequence_counter(rule_code, period_key, last_value) values ('ER_CASE',$1,$2),('ACTION',$1,$3)`, [String(year), caseSeq, actSeq]);

  await q(`insert into audit.audit_event(occurred_at, actor_type, event_type, module, resource_type, outcome, sensitivity, summary, correlation_id)
           values (now(),'JOB','platform.seed.completed','platform','database','SUCCESS','INT',$1,gen_random_uuid())`,
    [JSON.stringify({ marker: SYNTHETIC_MARKER, seed: ds.seed, datasetHash: datasetHash(ds), employees: ds.employees.length, orgUnits: ds.org.length })]);

  await q('commit');
  console.log(`Seeded: ${ROLES.length} roles, ${PERMISSIONS.length} permissions, ${ds.org.length} org units, ${ds.employees.length} employees, ${ds.personas.length} personas, ${caseSeq} ER cases, ${actSeq} actions.`);
  await db.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
