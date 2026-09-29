import { Inject, Injectable } from '@nestjs/common';
import { FieldCipher } from '@bml/crypto';
import { availableTransitions, can, canSeeCase, checkTransition, isTerminal, SecurityContext } from '@bml/policy';
import { DbService, Tx } from '../infra/db.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '../config/config.service';
import { ActionsService } from '../actions/actions.service';
import { EMPLOYEE_PROVIDER, EmployeeProvider } from '../employees/employee.provider';
import { ApiError, conflict, forbidden, invalid, notFound } from '../infra/errors';

export const CIPHER = Symbol('CIPHER');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ER Case Management MVP (Phase 3 slice): intake, profile, immutable chronology with amendments,
 * case team, status machine, case tasks via ActionService, closure checklist, access log.
 * Case access = app policy (case team / portfolio) AND Postgres RLS. Narrative fields are encrypted.
 */
@Injectable()
export class ErService {
  constructor(
    private db: DbService, private audit: AuditService, private config: ConfigService, private actions: ActionsService,
    @Inject(EMPLOYEE_PROVIDER) private employees: EmployeeProvider, @Inject(CIPHER) private cipher: FieldCipher,
  ) {}

  private dec(v: string | null) { return v ? this.cipher.decrypt(v) : null; }

  /** Loads a case the caller may see; 404 if it does not exist, 403 (audited by filter) if it exists but is not permitted. */
  private async loadCase(tx: Tx, ctx: SecurityContext, id: string) {
    if (!UUID.test(id)) throw notFound('Case not found');
    const { rows } = await tx.query(
      `select c.*, lu.display_name as lead_name,
              exists (select 1 from er.case_team_member m where m.case_id = c.id and m.user_id = $2
                       and now() >= m.valid_from and (m.valid_to is null or now() < m.valid_to)) as is_member
         from er.er_case c left join platform.app_user lu on lu.id = c.lead_officer_user_id where c.id = $1`, [id, ctx.userId]);
    const row = rows[0];
    if (!row) {
      const exists = (await tx.query(`select er.case_exists($1) as e`, [id])).rows[0].e;
      if (exists) throw forbidden('You are not on this case team');
      throw notFound('Case not found');
    }
    // Defence-in-depth: app policy must agree with RLS.
    if (!canSeeCase(ctx, { isActiveTeamMember: row.is_member, isCreator: row.created_by === ctx.userId })) throw forbidden('You are not on this case team');
    return row;
  }

  private async event(tx: Tx, ctx: SecurityContext, caseId: string, type: string, text: string, extra: { eventAt?: string; relatedType?: string; relatedId?: string; amends?: string; amendReason?: string } = {}) {
    const { rows } = await tx.query(
      `insert into er.case_event(case_id, event_type, event_at, summary_enc, related_type, related_id, amends_event_id, amendment_reason, recorded_by)
       values ($1,$2,coalesce($3::timestamptz, now()),$4,$5,$6,$7,$8,$9) returning id`,
      [caseId, type, extra.eventAt ?? null, this.cipher.encrypt(text), extra.relatedType ?? null, extra.relatedId ?? null, extra.amends ?? null, extra.amendReason ?? null, ctx.userId]);
    return rows[0].id as string;
  }

  // ---------------------------------------------------------------- dashboard & list
  async dashboard(ctx: SecurityContext) {
    const sm = await this.config.stateMachine('er.case');
    return this.db.tx(ctx, async (tx) => {
      // RLS restricts every count to cases the caller may see (ER-001).
      const byStatus = (await tx.query(`select status_code, count(*)::int as n from er.er_case group by status_code`)).rows;
      const aging = (await tx.query(
        `select count(*) filter (where age < 15)::int as "0-14", count(*) filter (where age between 15 and 30)::int as "15-30",
                count(*) filter (where age between 31 and 60)::int as "31-60", count(*) filter (where age > 60)::int as "60+"
           from (select extract(day from now() - opened_at)::int as age from er.er_case where closed_at is null) x`)).rows[0];
      const overdue = (await tx.query(
        `select count(*)::int as n from actions.action a
          where a.source_record_type = 'er_case' and er.can_see_case(a.source_record_id)
            and a.status_code not in ('COMPLETED','CANCELLED') and a.due_at < now()`)).rows[0].n;
      const open = byStatus.filter((s) => !isTerminal(sm, s.status_code)).reduce((a, s) => a + s.n, 0);
      return {
        open, overdueActions: overdue, aging,
        byStatus: sm.states.map((s) => ({ code: s.code, label: s.label, count: byStatus.find((b) => b.status_code === s.code)?.n ?? 0 })),
        scope: can(ctx, 'er.case.read_all') ? 'All cases (portfolio override)' : 'Cases where you are on the case team',
        pendingDecisions: { dAndG: null, letters: null, note: 'D&G and ER letters arrive in Phase 4 (DR-17, DR-18)' },
      };
    });
  }

