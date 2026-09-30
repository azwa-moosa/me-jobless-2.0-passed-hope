'use client';
import { useSession } from '@/components/AppShell';
import { HBarChart, LineChart } from '@/components/Charts';
import { DataTable } from '@/components/DataTable';
import { Async, Callout, PermissionDenied, SampleTag } from '@/components/ui';
import { useApi } from '@/lib/api';

export default function Engagement() {
  const { can } = useSession();
  const allowed = can('engagement.read') || can('engagement.admin');
  const d = useApi<any>(allowed ? '/engagement/preview' : null);
  if (!allowed) return <div className="card"><PermissionDenied detail="Engagement results are not part of your role." /></div>;
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Engagement</div>
          <h1>Engagement home</h1>
          <p>Layout preview for cycle status, participation and results. Survey cycles, imports and action plans arrive in Phase 5.</p>
        </div>
        <SampleTag>Sample values · DR-21 / DR-24</SampleTag>
      </div>
      <Async state={d} rows={8}>
        {(x) => (
          <>
            <div className="mb-3"><Callout tone="warn"><strong>{x.label}.</strong> Scope: {x.scope}. Results below the minimum group size ({x.minN}, sample – DR-22) are suppressed at every level.</Callout></div>
            <div className="grid grid-4 mb-3">
              <div className="card kpi accent-brand"><span className="kpi-label">Engagement (favourable)</span><span className="kpi-value">{x.kpis.favourablePct}%</span><span className="kpi-sub">Sample, latest quarter</span></div>
              <div className="card kpi"><span className="kpi-label">Participation</span><span className="kpi-value">{x.kpis.participationPct}%</span><span className="kpi-sub">{x.kpis.responded.toLocaleString()} of {x.kpis.eligible.toLocaleString()} eligible</span></div>
              <div className="card kpi"><span className="kpi-label">Action plans overdue</span><span className="kpi-value muted">—</span><span className="kpi-sub">Phase 5 (DR-25)</span></div>
              <div className="card kpi"><span className="kpi-label">Fun with Teams utilisation</span><span className="kpi-value muted">—</span><span className="kpi-sub">Phase 5 (DR-26)</span></div>
            </div>
            <div className="grid grid-2 mb-3">
              <div className="card">
                <div className="card-head"><h3>Quarterly trend</h3><span className="hint">Bank-level, %</span></div>
                <div className="card-body">
                  <LineChart title="Engagement and participation by quarter" periods={x.trend.periods} unit="%" min={50} max={100}
                    series={[{ name: 'Engagement', slot: 1, values: x.trend.engagement }, { name: 'Participation', slot: 2, values: x.trend.participation }]} />
                </div>
              </div>
              <div className="card">
                <div className="card-head"><h3>Favourable score by division</h3><span className="hint">Latest quarter</span></div>
                <div className="card-body"><HBarChart title="Favourable score by division" unit="%" max={100} series={3} data={x.divisions.map((v: any) => ({ label: v.label, value: v.favourablePct }))} /></div>
              </div>
            </div>
            <div className="card">
              <div className="card-head"><h3>Participation by division</h3><span className="hint">Counts only – never names</span></div>
              <DataTable caption="Participation by division" rows={x.divisions} rowKey={(v: any) => v.label} pageSize={12} defaultSort={{ key: 'pct', dir: 'asc' }}
                searchText={(v: any) => v.label} searchPlaceholder="Search division…"
                columns={[
                  { key: 'div', header: 'Division', sort: (v: any) => v.label, render: (v: any) => <span className="cell-main">{v.label}</span> },
                  { key: 'elig', header: 'Eligible', align: 'right', sort: (v: any) => v.eligible, render: (v: any) => v.eligible },
                  { key: 'resp', header: 'Responded', align: 'right', sort: (v: any) => v.responded, render: (v: any) => v.responded },
                  { key: 'pct', header: 'Participation', align: 'right', sort: (v: any) => v.participationPct, render: (v: any) => <span className={v.participationPct < 70 ? 'strong text-danger' : ''}>{v.participationPct}%{v.participationPct < 70 && <span className="sr-only"> (below 70% target)</span>}</span> },
                  { key: 'fav', header: 'Favourable', align: 'right', sort: (v: any) => v.favourablePct, render: (v: any) => v.favourablePct === null ? <span className="chip chip-muted plain">Suppressed</span> : `${v.favourablePct}%` },
                ]} />
            </div>
          </>
        )}
      </Async>
    </>
  );
}
