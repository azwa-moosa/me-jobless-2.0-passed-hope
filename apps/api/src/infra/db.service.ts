import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { can, SecurityContext } from '@bml/policy';
import { ENV, Env } from './env';

export type Tx = PoolClient;

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool: Pool;
  constructor(@Inject(ENV) env: Env) {
    // Runtime role: DML only, subject to RLS on ER/Voice schemas.
    this.pool = new Pool({ connectionString: env.DATABASE_URL, max: 10 });
  }

  /**
   * Runs `fn` in a transaction with the caller's identity bound for Row-Level Security.
   * Business writes and their audit outbox rows commit or roll back together.
   */
  async tx<T>(ctx: SecurityContext | null, fn: (c: Tx) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query('begin');
      if (ctx) {
        await c.query(`select set_config('app.user_id', $1, true), set_config('app.er_override', $2, true)`,
          [ctx.userId, can(ctx, 'er.case.read_all') ? 'on' : 'off']);
      }
      const out = await fn(c);
      await c.query('commit');
      return out;
    } catch (e) {
      await c.query('rollback').catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  query<T = any>(sql: string, params: unknown[] = []) {
    return this.pool.query<T & Record<string, any>>(sql, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