  async list(ctx: SecurityContext, status?: string) {
    const sm = await this.config.stateMachine('er.case');
    return this.db.tx(ctx, async (tx) => {
      const { rows } = await tx.query(
        `select c.id, c.reference, c.case_type_code, c.category_code, c.status_code, c.priority_code, c.confidentiality_level,
                c.opened_at, c.closed_at, lu.display_name as lead_name,
                (select employee_uid from er.case_participant p where p.case_id = c.id and p.participant_role = 'SUBJECT' limit 1) as subject_uid,
                (select count(*)::int from actions.action a where a.source_record_type='er_case' and a.source_record_id = c.id
                   and a.status_code not in ('COMPLETED','CANCELLED')) as open_tasks,
                (select count(*)::int from actions.action a where a.source_record_type='er_case' and a.source_record_id = c.id
                   and a.status_code not in ('COMPLETED','CANCELLED') and a.due_at < now()) as overdue_tasks
           from er.er_case c left join platform.app_user lu on lu.id = c.lead_officer_user_id
          where ($1::text is null or c.status_code = $1) order by c.opened_at desc`, [status ?? null]);
      const people = new Map((await this.employees.getMany(rows.map((r) => r.subject_uid).filter(Boolean))).map((e) => [e.uid, e.fullName]));
      return rows.map((r) => ({
        id: r.id, reference: r.reference, type: r.case_type_code, category: r.category_code, status: r.status_code,
        statusLabel: sm.states.find((s) => s.code === r.status_code)?.label ?? r.status_code,
        priority: r.priority_code, confidentiality: r.confidentiality_level, openedAt: r.opened_at, closedAt: r.closed_at,
        lead: r.lead_name, subject: r.subject_uid ? { uid: r.subject_uid, name: people.get(r.subject_uid) ?? null } : null,
        openTasks: r.open_tasks, overdueTasks: r.overdue_tasks,
        ageDays: Math.floor((Date.now() - new Date(r.opened_at).getTime()) / 86400000),
      }));
    });
  }

