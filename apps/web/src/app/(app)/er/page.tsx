'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession } from '@/components/AppShell';
import { HBarChart } from '@/components/Charts';
import { DataTable } from '@/components/DataTable';
import { Icon } from '@/components/Icon';
import { Async, ConfChip, ErrorState, PriorityChip, SampleTag, SensitivityBanner, StatusChip } from '@/components/ui';
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
          <div className="eyebrow">Employee Relations</div>
          <h1>ER dashboard</h1>
          <p>Restricted operational record for disciplinary matters, grievances and investigations. You only see cases you are authorised for.</p>
        </div>
        {can('er.case.create') && <Link href="/er/new" className="btn btn-primary"><Icon name="plus" size={16} /> New case</Link>}
      </div>
      <SensitivityBanner><strong>Highly restricted.</strong> Case content is limited to case teams and ER Managers; every case you open is recorded in the access log.</SensitivityBanner>

      <Async state={dash} rows={3}>
        {(d) => (
          <>
            <div className="grid grid-4 mb-3">
              <div className="card kpi accent-brand"><span className="kpi-label">Open cases</span><span className="kpi-value">{d.open}</span><span className="kpi-sub">Not closed</span></div>
              <div className={`card kpi ${d.overdueActions ? 'accent-bad' : 'accent-ok'}`}><span className="kpi-label">Overdue case actions</span><span className="kpi-value">{d.overdueActions}</span><span className="kpi-sub">Across your cases</span></div>
              <div className="card kpi"><span className="kpi-label">D&amp;G pending</span><span className="kpi-value muted">—</span><span className="kpi-sub">Phase 4 (DR-17)</span></div>
              <div className="card kpi"><span className="kpi-label">Letters pending</span><span className="kpi-value muted">—</span><span className="kpi-sub">Phase 4 (DR-18)</span></div>
            </div>
            <div className="grid grid-2 mb-3">
              <div className="card">
                <div className="card-head"><h3>Open case aging</h3><span className="hint">Days since opened</span></div>
                <div className="card-body">
                  <HBarChart title="Open cases by age band" labelWidth={110}
                    data={Object.entries(d.aging as Record<string, number>).map(([k, v]) => ({ label: `${k} days`, value: v }))} />
                </div>
              </div>
              <div className="card">
                <div className="card-head"><h3>Cases by status</h3><SampleTag>Sample workflow</SampleTag></div>
                <div className="card-body">
                  <HBarChart title="Cases by status" labelWidth={130} series={1} data={d.byStatus.map((s: any) => ({ label: s.label, value: s.count }))} />
                </div>
              </div>
            </div>
            <div className="small muted mb-2"><Icon name="lock" size={12} /> Scope: {d.scope}</div>
          </>
        )}
      </Async>

      <div className="card">
        <div className="card-head"><h3>Cases</h3></div>
        <Async state={cases} rows={4}>
          {(rows) => (
            <DataTable caption="ER cases" rows={rows} rowKey={(c) => c.id} onRowClick={(c) => router.push(`/er/cases/${c.id}`)}
              searchText={(c) => `${c.reference} ${c.subject?.name ?? ''} ${c.subject?.uid ?? ''} ${c.type} ${c.category} ${c.lead}`}
              searchPlaceholder="Search reference, subject, type…" defaultSort={{ key: 'opened', dir: 'desc' }}
              emptyTitle="No cases" emptyText="No cases match, or none are assigned to your case teams."
              toolbar={
                <select className="select" style={{ width: 190 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
                  <option value="">All statuses</option>
                  {(dash.data?.byStatus ?? []).map((s: any) => <option key={s.code} value={s.code}>{s.label}</option>)}
                </select>}
              columns={[
                { key: 'ref', header: 'Reference', sort: (c) => c.reference, render: (c) => <><Link href={`/er/cases/${c.id}`} className="cell-main mono" onClick={(e) => e.stopPropagation()}>{c.reference}</Link></> },
                { key: 'subject', header: 'Subject', sort: (c) => c.subject?.name, render: (c) => <><div className="cell-main">{c.subject?.name ?? '—'}</div><div className="cell-sub mono">{c.subject?.uid}</div></> },
                { key: 'type', header: 'Type / category', sort: (c) => c.type, render: (c) => <>{labelise(c.type)}<div className="cell-sub">{labelise(c.category)}</div></> },
                { key: 'status', header: 'Status', sort: (c) => c.status, render: (c) => <StatusChip code={c.status} label={c.statusLabel} /> },
                { key: 'priority', header: 'Priority', sort: (c) => ({ HIGH: 3, MEDIUM: 2, LOW: 1 } as any)[c.priority] ?? 0, render: (c) => <PriorityChip code={c.priority} /> },
                { key: 'conf', header: 'Confidentiality', render: (c) => <ConfChip code={c.confidentiality} /> },
                { key: 'lead', header: 'Lead', sort: (c) => c.lead, render: (c) => c.lead },
                { key: 'opened', header: 'Opened', sort: (c) => c.openedAt, render: (c) => <span className="nowrap">{fmtDate(c.openedAt)}</span> },
                { key: 'age', header: 'Age', align: 'right', sort: (c) => c.ageDays, render: (c) => `${c.ageDays}d` },
                { key: 'tasks', header: 'Tasks', align: 'right', sort: (c) => c.overdueTasks * 100 + c.openTasks,
                  render: (c) => <span className="nowrap">{c.openTasks} open{c.overdueTasks > 0 && <div className="cell-sub text-danger">{c.overdueTasks} overdue</div>}</span> },
              ]} />
          )}
        </Async>
      </div>
    </>
  );
}
