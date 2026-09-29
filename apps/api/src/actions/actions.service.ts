import { Injectable } from '@nestjs/common';
import { availableTransitions, can, checkTransition, isTerminal, SecurityContext, StateMachineDef } from '@bml/policy';
import { DbService, Tx } from '../infra/db.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '../config/config.service';
import { ApiError, forbidden, invalid, notFound } from '../infra/errors';

export type ActionView = 'my' | 'team' | 'overdue' | 'due_soon' | 'blocked' | 'completed';
export const VIEWS: ActionView[] = ['my', 'team', 'overdue', 'due_soon', 'blocked', 'completed'];

export interface NewAction {
  sourceModule: string; sourceRecordType: string; sourceRecordId: string;
  titleSafe: string; detailRestricted?: string | null;
  ownerUserId?: string | null; ownerTeamId?: string | null;
  priority: string; dueAt?: string | null; visibility?: string; mandatory?: boolean;
}

const SELECT = `
  select a.*, ou.display_name as owner_name, t.name as team_name, cu.display_name as created_by_name,
         case when a.source_record_type = 'er_case' then er.can_see_case(a.source_record_id) else true end as source_visible,
         (a.owner_team_id = any($2::uuid[])) as is_team_member, (a.owner_user_id = $1::uuid) as is_owner
    from actions.action a
    left join platform.app_user ou on ou.id = a.owner_user_id
    left join platform.team t on t.id = a.owner_team_id
    left join platform.app_user cu on cu.id = a.created_by`;

/** ActionService – shared engine behind the HR Action Centre (ACT-001…007). */
@Injectable()
export class ActionsService {
  constructor(private db: DbService, private audit: AuditService, private config: ConfigService) {}

  private async teamIds(tx: Tx, userId: string): Promise<string[]> {
    const { rows } = await tx.query(
      `select team_id from platform.team_member where user_id = $1 and valid_from <= now() and (valid_to is null or valid_to > now())`, [userId]);
    return rows.map((r) => r.team_id);
  }

  /** Restricted detail + source link only when the SOURCE record's policy passes (ACT-001, ER-006). */
  private canSeeDetail(ctx: SecurityContext, row: any): boolean {
    if (row.visibility_class === 'STANDARD') return true;
    if (row.visibility_class === 'CASE_RESTRICTED') return row.source_visible && can(ctx, 'er.case.read');
    return false;
  }

  private canAct(ctx: SecurityContext, row: any): boolean {
    return row.owner_user_id === ctx.userId || row.is_team_member
      || (row.visibility_class === 'CASE_RESTRICTED' && this.canSeeDetail(ctx, row) && can(ctx, 'er.case.update'));
  }

  private present(ctx: SecurityContext, row: any, sm: StateMachineDef) {
    const detail = this.canSeeDetail(ctx, row);
    const terminal = isTerminal(sm, row.status_code);
    const canAct = this.canAct(ctx, row);
    return {
      id: row.id, reference: row.reference, title: row.title_safe,
      detail: detail ? row.detail_restricted : null, detailHidden: !detail && !!row.detail_restricted,
      sourceModule: row.source_module, sourceRecordType: row.source_record_type,
      sourceLink: detail && row.source_record_type === 'er_case' ? `/er/cases/${row.source_record_id}` : null,
      priority: row.priority_code, status: row.status_code,
      statusLabel: sm.states.find((s) => s.code === row.status_code)?.label ?? row.status_code,
      dueAt: row.due_at, overdue: !terminal && row.due_at && new Date(row.due_at) < new Date(),
      owner: row.owner_user_id ? { id: row.owner_user_id, name: row.owner_name } : null,
      team: row.owner_team_id ? { id: row.owner_team_id, name: row.team_name } : null,
      visibility: row.visibility_class, mandatory: row.is_mandatory,
      completedAt: row.completed_at, completionNotes: detail ? row.completion_notes : null,
      createdAt: row.created_at, createdBy: row.created_by_name,
      transitions: canAct ? availableTransitions(sm, row.status_code, (p) => can(ctx, p)).map((t) => ({ to: t.to, label: t.label, requiresReason: !!t.requiresReason })) : [],
      canReassign: can(ctx, 'actions.reassign') && !terminal,
    };
  }