  // ---------------------------------------------------------------- intake (ER-002)
  async create(ctx: SecurityContext, b: any) {
    for (const [set, v, f] of [['er.case_type', b.caseType, 'caseType'], ['er.category', b.category, 'category'], ['er.source', b.source, 'source'],
      ['er.priority', b.priority, 'priority'], ['er.confidentiality', b.confidentiality, 'confidentiality']] as const) {
      await this.config.assertLookup(set, v, f);
    }
    if (!b.summary?.trim() || b.summary.trim().length < 10) throw invalid('summary must be at least 10 characters');
    if (!b.reportedDate || !/^\d{4}-\d{2}-\d{2}$/.test(b.reportedDate)) throw invalid('reportedDate is required (YYYY-MM-DD)');
    if (b.incidentDate && !/^\d{4}-\d{2}-\d{2}$/.test(b.incidentDate)) throw invalid('incidentDate must be YYYY-MM-DD');
    const subject = await this.employees.get(b.subjectUid ?? '');
    if (!subject) throw invalid('subjectUid must be a valid employee (EmployeeService lookup)');
    const sm = await this.config.stateMachine('er.case');

    return this.db.tx(ctx, async (tx) => {
      const reference = await this.config.nextReference(tx, 'ER_CASE');
      const { rows } = await tx.query(
        `insert into er.er_case(reference, case_type_code, category_code, source_code, summary_enc, incident_date, reported_date,
           priority_code, confidentiality_level, status_code, lead_officer_user_id, created_by)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) returning id`,
        [reference, b.caseType, b.category, b.source, this.cipher.encrypt(b.summary.trim()), b.incidentDate || null, b.reportedDate,
         b.priority, b.confidentiality, sm.initial, ctx.userId]);
      const id = rows[0].id;
      await tx.query(`insert into er.case_team_member(case_id, user_id, case_role, granted_by) values ($1,$2,'LEAD',$2)`, [id, ctx.userId]);
      await tx.query(`insert into er.case_participant(case_id, participant_role, employee_uid, created_by) values ($1,'SUBJECT',$2,$3)`, [id, subject.uid, ctx.userId]);
      await this.event(tx, ctx, id, 'CREATED', `Case ${reference} opened (${b.caseType}/${b.category}, source ${b.source}).`);
      // Initial intake task. No SLA auto-due-date until ER SLAs are approved (DR-16) – manual due date allowed.
      const task = await this.actions.createInTx(tx, ctx, {
        sourceModule: 'er', sourceRecordType: 'er_case', sourceRecordId: id, titleSafe: 'ER follow-up task',
        detailRestricted: `${reference}: review new case intake`, ownerUserId: ctx.userId, priority: b.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
        dueAt: b.firstTaskDue || null, visibility: 'CASE_RESTRICTED', mandatory: true,
      });
      await this.event(tx, ctx, id, 'TASK_CREATED', `Task ${task.reference} created: review new case intake.`, { relatedType: 'action', relatedId: task.id });
      await this.audit.record(tx, {
        eventType: 'er.case.created', module: 'er', resourceType: 'er_case', resourceId: id, sensitivity: 'HREST',
        summary: { reference, caseType: b.caseType, category: b.category, source: b.source, priority: b.priority, confidentiality: b.confidentiality },
      });
      return { id, reference };
    });
  }

  // ---------------------------------------------------------------- profile (ER-003) + access log (AUD-002)
  async get(ctx: SecurityContext, id: string) {
    const sm = await this.config.stateMachine('er.case');
    return this.db.tx(ctx, async (tx) => {
      const c = await this.loadCase(tx, ctx, id);
      const participants = (await tx.query(`select id, participant_role, employee_uid from er.case_participant where case_id = $1 order by created_at`, [id])).rows;
      const team = (await tx.query(
        `select m.user_id, u.display_name, m.case_role, m.valid_from, m.valid_to from er.case_team_member m
           join platform.app_user u on u.id = m.user_id where m.case_id = $1 order by m.valid_from`, [id])).rows;
      const people = new Map((await this.employees.getMany(participants.map((p) => p.employee_uid).filter(Boolean))).map((e) => [e.uid, e]));
      await this.audit.record(tx, { eventType: 'er.case.viewed', module: 'er', resourceType: 'er_case', resourceId: id, sensitivity: 'HREST', summary: { reference: c.reference } });
      const closed = isTerminal(sm, c.status_code);
      return {
        id: c.id, reference: c.reference, type: c.case_type_code, category: c.category_code, source: c.source_code,
        summary: this.dec(c.summary_enc), incidentDate: c.incident_date, reportedDate: c.reported_date,
        priority: c.priority_code, confidentiality: c.confidentiality_level, status: c.status_code,
        statusLabel: sm.states.find((s) => s.code === c.status_code)?.label, lead: c.lead_name,
        openedAt: c.opened_at, closedAt: c.closed_at, closureReason: c.closure_reason, legalHold: c.legal_hold,
        participants: participants.map((p) => ({ id: p.id, role: p.participant_role, uid: p.employee_uid,
          name: people.get(p.employee_uid)?.fullName ?? null, position: people.get(p.employee_uid)?.positionTitle ?? null })),
        team: team.map((t) => ({ userId: t.user_id, name: t.display_name, role: t.case_role, from: t.valid_from, to: t.valid_to,
          active: !t.valid_to || new Date(t.valid_to) > new Date() })),
        transitions: closed ? [] : availableTransitions(sm, c.status_code, (p) => can(ctx, p)).filter((t) => t.to !== 'CLOSED')
          .map((t) => ({ to: t.to, label: t.label, requiresReason: !!t.requiresReason })),
        can: {
          update: !closed && can(ctx, 'er.case.update'), manageTeam: !closed && can(ctx, 'er.case.team.manage'),
          close: !closed && can(ctx, 'er.case.close') && availableTransitions(sm, c.status_code, () => true).some((t) => t.to === 'CLOSED'),
          accessLog: can(ctx, 'er.case.access_log.read'),
        },
        workflowNote: 'Statuses and transitions are SAMPLE configuration – NOT BML policy (DR-15).',
      };
    });
  }

