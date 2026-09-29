#!/usr/bin/env node
/**
 * Security & permission suite (D7, TST-001, F.4 negative tests).
 * Requires: API on API_BASE_URL, worker running, seeded DEV database.
 *   pnpm test:security
 * Sections: 1) matrix-driven route tests  2) record/field negatives  3) workflow rules
 *           4) audit immutability & tamper detection  5) environment safety switches
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const require = createRequire(import.meta.url);
require('dotenv').config({ path: resolve(root, '.env') });
const YAML = require('yaml');
const { Client } = require('pg');

const API = process.env.API_BASE_URL ?? 'http://localhost:4000';
let pass = 0, fail = 0;
const failures = [];
const ok = (cond, name, info = '') => {
  if (cond) { pass++; } else { fail++; failures.push(`${name} ${info}`); }
  process.stdout.write(cond ? '.' : 'F');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tokens = {};
async function token(upn) {
  if (tokens[upn]) return tokens[upn];
  const r = await fetch(`${API}/auth/dev-login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ upn }) });
  if (!r.ok) throw new Error(`login failed for ${upn}: ${r.status}`);
  return (tokens[upn] = (await r.json()).token);
}
async function call(upn, method, path, body, base = API) {
  const headers = { 'content-type': 'application/json' };
  if (upn) headers.authorization = `Bearer ${upn.startsWith('eyJ') ? upn : await token(upn)}`;
  const r = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await r.json(); } catch {}
  return { status: r.status, json, text: JSON.stringify(json) };
}

const db = new Client({ connectionString: process.env.DATABASE_URL_MIGRATOR });
await db.connect();
const year = new Date().getUTCFullYear();
const caseId = async (ref) => (await db.query('select id from er.er_case where reference = $1', [ref])).rows[0].id;
const empUnder = async (div) => (await db.query(
  `select e.uid from synthetic_hris.employee e join org.organisation_unit_version v on v.org_unit_id = e.org_unit_id
     and v.effective_from <= current_date and (v.effective_to is null or v.effective_to > current_date)
   where v.path ~ $1::lquery and e.status='ACTIVE' order by e.uid limit 1`, [`bank.${div}.*`])).rows[0].uid;
const P = { c1: await caseId(`ER-${year}-0001`), c2: await caseId(`ER-${year}-0002`), inScope: await empUnder('div01'), outScope: await empUnder('div02') };
const fill = (s) => s.replace(/\{(\w+)\}/g, (_, k) => P[k]);

// ------------------------------------------------------------------ 1) matrix
const matrix = YAML.parse(readFileSync(resolve(here, 'matrix.platform.yaml'), 'utf8'));
console.log(`\n1) Permission matrix (${matrix.cases.length} routes)`);
for (const c of matrix.cases) {
  for (const [alias, expected] of Object.entries(c.expect)) {
    const r = await call(matrix.personas[alias], 'GET', fill(c.get));
    ok(r.status === expected, `[matrix] ${c.name} as ${alias}`, `expected ${expected} got ${r.status}`);
  }
}
ok((await call(null, 'GET', '/me')).status === 401, '[auth] no token → 401');
ok((await call('eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ4In0.bad', 'GET', '/me')).status === 401, '[auth] forged token → 401');

// ------------------------------------------------------------------ 2) record & field negatives
console.log('\n2) Record, scope and field rules');
const pers = matrix.personas;
for (const alias of ['hra', 'dh', 'doc', 'ero']) {
  const r = await call(pers[alias], 'GET', `/employees/${P.inScope}`);
  if (r.status !== 200) continue;
  ok(!/TEST-A|TEST-P/.test(r.text) && r.json.salary?.masked === true, `[mask] ${alias} gets masked restricted fields`);
}
ok((await call(pers.doc, 'POST', `/employees/${P.inScope}/reveal`, { field: 'nid' })).json?.value?.startsWith('TEST-A'), '[reveal] Document HR can reveal NID');
ok((await call(pers.hra, 'POST', `/employees/${P.inScope}/reveal`, { field: 'salary' })).status === 403, '[reveal] Analytics Admin cannot reveal salary');
ok((await call(pers.dh, 'POST', `/employees/${P.outScope}/reveal`, { field: 'salary' })).status === 403, '[reveal] Division Head cannot reveal out of scope');
const dhSearch = await call(pers.dh, 'GET', '/employees?q=ah&limit=50');
ok(dhSearch.json.items.length > 0, '[scope] Division Head search returns results');
const outNames = (await db.query(`select count(*)::int n from synthetic_hris.employee where uid = any($1)`, [dhSearch.json.items.map((i) => i.uid)])).rows[0].n;
const leaked = (await db.query(
  `select count(*)::int n from synthetic_hris.employee e join org.organisation_unit_version v on v.org_unit_id=e.org_unit_id
     and v.effective_from <= current_date and (v.effective_to is null or v.effective_to > current_date)
    where e.uid = any($1) and not (v.path ~ 'bank.div01.*'::lquery)`, [dhSearch.json.items.map((i) => i.uid)])).rows[0].n;
ok(outNames > 0 && leaked === 0, '[scope] Division Head search never returns other divisions', `leaked=${leaked}`);
const dhx = await call(pers.dhx, 'GET', '/me');
ok(dhx.json.hasAccess === false, '[scope] expired grant removes access without redeploy');

const mgrWork = await call(pers.mgr, 'GET', '/actions?view=my');
const erTask = mgrWork.json.items.find((a) => a.sourceModule === 'er');
ok(erTask && erTask.title === 'ER follow-up task' && erTask.detail === null && erTask.sourceLink === null && erTask.detailHidden === true,
  '[ER-006] manager sees safe title only for ER task');
const mgrCase = await call(pers.mgr, 'GET', `/er/cases/${P.c1}`);
ok(mgrCase.status === 403 && !mgrCase.text.includes('SAMPLE'), '[F.4-2] manager cannot open linked case');
const eroList = await call(pers.ero, 'GET', '/er/cases');
ok(!eroList.json.some((c) => c.id === P.c2), '[RLS] ER Officer list excludes cases not on team');
ok((await call(pers.adm, 'GET', `/employees/${P.inScope}`)).status === 403, '[F.4-9] Platform Admin denied business data');

// ------------------------------------------------------------------ 3) workflow rules
console.log('\n3) Workflow rules');
const created = await call(pers.ero, 'POST', '/er/cases', {
  caseType: 'GRIEVANCE', category: 'CONDUCT', source: 'DIRECT', priority: 'MEDIUM', confidentiality: 'STANDARD',
  summary: 'SECURITY-SUITE synthetic grievance', reportedDate: new Date().toISOString().slice(0, 10), subjectUid: P.inScope,
});
ok(created.status === 201 && /^ER-\d{4}-\d{4}$/.test(created.json.reference), '[ER-002] case created with configured reference', created.status);
const nc = created.json.id;
ok((await call(pers.ero2, 'GET', `/er/cases/${nc}`)).status === 403, '[ER-003] new case invisible to non-team officer');
const bad = await call(pers.ero, 'POST', '/er/cases', { caseType: 'NOPE' });
ok(bad.status === 422, '[ER-002] invalid lookup rejected');
const tl = await call(pers.ero, 'GET', `/er/cases/${nc}/timeline`);
const firstEvent = tl.json[0].id;
ok((await call(pers.ero, 'POST', `/er/cases/${nc}/timeline/${firstEvent}/amend`, { text: 'corrected', reason: 'typo' })).status === 201, '[ER-004] amendment recorded');
const tl2 = await call(pers.ero, 'GET', `/er/cases/${nc}/timeline`);
ok(tl2.json.find((e) => e.id === firstEvent).text === tl.json[0].text && tl2.json.some((e) => e.amends === firstEvent), '[ER-004] original entry unchanged, amendment linked');
ok((await call(pers.ero, 'POST', `/er/cases/${nc}/status`, { to: 'OUTCOME_PENDING' })).status === 409, '[ER-005] illegal transition → 409');
ok((await call(pers.ero, 'POST', `/er/cases/${nc}/status`, { to: 'ASSESSMENT' })).status === 200, '[ER-005] allowed transition');
ok((await call(pers.ero, 'POST', `/er/cases/${nc}/close`, { reason: 'x' })).status === 403, '[ER-013] officer cannot close');
const closeBlocked = await call(pers.erm, 'POST', `/er/cases/${nc}/close`, { reason: 'no case to answer' });
ok(closeBlocked.status === 409 && closeBlocked.json.openActions?.length === 1, '[ER-013] close blocked by open mandatory action');
ok((await call(pers.erm, 'POST', `/er/cases/${nc}/close`, { reason: 'no case to answer', overrideReason: 'intake superseded' })).status === 200, '[ER-013] close with override reason');

const act = await call(pers.hra, 'POST', '/actions', { title: 'SECURITY-SUITE task', priority: 'LOW' });
ok(act.status === 201, '[ACT] ad-hoc action created');
ok((await call(pers.hra, 'POST', `/actions/${act.json.id}/transition`, { to: 'OPEN' })).status === 409, '[ACT-005] illegal transition → 409');
ok((await call(pers.emp, 'POST', `/actions/${act.json.id}/transition`, { to: 'IN_PROGRESS' })).status === 403, '[ACT] non-owner cannot act');
ok((await call(pers.hra, 'POST', `/actions/${act.json.id}/transition`, { to: 'COMPLETED' })).status === 200, '[ACT] owner completes');
ok((await call(pers.hra, 'POST', `/actions/${act.json.id}/transition`, { to: 'IN_PROGRESS', reason: 'x' })).status === 403, '[ACT-005] reopen needs permission');
const mand = (await call(pers.ero, 'GET', '/actions?view=my')).json.items.find((a) => a.mandatory && a.status !== 'COMPLETED');
ok((await call(pers.ero, 'POST', `/actions/${mand.id}/transition`, { to: 'COMPLETED' })).status === 422, '[ACT-007] mandatory completion needs notes');
ok((await call(pers.adm, 'PATCH', '/admin/feature-flags/voice.anonymous_route', { enabled: true })).status === 409, '[VOI-002] anonymous route gated by DR-27');

// ------------------------------------------------------------------ 4) audit
console.log('\n4) Audit immutability & tamper detection');
await sleep(1500); // allow worker relay
const pending = (await db.query('select count(*)::int n from platform.outbox where processed_at is null')).rows[0].n;
ok(pending === 0, '[AUD-001] outbox relayed by worker', `pending=${pending}`);
const kinds = (await db.query(`select array_agg(distinct event_type) k from audit.audit_event`)).rows[0].k;
for (const k of ['auth.login.succeeded', 'access.denied', 'er.case.viewed', 'er.case.created', 'er.case.closed', 'employee.restricted_field.revealed', 'action.completed']) {
  ok(kinds.includes(k), `[audit] event recorded: ${k}`);
}
const leak = (await db.query(`select count(*)::int n from audit.audit_event where summary::text ~ '(TEST-A|TEST-P|SECURITY-SUITE synthetic)'`)).rows[0].n;
ok(leak === 0, '[audit] no restricted values or narrative in audit summaries');
const rt = new Client({ connectionString: process.env.DATABASE_URL });
await rt.connect();
for (const sql of ['update audit.audit_event set module = module', 'delete from audit.audit_event']) {
  let blocked = false; try { await rt.query(sql); } catch { blocked = true; }
  ok(blocked, `[AUD-001] runtime role blocked: ${sql.split(' ')[0]}`);
}
let trig = false; try { await db.query('update audit.audit_event set module = module where chain_seq = 1'); } catch { trig = true; }
ok(trig, '[AUD-001] trigger blocks UPDATE even for owner');
ok((await call(pers.aud, 'GET', '/audit/verify')).json.intact === true, '[AUD-001] chain intact');
// Simulated DBA tamper (triggers disabled) must be detected, then reverted.
await db.query('alter table audit.audit_event disable trigger audit_block_update');
const orig = (await db.query('select summary from audit.audit_event where chain_seq = 2')).rows[0].summary;
await db.query(`update audit.audit_event set summary = '{"tampered":true}' where chain_seq = 2`);
const v = (await call(pers.aud, 'GET', '/audit/verify')).json;
ok(v.intact === false && v.firstBrokenSeq === 2, '[AUD-001] tamper detected at exact row');
await db.query('update audit.audit_event set summary = $1 where chain_seq = 2', [orig ? JSON.stringify(orig) : null]);
await db.query('alter table audit.audit_event enable trigger audit_block_update');
ok((await call(pers.aud, 'GET', '/audit/verify')).json.intact === true, '[AUD-001] chain intact after revert');
let atom = true;
try { await rt.query('begin'); await rt.query(`insert into platform.outbox(topic,payload) values ('audit','{}')`); await rt.query('rollback'); } catch { atom = false; }
ok(atom && (await db.query(`select count(*)::int n from platform.outbox where payload = '{}'`)).rows[0].n === 0, '[AUD-001] rollback leaves no outbox row');
await rt.end();

// ------------------------------------------------------------------ 5) environment safety
console.log('\n5) Environment safety switches');
const boot = (env, port) => new Promise((res) => {
  const p = spawn(process.execPath, [resolve(root, 'apps/api/dist/main.js')], { env: { ...process.env, ...env, API_PORT: String(port) } });
  let out = ''; p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  const t = setTimeout(() => res({ p, alive: true, out }), 2500);
  p.on('exit', (code) => { clearTimeout(t); res({ p, alive: false, code, out }); });
});
const refuse = await boot({ PLATFORM_ENV: 'uat', MOCK_IDP_ENABLED: 'true', ENTRA_TENANT_ID: '00000000-0000-0000-0000-000000000000' }, 4101);
ok(!refuse.alive && /mock IdP is enabled/.test(refuse.out), '[D3] API refuses to boot with mock IdP in UAT');
const uat = await boot({ PLATFORM_ENV: 'uat', MOCK_IDP_ENABLED: 'false', ENTRA_TENANT_ID: '00000000-0000-0000-0000-000000000000', ENTRA_API_AUDIENCE: 'api://x' }, 4102);
if (uat.alive) {
  const r = await call(await token(pers.hra), 'GET', '/me', null, 'http://localhost:4102');
  ok(r.status === 401, '[PLT-001] mock token rejected in UAT build', r.status);
  ok((await fetch('http://localhost:4102/auth/personas')).status === 404, '[PLT-001] persona list absent in UAT');
  uat.p.kill();
} else ok(false, '[PLT-001] UAT instance failed to start', uat.out.slice(0, 200));

await db.end();
console.log(`\n\n${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFailures:\n  ' + failures.join('\n  ')); process.exit(1); }