  async list(ctx: SecurityContext, view: ActionView) {
    if (!VIEWS.includes(view)) throw invalid(`view must be one of ${VIEWS.join(', ')}`);
    if (view === 'team' && !can(ctx, 'actions.team.read')) throw forbidden('Team Work requires actions.team.read');
    const sm = await this.config.stateMachine('actions.action');
    const terminal = sm.states.filter((s) => s.terminal).map((s) => s.code);
    const dueSoonDays = Number(await this.config.value('actions', 'due_soon.business_days', 3));
    const dueSoonBy = await this.config.addBusinessDays(new Date(), dueSoonDays);

    return this.db.tx(ctx, async (tx) => {
      const teams = await this.teamIds(tx, ctx.userId);
      const base = `(a.owner_user_id = $1 or a.owner_team_id = any($2))`;
      const open = `a.status_code <> all($3)`;
      const filters: Record<ActionView, string> = {
        my: `a.owner_user_id = $1 and ${open}`,
        team: `a.owner_team_id = any($2) and ${open}`,
        overdue: `${base} and ${open} and a.due_at < now()`,
        due_soon: `${base} and ${open} and a.due_at >= now() and a.due_at < $4`,
        blocked: `${base} and a.status_code = 'BLOCKED'`,
        completed: `${base} and not (${open})`,
      };
      const order = view === 'completed' ? 'a.completed_at desc nulls last' : 'a.due_at asc nulls last, a.created_at';
      const { rows } = await tx.query(`${SELECT} where ${filters[view]} and $3::text[] is not null and $4::timestamptz is not null order by ${order} limit 200`, [ctx.userId, teams, terminal, dueSoonBy]);
      return { view, items: rows.map((r) => this.present(ctx, r, sm)), dueSoonBusinessDays: dueSoonDays };
    });
  }

  async summary(ctx: SecurityContext) {
    const sm = await this.config.stateMachine('actions.action');
    const terminal = sm.states.filter((s) => s.terminal).map((s) => s.code);
    const dueSoonBy = await this.config.addBusinessDays(new Date(), Number(await this.config.value('actions', 'due_soon.business_days', 3)));
    return this.db.tx(ctx, async (tx) => {
      const teams = await this.teamIds(tx, ctx.userId);
      const { rows } = await tx.query(
        `select
           count(*) filter (where a.owner_user_id = $1 and a.status_code <> all($3))::int as my,
           count(*) filter (where a.owner_team_id = any($2) and a.status_code <> all($3))::int as team,
           count(*) filter (where a.status_code <> all($3) and a.due_at < now())::int as overdue,
           count(*) filter (where a.status_code <> all($3) and a.due_at >= now() and a.due_at < $4)::int as due_soon,
           count(*) filter (where a.status_code = 'BLOCKED')::int as blocked,
           count(*) filter (where a.status_code = any($3))::int as completed
         from actions.action a where a.owner_user_id = $1 or a.owner_team_id = any($2)`, [ctx.userId, teams, terminal, dueSoonBy]);
      return { ...rows[0], team: can(ctx, 'actions.team.read') ? rows[0].team : null };
    });
  }

  private async load(tx: Tx, ctx: SecurityContext, id: string) {
    const teams = await this.teamIds(tx, ctx.userId);
    const { rows } = await tx.query(`${SELECT} where a.id = $3`, [ctx.userId, teams, id]);
    const row = rows[0];
    if (!row) throw notFound('Action not found');
    const visible = row.owner_user_id === ctx.userId || row.is_team_member
      || (row.visibility_class !== 'STANDARD' && this.canSeeDetail(ctx, row))
      || (row.visibility_class === 'STANDARD' && can(ctx, 'actions.reassign'));
    if (!visible) throw forbidden('You cannot view this action');
    return row;
  }

  async get(ctx: SecurityContext, id: string) {
    const sm = await this.config.stateMachine('actions.action');
    return this.db.tx(ctx, async (tx) => {
      const row = await this.load(tx, ctx, id);
      const events = (await tx.query(
        `select e.event_type, e.from_value, e.to_value, e.reason, e.created_at, u.display_name as actor
           from actions.action_event e left join platform.app_user u on u.id = e.actor where e.action_id = $1 order by e.created_at, e.id`, [id])).rows;
      const detailOk = this.canSeeDetail(ctx, row);
      return { ...this.present(ctx, row, sm), events: events.map((e) => ({ ...e, reason: detailOk ? e.reason : e.reason ? '[restricted]' : null })) };
    });
  }

  /** Create inside an existing transaction (used by modules, e.g. ER case tasks). */
  async createInTx(tx: Tx, ctx: SecurityContext, a: NewAction) {
    if (!a.ownerUserId && !a.ownerTeamId) throw invalid('An owner user or team is required');
    await this.config.assertLookup('action.priority', a.priority, 'priority');
    const reference = await this.config.nextReference(tx, 'ACTION');
    const sm = await this.config.stateMachine('actions.action');
    const { rows } = await tx.query(
      `insert into actions.action(reference, source_module, source_record_type, source_record_id, title_safe, detail_restricted,
         owner_user_id, owner_team_id, priority_code, status_code, due_at, visibility_class, is_mandatory, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id`,
      [reference, a.sourceModule, a.sourceRecordType, a.sourceRecordId, a.titleSafe, a.detailRestricted ?? null,
       a.ownerUserId ?? null, a.ownerTeamId ?? null, a.priority, sm.initial, a.dueAt ?? null, a.visibility ?? 'STANDARD', !!a.mandatory, ctx.userId]);
    await tx.query(`insert into actions.action_event(action_id, event_type, to_value, actor) values ($1,'CREATED',$2,$3)`, [rows[0].id, sm.initial, ctx.userId]);
    await this.audit.record(tx, {
      eventType: 'action.created', module: a.sourceModule === 'er' ? 'er' : 'actions', resourceType: 'action', resourceId: rows[0].id,
      sensitivity: a.visibility === 'CASE_RESTRICTED' ? 'HREST' : 'CONF', summary: { reference, source: a.sourceModule, owner: a.ownerUserId ?? a.ownerTeamId },
    });
    return { id: rows[0].id, reference };
  }