  async timeline(ctx: SecurityContext, id: string) {
    return this.db.tx(ctx, async (tx) => {
      await this.loadCase(tx, ctx, id);
      const { rows } = await tx.query(
        `select e.*, u.display_name as recorded_by_name from er.case_event e join platform.app_user u on u.id = e.recorded_by
          where e.case_id = $1 order by e.event_at, e.recorded_at`, [id]);
      const amendedBy = new Map<string, string[]>();
      rows.forEach((r) => { if (r.amends_event_id) amendedBy.set(r.amends_event_id, [...(amendedBy.get(r.amends_event_id) ?? []), r.id]); });
      return rows.map((r) => ({
        id: r.id, type: r.event_type, eventAt: r.event_at, recordedAt: r.recorded_at, text: this.dec(r.summary_enc),
        recordedBy: r.recorded_by_name, amends: r.amends_event_id, amendmentReason: r.amendment_reason,
        amendedBy: amendedBy.get(r.id) ?? [], relatedType: r.related_type, relatedId: r.related_id,
      }));
    });
  }

  async addEvent(ctx: SecurityContext, id: string, b: { eventType?: string; eventAt?: string; text?: string }) {
    await this.config.assertLookup('er.event_type', b.eventType, 'eventType');
    if (!b.text?.trim()) throw invalid('text is required');
    if (b.eventAt && new Date(b.eventAt) > new Date()) throw invalid('eventAt cannot be in the future');
    return this.db.tx(ctx, async (tx) => {
      const c = await this.loadCase(tx, ctx, id);
      if (c.closed_at) throw conflict('Case is closed');
      const eid = await this.event(tx, ctx, id, b.eventType!, b.text!.trim(), { eventAt: b.eventAt });
      await this.audit.record(tx, { eventType: 'er.case.event_added', module: 'er', resourceType: 'er_case', resourceId: id, sensitivity: 'HREST', summary: { eventType: b.eventType, eventId: eid } });
      return { id: eid };
    });
  }

  /** Corrections never overwrite: an AMENDMENT row links to the original (ER-004). */
  async amendEvent(ctx: SecurityContext, id: string, eventId: string, b: { text?: string; reason?: string }) {
    if (!b.text?.trim() || !b.reason?.trim()) throw invalid('text and reason are required for an amendment');
    return this.db.tx(ctx, async (tx) => {
      await this.loadCase(tx, ctx, id);
      const orig = (await tx.query(`select id from er.case_event where id = $1 and case_id = $2`, [eventId, id])).rows[0];
      if (!orig) throw notFound('Chronology entry not found');
      const eid = await this.event(tx, ctx, id, 'AMENDMENT', b.text!.trim(), { amends: eventId, amendReason: b.reason!.trim() });
      await this.audit.record(tx, { eventType: 'er.case.event_amended', module: 'er', resourceType: 'er_case', resourceId: id, sensitivity: 'HREST', summary: { amends: eventId, eventId: eid } });
      return { id: eid };
    });
  }

