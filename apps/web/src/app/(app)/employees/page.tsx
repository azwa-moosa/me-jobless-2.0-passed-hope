'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Async, Callout, Empty, ErrorState, MaskedField, toast } from '@/components/ui';
import { DataTable } from '@/components/DataTable';
import { api, ApiError, fmtDate, labelise, useApi } from '@/lib/api';

const FIELD_LABEL: Record<string, string> = { salary: 'Salary', nid: 'NID', passport: 'Passport' };

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
          <div className="eyebrow">EmployeeService</div>
          <h1>Employees</h1>
          <p>Authorised lookup through EmployeeService. Results are limited to your organisational scope; salary, NID and passport are always masked.</p>
        </div>
        <span className="chip chip-warn">Provider: synthetic HRIS (DR-04)</span>
      </div>
      <div className="grid grid-main-side">
        <div className="card">
          <div className="card-body" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="search"><Icon name="search" /><input className="input" placeholder="Search by name, UID (e.g. S10001) or position" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Search employees" /></div>
          </div>
          <div className="card-body flush">
            {debounced.length < 2 ? <Empty title="Start typing to search" icon="search">Minimum two characters.</Empty> : (
              <Async state={results} rows={5}>
                {(r) => r.items.length === 0 ? <Empty title="No matches in your scope" icon="search">People outside your organisational scope are never returned.</Empty> : (
                  <DataTable caption="Employee search results" rows={r.items} rowKey={(e: any) => e.uid} onRowClick={(e: any) => setSel(e.uid)} selectedKey={sel} pageSize={10} sticky={false}
                    columns={[
                      { key: 'name', header: 'Employee', sort: (e: any) => e.fullName, render: (e: any) => <><div className="cell-main">{e.fullName}</div><div className="cell-sub mono">{e.uid}</div></> },
                      { key: 'pos', header: 'Position', sort: (e: any) => e.grade, render: (e: any) => <>{e.positionTitle}<div className="cell-sub">{e.grade}</div></> },
                      { key: 'org', header: 'Organisation', sort: (e: any) => e.orgUnit, render: (e: any) => e.orgUnit },
                      { key: 'status', header: 'Status', sort: (e: any) => e.status, render: (e: any) => <span className={`chip ${e.status === 'ACTIVE' ? 'chip-ok' : 'chip-muted'}`}>{labelise(e.status)}</span> },
                    ]} />
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
    try { const r = await api(`/employees/${uid}/reveal`, { method: 'POST', body: { field } }); setRevealed((x) => ({ ...x, [field]: r.value })); toast(`${FIELD_LABEL[field]} revealed – this access was audited`); }
    catch (e) { toast((e as ApiError).problem.detail ?? 'Not permitted', true); }
  }
  const Masked = ({ field, f }: { field: string; f: any }) => <MaskedField label={FIELD_LABEL[field]} value={revealed[field]} canReveal={!!f?.canReveal} onReveal={() => reveal(field)} />;
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