  async create(ctx: SecurityContext, body: { title?: string; detail?: string; ownerUserId?: string; priority?: string; dueAt?: string }) {
    if (!body.title?.trim()) throw invalid('title is required');
    if (body.ownerUserId && body.ownerUserId !== ctx.userId && !can(ctx, 'actions.reassign') && !can(ctx, 'actions.create')) throw forbidden();
    return this.db.tx(ctx, (tx) => this.createInTx(tx, ctx, {
      sourceModule: 'platform', sourceRecordType: 'adhoc', sourceRecordId: ctx.userId, titleSafe: body.title!.trim().slice(0, 200),
      detailRestricted: body.detail?.trim() || null, ownerUserId: body.ownerUserId || ctx.userId, priority: body.priority ?? 'MEDIUM',
      dueAt: body.dueAt || null,
    }));
  }

  async transition(ctx: SecurityContext, id: string, body: { to?: string; reason?: string; notes?: string; expectedVersion?: number }) {
    const sm = await this.config.stateMachine('actions.action');
    const requireNotes = await this.config.value('actions', 'completion.require_notes_when_mandatory', true);
    return this.db.tx(ctx, async (tx) => {
      const row = await this.load(tx, ctx, id);
      if (!this.canAct(ctx, row)) throw forbidden('Only the owner, the owning team or the case team can act on this action');
      const check = checkTransition(sm, row.status_code, body.to ?? '', (p) => can(ctx, p), body.reason);
      if (!check.ok) throw new ApiError(check.status, check.status === 409 ? 'Conflict' : check.status === 403 ? 'Forbidden' : 'Validation failed', check.reason);
      if (body.expectedVersion && body.expectedVersion !== row.row_version) throw new ApiError(409, 'Conflict', 'This action was changed by someone else. Reload and try again.');
      const completing = body.to === 'COMPLETED';
      if (completing && row.is_mandatory && requireNotes && !body.notes?.trim()) throw new ApiError(422, 'Validation failed', 'Completion notes are required for mandatory actions');
      const reopening = row.status_code === 'COMPLETED';
      await tx.query(
        `update actions.action set status_code = $2, updated_at = now(), row_version = row_version + 1,
            completed_at = case when $3 then now() when $4 then null else completed_at end,
            completed_by = case when $3 then $5::uuid when $4 then null else completed_by end,
            completion_notes = case when $3 then $6 else completion_notes end,
            reopen_count = reopen_count + case when $4 then 1 else 0 end
          where id = $1`, [id, body.to, completing, reopening, ctx.userId, body.notes?.trim() || null]);
      const evType = completing ? 'COMPLETED' : reopening ? 'REOPENED' : 'STATUS_CHANGED';
      await tx.query(`insert into actions.action_event(action_id, event_type, from_value, to_value, reason, actor) values ($1,$2,$3,$4,$5,$6)`,
        [id, evType, row.status_code, body.to, body.reason?.trim() || (completing ? body.notes?.trim() : null) || null, ctx.userId]);
      await this.audit.record(tx, {
        eventType: `action.${evType.toLowerCase()}`, module: row.source_module === 'er' ? 'er' : 'actions', resourceType: 'action', resourceId: id,
        sensitivity: row.visibility_class === 'CASE_RESTRICTED' ? 'HREST' : 'CONF', summary: { from: row.status_code, to: body.to, reasonGiven: !!body.reason },
      });
      return { id, status: body.to };
    });
  }

  async assign(ctx: SecurityContext, id: string, body: { ownerUserId?: string; ownerTeamId?: string; reason?: string }) {
    if (!body.reason?.trim()) throw invalid('A reason is required for reassignment');
    if (!body.ownerUserId && !body.ownerTeamId) throw invalid('ownerUserId or ownerTeamId is required');
    return this.db.tx(ctx, async (tx) => {
      const row = await this.load(tx, ctx, id);
      const from = row.owner_user_id ?? row.owner_team_id;
      await tx.query(`update actions.action set owner_user_id = $2, owner_team_id = $3, updated_at = now(), row_version = row_version + 1 where id = $1`,
        [id, body.ownerUserId ?? null, body.ownerTeamId ?? null]);
      await tx.query(`insert into actions.action_event(action_id, event_type, from_value, to_value, reason, actor) values ($1,'REASSIGNED',$2,$3,$4,$5)`,
        [id, from, body.ownerUserId ?? body.ownerTeamId, body.reason!.trim(), ctx.userId]);
      await this.audit.record(tx, {
        eventType: 'action.reassigned', module: row.source_module === 'er' ? 'er' : 'actions', resourceType: 'action', resourceId: id,
        sensitivity: 'CONF', summary: { from, to: body.ownerUserId ?? body.ownerTeamId },
      });
      return { id };
    });
  }
}