  // ---------------------------------------------------------------- status (ER-005) & closure (ER-013)
  async changeStatus(ctx: SecurityContext, id: string, b: { to?: string; reason?: string }) {
    if (b.to === 'CLOSED') throw invalid('Use the close endpoint to close a case');
    const sm = await this.config.stateMachine('er.case');
    return this.db.tx(ctx, async (tx) => {
      const c = await this.loadCase(tx, ctx, id);
      const check = checkTransition(sm, c.status_code, b.to ?? '', (p) => can(ctx, p), b.reason);
      if (!check.ok) throw new ApiError(check.status, check.status === 409 ? 'Conflict' : check.status === 403 ? 'Forbidden' : 'Validation failed', check.reason);
      await tx.query(`update er.er_case set status_code = $2, updated_at = now(), row_version = row_version + 1 where id = $1`, [id, b.to]);
      await this.event(tx, ctx, id, 'STATUS_CHANGED', `Status ${c.status_code} → ${b.to}${b.reason ? `. Reason: ${b.reason.trim()}` : ''}`);
      await this.audit.record(tx, { eventType: 'er.case.status_changed', module: 'er', resourceType: 'er_case', resourceId: id, sensitivity: 'HREST', summary: { from: c.status_code, to: b.to } });
      return { id, status: b.to };
    });
  }

  async close(ctx: SecurityContext, id: string, b: { reason?: string; overrideReason?: string }) {
    const sm = await this.config.stateMachine('er.case');
    const requireNoOpen = await this.config.value('er', 'closure.require_no_open_mandatory_actions', true);
    return this.db.tx(ctx, async (tx) => {
      const c = await this.loadCase(tx, ctx, id);
      const check = checkTransition(sm, c.status_code, 'CLOSED', (p) => can(ctx, p), b.reason);
      if (!check.ok) throw new ApiError(check.status, check.status === 409 ? 'Conflict' : check.status === 403 ? 'Forbidden' : 'Validation failed', check.reason);
      const open = (await tx.query(
        `select reference, detail_restricted from actions.action where source_record_type = 'er_case' and source_record_id = $1
            and is_mandatory and status_code not in ('COMPLETED','CANCELLED')`, [id])).rows;
      if (requireNoOpen && open.length && !b.overrideReason?.trim()) {
        throw conflict('Case has open mandatory actions. Complete them or close with an override reason.', { openActions: open.map((o) => o.reference) });
      }
      await tx.query(`update er.er_case set status_code = 'CLOSED', closed_at = now(), closure_reason = $2, updated_at = now(), row_version = row_version + 1 where id = $1`, [id, b.reason!.trim()]);
      await this.event(tx, ctx, id, 'CLOSED', `Case closed. Reason: ${b.reason!.trim()}${open.length ? `. Override (${open.length} open mandatory actions): ${b.overrideReason!.trim()}` : ''}`);
      await this.audit.record(tx, { eventType: 'er.case.closed', module: 'er', resourceType: 'er_case', resourceId: id, sensitivity: 'HREST', summary: { overridden: open.length > 0, openMandatory: open.length } });
      return { id, status: 'CLOSED' };
    });
  }

  // ---------------------------------------------------------------- case team
  async addMember(ctx: SecurityContext, id: string, b: { userId?: string; role?: string }) {
    const roles = ['OFFICER', 'INVESTIGATOR', 'REVIEWER', 'OBSERVER'];
    if (!b.userId || !UUID.test(b.userId) || !roles.includes(b.role ?? '')) throw invalid(`userId and role (${roles.join('/')}) are required`);
    return this.db.tx(ctx, async (tx) => {
      const c = await this.loadCase(tx, ctx, id);
      if (c.closed_at) throw conflict('Case is closed');
      const eligible = (await tx.query(
        `select u.display_name from platform.app_user u where u.id = $1 and exists (
           select 1 from platform.user_scope s join platform.role_permission rp on rp.role_id = s.role_id
            where s.user_id = u.id and rp.permission_code = 'er.case.read' and s.valid_from <= now() and (s.valid_to is null or s.valid_to > now()))`, [b.userId])).rows[0];
      if (!eligible) throw invalid('User does not hold an ER role (er.case.read)');
      const already = (await tx.query(`select 1 from er.case_team_member where case_id=$1 and user_id=$2 and (valid_to is null or valid_to > now())`, [id, b.userId])).rowCount;
      if (already) throw conflict('User is already on the case team');
      await tx.query(`insert into er.case_team_member(case_id, user_id, case_role, granted_by) values ($1,$2,$3,$4)`, [id, b.userId, b.role, ctx.userId]);
      await this.event(tx, ctx, id, 'TEAM_CHANGED', `${eligible.display_name} added to case team as ${b.role}.`);
      await this.audit.record(tx, { eventType: 'er.case.team_member_added', module: 'er', resourceType: 'er_case', resourceId: id, sensitivity: 'HREST', summary: { userId: b.userId, role: b.role } });
      return { ok: true };
    });
  }

