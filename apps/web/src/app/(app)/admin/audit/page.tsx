'use client';
import { useState } from 'react';
import { useSession } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { Async, Callout, Empty, toast } from '@/components/ui';
import { api, fmtDateTime, useApi } from '@/lib/api';

const SENS: Record<string, string> = { HREST: 'chip-bad', REST: 'chip-warn', CONF: 'chip-navy', INT: 'chip-muted' };

export default function AuditLog() {
  const { can } = useSession();
  const [module, setModule] = useState('');
  const log = useApi<any>(`/audit/events?limit=100${module ? `&module=${module}` : ''}`);
  const [verify, setVerify] = useState<any>(null);
  async function runVerify() {
    try { const r = await api('/audit/verify'); setVerify(r); toast(r.intact ? 'Audit chain verified intact' : 'Audit chain BROKEN', !r.intact); }
    catch { toast('Verification failed', true); }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <p>Append-only and hash-chained. The application role cannot update or delete events; any tampering breaks the chain and is detected by verification.</p>
        </div>
        {can('audit.verify') && <button className="btn btn-primary" onClick={runVerify}><Icon name="audit" size={16} /> Verify chain</button>}
      </div>
      {verify && <div className="mb-3"><Callout tone={verify.intact ? 'ok' : 'bad'}>{verify.intact ? `Chain intact – ${verify.eventsChecked} events verified.` : `Chain broken at sequence #${verify.firstBrokenSeq}. Escalate to Information Security.`}</Callout></div>}
      <div className="card">
        <Async state={log} rows={8}>
          {(d) => (
            <>
              <div className="card-head">
                <div className="hint">Visible to you: {d.scope === 'all' ? 'all modules' : d.scope.join(', ')}{d.pendingRelay > 0 && ` · ${d.pendingRelay} event(s) awaiting relay`}</div>
                {d.scope === 'all' || d.scope.length > 1 ? (
                  <select className="select" style={{ width: 180, height: 32 }} value={module} onChange={(e) => setModule(e.target.value)} aria-label="Filter by module">
                    <option value="">All modules</option>{['auth', 'platform', 'er', 'actions', 'employee', 'admin', 'audit'].map((m) => <option key={m}>{m}</option>)}
                  </select>) : null}
              </div>
              <div className="card-body flush">
                {d.items.length === 0 ? <Empty title="No events in your scope" /> : (
                  <div className="table-wrap"><table className="table">
                    <thead><tr><th>#</th><th>When</th><th>Actor</th><th>Event</th><th>Resource</th><th>Outcome</th><th>Class</th><th>Hash</th></tr></thead>
                    <tbody>{d.items.map((e: any) => (
                      <tr key={e.chain_seq}>
                        <td className="mono small">{e.chain_seq}</td>
                        <td className="nowrap small">{fmtDateTime(e.occurred_at)}</td>
                        <td>{e.actor ?? <span className="muted">{e.actor_type}</span>}</td>
                        <td><span className="mono small strong">{e.event_type}</span>{e.summary && <div className="cell-sub mono" style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={JSON.stringify(e.summary)}>{JSON.stringify(e.summary)}</div>}</td>
                        <td className="small">{e.resource_type}<div className="cell-sub mono">{e.resource_id?.slice(0, 18)}</div></td>
                        <td><span className={`chip ${e.outcome === 'SUCCESS' ? 'chip-ok' : 'chip-bad'}`}>{e.outcome}</span></td>
                        <td><span className={`chip plain ${SENS[e.sensitivity]}`}>{e.sensitivity}</span></td>
                        <td className="hash" title={e.row_hash}>{e.row_hash.slice(0, 10)}…</td>
                      </tr>))}</tbody>
                  </table></div>
                )}
              </div>
            </>
          )}
        </Async>
      </div>
    </>
  );
}
