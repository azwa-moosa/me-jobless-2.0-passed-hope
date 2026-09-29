'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Async, Callout, Empty, ErrorState, toast } from '@/components/ui';
import { api, ApiError, fmtDate, labelise, useApi } from '@/lib/api';

export default function Employees() {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const results = useApi<any>(debounced.length >= 2 ? `/employees?q=${encodeURIComponent(debounced)}` : null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Employee lookup</h1>
          <p>Authorised lookup through EmployeeService. Results are limited to your organisational scope; salary, NID and passport are always masked.</p>
        </div>
        <span className="chip chip-warn">Provider: synthetic HRIS (DR-04)</span>
      </div>
      <div className="grid grid-main-side">
        <div className="card">
          <div className="card-body" style={{ borderBottom: '1px solid var(--line)' }}>
            <div className="search"><Icon name="search" /><input className="input" placeholder="Search by name, UID (e.g. S10001) or position" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Search employees" /></div>
          </div>
          <div className="card-body flush">
            {debounced.length < 2 ? <Empty title="Start typing to search" icon="search">Minimum two characters.</Empty> : (
              <Async state={results} rows={5}>
                {(r) => r.items.length === 0 ? <Empty title="No matches in your scope" icon="search">People outside your organisational scope are never returned.</Empty> : (
                  <table className="table"><thead><tr><th>Employee</th><th>Position</th><th>Organisation</th><th>Status</th></tr></thead><tbody>
                    {r.items.map((e: any) => (
                      <tr key={e.uid} className="clickable" onClick={() => setSel(e.uid)} style={sel === e.uid ? { background: 'var(--navy-50)' } : undefined}>
                        <td><div className="cell-main">{e.fullName}</div><div className="cell-sub mono">{e.uid}</div></td>
                        <td>{e.positionTitle}<div className="cell-sub">{e.grade}</div></td>
                        <td>{e.orgUnit}</td>
                        <td><span className={`chip ${e.status === 'ACTIVE' ? 'chip-ok' : 'chip-muted'}`}>{labelise(e.status)}</span></td>
                      </tr>
                    ))}
                  </tbody></table>
                )}
              </Async>
            )}
          </div>
        </div>
        <div>{sel ? <Profile uid={sel} /> : <div className="card"><Empty title="Select an employee" icon="employees">The profile panel shows permitted fields only.</Empty></div>}</div>
      </div>
    </>
  );
}

function Profile({ uid }: { uid: string }) {
  const p = useApi<any>(`/employees/${uid}`);
  const pos = useApi<any>(`/employees/${uid}/positions`);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  useEffect(() => setRevealed({}), [uid]);
  async function reveal(field: string) {
    try { const r = await api(`/employees/${uid}/reveal`, { method: 'POST', body: { field } }); setRevealed((x) => ({ ...x, [field]: r.value })); toast(`${labelise(field)} revealed – this access was audited`); }
    catch (e) { toast((e as ApiError).problem.detail ?? 'Not permitted', true); }
  }
  const Masked = ({ field, f }: { field: string; f: any }) => revealed[field] ? <span className="revealed">{revealed[field]}</span> : (
    <span className="masked"><span className="dots">••••••</span>{f?.canReveal ? <button className="btn btn-sm btn-ghost" onClick={() => reveal(field)}><Icon name="eye" size={14} /> Reveal</button> : <span className="lock"><Icon name="lock" /> restricted</span>}</span>
  );
  return (
    <div className="stack">
      <div className="card">
        <Async state={p} rows={6}>
          {(e) => (
            <>
              <div className="card-head"><div><h3>{e.fullName}</h3><div className="hint mono">{e.uid}</div></div><span className={`chip ${e.status === 'ACTIVE' ? 'chip-ok' : 'chip-muted'}`}>{labelise(e.status)}</span></div>
              <div className="card-body">
                <dl className="dl" style={{ gridTemplateColumns: '110px 1fr' }}>
                  <dt>Position</dt><dd>{e.positionTitle} ({e.grade})</dd>
                  <dt>Organisation</dt><dd>{e.orgPath?.slice(1).join(' › ')}</dd>
                  <dt>Manager</dt><dd>{e.manager ? `${e.manager.fullName} (${e.manager.uid})` : '—'}</dd>
                  <dt>Joined</dt><dd>{fmtDate(e.joinDate)}</dd>
                  {e.leaveDate && <><dt>Left</dt><dd>{fmtDate(e.leaveDate)}</dd></>}
                  <dt>Email</dt><dd className="small">{e.email}</dd>
                  <dt>Salary</dt><dd><Masked field="salary" f={e.salary} /></dd>
                  <dt>NID</dt><dd><Masked field="nid" f={e.nid} /></dd>
                  <dt>Passport</dt><dd><Masked field="passport" f={e.passport} /></dd>
                </dl>
              </div>
              <div className="card-foot">Restricted fields are masked by the API for every role. Reveal is a separate, audited call.</div>
            </>
          )}
        </Async>
      </div>
      <div className="card">
        <div className="card-head"><h3>Position history</h3></div>
        <div className="card-body">
          {pos.error ? (pos.error.status === 403 ? <Callout tone="info">Position history is not included in your role.</Callout> : <ErrorState error={pos.error} />) : (
            <Async state={pos} rows={3}>
              {(h) => (
                <ul className="timeline">
                  {h.items.slice().reverse().map((x: any, i: number) => (
                    <li key={i} className="tl-item" style={{ paddingBottom: 14 }}><span className="tl-dot" />
                      <div className="tl-head"><span className="tl-type">{labelise(x.changeType)}</span><span>{fmtDate(x.effectiveFrom)} – {x.effectiveTo ? fmtDate(x.effectiveTo) : 'present'}</span></div>
                      <div className="small"><strong>{x.positionTitle}</strong> · {x.grade} · {x.orgUnitName}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Async>
          )}
        </div>
      </div>
    </div>
  );
}