  async removeMember(ctx: SecurityContext, id: string, userId: string, reason?: string) {
    if (!reason?.trim()) throw invalid('reason is required');
    return this.db.tx(ctx, async (tx) => {
      await this.loadCase(tx, ctx, id);
      const { rows } = await tx.query(
        `update er.case_team_member m set valid_to = now() from platform.app_user u
          where m.case_id = $1 and m.user_id = $2 and u.id = m.user_id and m.case_role <> 'LEAD' and (m.valid_to is null or m.valid_to > now())
          returning u.display_name`, [id, userId]);
      if (!rows[0]) throw notFound('Active non-lead team member not found');
      await this.event(tx, ctx, id, 'TEAM_CHANGED', `${rows[0].display_name} removed from case team. Reason: ${reason.trim()}`);
      await this.audit.record(tx, { eventType: 'er.case.team_member_removed', module: 'er', resourceType: 'er_case', resourceId: id, sensitivity: 'HREST', summary: { userId } });
      return { ok: true };
    });
  }

  // ---------------------------------------------------------------- case tasks (ER-006)
  async tasks(ctx: SecurityContext, id: string) {
    return this.db.tx(ctx, async (tx) => {
      await this.loadCase(tx, ctx, id);
      const { rows } = await tx.query(
        `select a.id, a.reference, a.detail_restricted, a.status_code, a.priority_code, a.due_at, a.is_mandatory, a.completed_at, u.display_name as owner
           from actions.action a left join platform.app_user u on u.id = a.owner_user_id
          where a.source_record_type = 'er_case' and a.source_record_id = $1 order by a.created_at`, [id]);
      return rows.map((r) => ({ id: r.id, reference: r.reference, detail: r.detail_restricted, status: r.status_code, priority: r.priority_code,
        dueAt: r.due_at, mandatory: r.is_mandatory, completedAt: r.completed_at, owner: r.owner,
        overdue: !r.completed_at && r.status_code !== 'CANCELLED' && r.due_at && new Date(r.due_at) < new Date() }));
    });
  }

  async addTask(ctx: SecurityContext, id: string, b: { detail?: string; ownerUserId?: string; priority?: string; dueAt?: string; mandatory?: boolean }) {
    if (!b.detail?.trim()) throw invalid('detail is required');
    return this.db.tx(ctx, async (tx) => {
      const c = await this.loadCase(tx, ctx, id);
      if (c.closed_at) throw conflict('Case is closed');
      // Non-ER owners (e.g. a line manager) see only the safe title "ER follow-up task" – never case detail.
      const task = await this.actions.createInTx(tx, ctx, {
        sourceModule: 'er', sourceRecordType: 'er_case', sourceRecordId: id, titleSafe: 'ER follow-up task',
        detailRestricted: `${c.reference}: ${b.detail!.trim()}`, ownerUserId: b.ownerUserId || ctx.userId, priority: b.priority ?? 'MEDIUM',
        dueAt: b.dueAt || null, visibility: 'CASE_RESTRICTED', mandatory: !!b.mandatory,
      });
      await this.event(tx, ctx, id, 'TASK_CREATED', `Task ${task.reference} created: ${b.detail!.trim()}`, { relatedType: 'action', relatedId: task.id });
      return task;
    });
  }

  async accessLog(ctx: SecurityContext, id: string) {
    await this.db.tx(ctx, (tx) => this.loadCase(tx, ctx, id));
    const { rows } = await this.db.query(
      `select e.chain_seq, e.occurred_at, e.event_type, e.outcome, u.display_name as actor
         from audit.audit_event e left join platform.app_user u on u.id = e.actor_user_id
        where e.resource_type = 'er_case' and e.resource_id = $1 order by e.chain_seq desc limit 200`, [id]);
    return rows;
  }
}
