'use client';
import { Async, Callout, SampleTag } from '@/components/ui';
import { labelise, useApi } from '@/lib/api';

const DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ConfigPage() {
  const lookups = useApi<any>('/config/lookups');
  const sms = useApi<any[]>('/config/state-machines');
  const cal = useApi<any>('/config/calendar');
  const roles = useApi<any[]>('/config/roles');
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Configuration</h1>
          <p>Business rules live here as data, not code. Everything marked “sample” is a placeholder until the owning BML decision is made.</p>
        </div>
      </div>
      <div className="mb-3"><Callout tone="warn">Read-only in Sprint 1. Maker-checker editing of configuration arrives in Sprint 2 (CFG-001).</Callout></div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><h3>Business calendar</h3><SampleTag>DR-35</SampleTag></div>
          <Async state={cal} rows={2}>{(c) => (
            <div className="card-body">
              <div className="row">{[1, 2, 3, 4, 5, 6, 7].map((d) => <span key={d} className={`chip plain ${c.workingDays.includes(d) ? 'chip-navy' : 'chip-muted'}`}>{DAYS[d]}</span>)}</div>
              <p className="small muted mt-2">{c.name} · {c.timezone} · {c.holidays.length} holidays loaded. Working week is configuration – SLA and “due soon” maths read it.</p>
            </div>)}</Async>
        </div>
        <div className="card">
          <div className="card-head"><h3>Workflows</h3><SampleTag>DR-15 / DR-36</SampleTag></div>
          <Async state={sms} rows={3}>{(rows) => (
            <div className="card-body stack">
              {rows.map((s) => (
                <div key={s.code}>
                  <div className="strong small">{s.code} <span className="muted">v{s.version}</span></div>
                  <div className="row mt-1">{s.definition.states.map((st: any) => <span key={st.code} className="chip plain chip-muted">{st.label}</span>)}</div>
                  <div className="small muted mt-1">{s.definition.transitions.length} transitions, each gated by a permission.</div>
                </div>))}
            </div>)}</Async>
        </div>
      </div>
      <div className="card mt-3">
        <div className="card-head"><h3>Lookups</h3></div>
        <Async state={lookups} rows={4}>{(sets) => (
          <div className="card-body flush"><table className="table"><thead><tr><th>Set</th><th>Values</th><th>Status</th></tr></thead><tbody>
            {Object.entries(sets).map(([k, s]: any) => <tr key={k}><td><div className="mono small strong">{k}</div><div className="cell-sub">{s.description}</div></td><td>{s.values.map((v: any) => v.label).join(' · ')}</td><td>{s.isSample && <SampleTag>Sample</SampleTag>}</td></tr>)}
          </tbody></table></div>)}</Async>
      </div>
      <div className="card mt-3">
        <div className="card-head"><h3>Role catalogue (draft access matrix)</h3><SampleTag>DR-06 / DR-07</SampleTag></div>
        <Async state={roles} rows={4}>{(rs) => (
          <div className="card-body flush"><div className="table-wrap"><table className="table"><thead><tr><th>Ref</th><th>Role</th><th>Default scope</th><th>Status</th><th>Permissions</th></tr></thead><tbody>
            {rs.map((r) => <tr key={r.code}><td className="mono">{r.ref}</td><td className="strong">{r.name}</td><td>{labelise(r.defaultScope)}</td><td className="small">{r.status}</td><td className="small muted">{r.permissions.length} · {r.permissions.filter((p: string) => !['me.read', 'actions.use', 'voice.submit'].includes(p)).slice(0, 5).join(', ')}{r.permissions.length > 8 ? '…' : ''}</td></tr>)}
          </tbody></table></div></div>)}</Async>
      </div>
    </>
  );
}
