/** Generates docs/data-dictionary.md from the live schema so it cannot drift from code. */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { config } from 'dotenv';
config({ path: resolve(__dirname, '../../../.env') });

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL_MIGRATOR });
  await db.connect();
  const { rows } = await db.query(`
    select c.table_schema, c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable, c.column_default,
           (select relrowsecurity from pg_class k join pg_namespace n on n.oid = k.relnamespace where n.nspname = c.table_schema and k.relname = c.table_name) as rls
      from information_schema.columns c
     where c.table_schema in ('platform','org','config','audit','ai','actions','er','synthetic_hris')
     order by c.table_schema, c.table_name, c.ordinal_position`);
  const out = ['# Data dictionary (generated)', '', `Generated ${new Date().toISOString().slice(0, 10)} by \`pnpm db:dictionary\`. Do not edit by hand.`, ''];
  let cur = '';
  for (const r of rows) {
    const t = `${r.table_schema}.${r.table_name}`;
    if (t !== cur) {
      cur = t;
      out.push('', `## ${t}${r.rls ? ' · RLS' : ''}`, '', '| Column | Type | Null | Default |', '|---|---|---|---|');
    }
    const type = r.data_type === 'USER-DEFINED' || r.data_type === 'ARRAY' ? r.udt_name : r.data_type;
    out.push(`| ${r.column_name} | ${type} | ${r.is_nullable === 'YES' ? 'yes' : ''} | ${(r.column_default ?? '').replace(/\|/g, '/').slice(0, 40)} |`);
  }
  writeFileSync(resolve(__dirname, '../../../docs/data-dictionary.md'), out.join('\n') + '\n');
  console.log(`data dictionary: ${new Set(rows.map((r) => r.table_schema + r.table_name)).size} tables`);
  await db.end();
})();
