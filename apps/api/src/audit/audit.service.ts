import { Injectable } from '@nestjs/common';
import { SecurityContext } from '@bml/policy';
import { DbService, Tx } from '../infra/db.service';
import { currentRequest } from '../infra/request-context';

export type Sensitivity = 'INT' | 'CONF' | 'REST' | 'HREST';

export interface AuditInput {
  eventType: string;
  module: string;
  resourceType: string;
  resourceId?: string | null;
  outcome?: 'SUCCESS' | 'DENIED' | 'FAILED';
  sensitivity: Sensitivity;
  /** Field NAMES and non-restricted values only. Never narrative text or restricted values. */
  summary?: Record<string, unknown>;
  actorUserId?: string | null;
  actorType?: 'USER' | 'SYSTEM' | 'JOB';
}

/**
 * AuditService (AUD-001). Events are written to the transactional outbox in the SAME transaction
 * as the business change (rollback ⇒ no audit), then relayed by the worker into the append-only,
 * hash-chained audit.audit_event table.
 */
@Injectable()
export class AuditService {
  constructor(private readonly db: DbService) {}

  private payload(e: AuditInput) {
    const rq = currentRequest();
    return {
      occurredAt: new Date().toISOString(),
      actorUserId: e.actorUserId !== undefined ? e.actorUserId : rq?.ctx?.userId ?? null,
      actorType: e.actorType ?? (rq?.ctx ? 'USER' : 'SYSTEM'),
      eventType: e.eventType, module: e.module, resourceType: e.resourceType, resourceId: e.resourceId ?? null,
      outcome: e.outcome ?? 'SUCCESS', sensitivity: e.sensitivity, summary: e.summary ?? null,
      correlationId: rq?.correlationId ?? '00000000-0000-0000-0000-000000000000', clientIpHash: rq?.ipHash ?? null,
    };
  }

  async record(tx: Tx, e: AuditInput) {
    await tx.query(`insert into platform.outbox(topic, payload) values ('audit', $1)`, [JSON.stringify(this.payload(e))]);
  }

  async recordStandalone(e: AuditInput) {
    await this.db.query(`insert into platform.outbox(topic, payload) values ('audit', $1)`, [JSON.stringify(this.payload(e))]);
  }

  async list(ctx: SecurityContext, q: { module?: string; resourceType?: string; resourceId?: string; limit?: number; beforeSeq?: number }) {
    const where: string[] = [];
    const params: unknown[] = [];
    if (ctx.auditModules !== '*') {
      params.push([...ctx.auditModules]);
      where.push(`e.module = any($${params.length})`);
    }
    if (q.module) { params.push(q.module); where.push(`e.module = $${params.length}`); }
    if (q.resourceType) { params.push(q.resourceType); where.push(`e.resource_type = $${params.length}`); }
    if (q.resourceId) { params.push(q.resourceId); where.push(`e.resource_id = $${params.length}`); }
    if (q.beforeSeq) { params.push(q.beforeSeq); where.push(`e.chain_seq < $${params.length}`); }
    params.push(Math.min(q.limit ?? 50, 200));
    const { rows } = await this.db.query(
      `select e.chain_seq, e.occurred_at, e.recorded_at, e.actor_type, u.display_name as actor, e.event_type, e.module,
              e.resource_type, e.resource_id, e.outcome, e.sensitivity, e.summary, e.correlation_id,
              encode(e.row_hash,'hex') as row_hash
         from audit.audit_event e left join platform.app_user u on u.id = e.actor_user_id
        ${where.length ? 'where ' + where.join(' and ') : ''}
        order by e.chain_seq desc limit $${params.length}`, params);
    const pending = (await this.db.query(`select count(*)::int as n from platform.outbox where processed_at is null`)).rows[0].n;
    return { items: rows, pendingRelay: pending, scope: ctx.auditModules === '*' ? 'all' : [...ctx.auditModules] };
  }

  async verify() {
    const { rows } = await this.db.query(`select checked::int, first_broken::int from audit.verify_chain()`);
    return { eventsChecked: rows[0].checked, intact: rows[0].first_broken === null, firstBrokenSeq: rows[0].first_broken };
  }
}
