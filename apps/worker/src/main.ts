/**
 * Worker: transactional-outbox relay (AUD-001).
 * Moves audit events from platform.outbox into the append-only, hash-chained audit.audit_event table
 * in commit order. `FOR UPDATE SKIP LOCKED` makes it safe to run more than one worker.
 * Later jobs (parse, validate, calculate, remind, escalate, notify, render, export) plug in here (pg-boss, Phase 2+).
 */
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Pool } from 'pg';
import pino from 'pino';

config({ path: resolve(__dirname, '../../../.env') });
const log = pino({ base: { service: 'bml-people-er-worker' }, timestamp: pino.stdTimeFunctions.isoTime });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const INTERVAL_MS = Number(process.env.OUTBOX_POLL_MS ?? 500);
let stopping = false;

export async function relayOnce(): Promise<number> {
  const c = await pool.connect();
  try {
    await c.query('begin');
    const { rows } = await c.query(
      `select id, topic, payload from platform.outbox where processed_at is null order by id limit 200 for update skip locked`);
    for (const r of rows) {
      if (r.topic === 'audit') {
        const p = r.payload;
        await c.query(
          `insert into audit.audit_event(occurred_at, actor_user_id, actor_type, event_type, module, resource_type, resource_id,
             outcome, sensitivity, summary, correlation_id, client_ip_hash)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [p.occurredAt, p.actorUserId, p.actorType, p.eventType, p.module, p.resourceType, p.resourceId, p.outcome, p.sensitivity,
           p.summary ? JSON.stringify(p.summary) : null, p.correlationId, p.clientIpHash]);
      }
      await c.query(`update platform.outbox set processed_at = now(), attempts = attempts + 1 where id = $1`, [r.id]);
    }
    await c.query('commit');
    return rows.length;
  } catch (e) {
    await c.query('rollback').catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}

async function loop() {
  log.info({ intervalMs: INTERVAL_MS }, 'worker started (outbox → audit relay)');
  while (!stopping) {
    try {
      const n = await relayOnce();
      if (n) log.info({ relayed: n }, 'audit events relayed');
    } catch (e) {
      log.error({ err: (e as Error).message }, 'relay failed – will retry');
    }
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }
  await pool.end();
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => { stopping = true; });
if (require.main === module) loop();
