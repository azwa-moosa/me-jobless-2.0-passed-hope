'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { Async, ConfChip, Empty, ErrorState, PriorityChip, SampleTag, StatusChip } from '@/components/ui';
import { fmtDate, labelise, useApi } from '@/lib/api';

export default function ErDashboard() {
  const { can } = useSession();
  const router = useRouter();
  const dash = useApi<any>('/er/dashboard');
  const [status, setStatus] = useState<string>('');
  const cases = useApi<any[]>(can('er.case.read') ? `/er/cases${status ? `?status=${status}` : ''}` : null);

  if (dash.error?.status === 403) return <div className="card"><ErrorState error={dash.error} /></div>;
  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumbs">ER Case Management</div>
          <h1>ER dashboard</h1>
          <p>Restricted operational record for disciplinary matters, grievances and investigations. You only see cases you are authorised for.</p>
        </div>
        {can('er.case.create') && <Link href="/er/new" className="btn btn-primary"><Icon name="plus" size={16} /> New case</Link>}
      </div>

      <Async state={dash} rows={3}>
        {(d) => {
          const max = Math.max(1, ...Object.values(d.aging as Record<string, number>));
          const maxS = Math.max(1, ...d.byStatus.map((s: any) => s.count));
          return (
            <>
              <div className="grid grid-4 mb-3">
                <div className="card kpi"><span className="kpi-label">Open cases</span><span className="kpi-value">{d.open}</span><span className="kpi-sub">Not closed</span></div>
                <div className={`card kpi ${d.overdueActions ? 'accent-bad' : 'accent-ok'}`}><span className="kpi-label">Overdue case actions</span><span className="kpi-value">{d.overdueActions}</span><span className="kpi-sub">Across your cases</span></div>
                <div className="card kpi"><span className="kpi-label">D&amp;G pending</span><span className="kpi-value muted">—</span><span className="kpi-sub">Phase 4 (DR-17)</span></div>
                <div className="card kpi"><span className="kpi-label">Letters pending</span><span className="kpi-value muted">—</span><span className="kpi-sub">Phase 4 (DR-18)</span></div>
              </div>
              <div className="grid grid-2 mb-3">
                <div className="card">
                  <div className="card-head"><h3>Open case aging</h3><span className="hint">Days since opened</span></div>
                  <div className="card-body bars">
                    {Object.entries(d.aging as Record<string, number>).map(([k, v], i) => (
                      <div className="bar-row" key={k}><span>{k} days</span><div className="bar-track"><div className={`bar-fill ${i >= 3 ? 'bad' : i === 2 ? 'warn' : ''}`} style={{ width: `${(v / max) * 100}%` }} /></div><span className="n">{v}</span></div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-head"><h3>Cases by status</h3><SampleTag>Sample workflow</SampleTag></div>
                  <div className="card-body bars">
                    {d.byStatus.map((s: any) => (
                      <div className="bar-row" key={s.code}><span>{s.label}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${(s.count / maxS) * 100}%` }} /></div><span className="n">{s.count}</span></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="small muted mb-2"><Icon name="lock" size={12} /> Scope: {d.scope}</div>
            </>
          );
        }}
      </Async>

      <div className="card">
        <div className="card-head">
          <h3>Cases</h3>
          <select className="select" style={{ width: 200, height: 32 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {(dash.data?.byStatus ?? []).map((s: any) => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
        </div>
        <div className="card-body flush">
          <Async state={cases} rows={4}>
            {(rows) => rows.length === 0 ? <Empty title="No cases">No cases match, or none are assigned to your case teams.</Empty> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Reference</th><th>Subject</th><th>Type / category</th><th>Status</th><th>Priority</th><th>Confidentiality</th><th>Lead</th><th>Age</th><th>Tasks</th></tr></thead>
                  <tbody>
                    {rows.map((c) => (
                      <tr key={c.id} className="clickable" onClick={() => router.push(`/er/cases/${c.id}`)}>
                        <td><Link href={`/er/cases/${c.id}`} className="cell-main mono" onClick={(e) => e.stopPropagation()}>{c.reference}</Link><div className="cell-sub">Opened {fmtDate(c.openedAt)}</div></td>
                        <td><div className="cell-main">{c.subject?.name ?? '—'}</div><div className="cell-sub mono">{c.subject?.uid}</div></td>
                        <td>{labelise(c.type)}<div className="cell-sub">{labelise(c.category)}</div></td>
                        <td><StatusChip code={c.status} label={c.statusLabel} /></td>
                        <td><PriorityChip code={c.priority} /></td>
                        <td><ConfChip code={c.confidentiality} /></td>
                        <td>{c.lead}</td>
                        <td className="nowrap">{c.ageDays}d</td>
                        <td className="nowrap">{c.openTasks} open{c.overdueTasks > 0 && <div className="cell-sub" style={{ color: 'var(--bad-700)' }}>{c.overdueTasks} overdue</div>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Async>
        </div>
      </div>
    </>
  );
}
