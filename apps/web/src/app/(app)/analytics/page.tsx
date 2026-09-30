'use client';
import { useSession } from '@/components/AppShell';
import { ColumnChart, HBarChart } from '@/components/Charts';
import { Async, Callout, PermissionDenied, SampleTag } from '@/components/ui';
import { useApi } from '@/lib/api';

export default function Analytics() {
  const { can } = useSession();
  const allowed = can('analytics.dashboard.read') || can('analytics.admin');
  const d = useApi<any>(allowed ? '/analytics/preview/workforce' : null);
  if (!allowed) return <div className="card"><PermissionDenied detail="People Analytics is not part of your role." /></div>;
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">People Analytics</div>
          <h1>Workforce overview</h1>
          <p>Dashboard preview built on the synthetic HRIS. Governed KPIs (metric dictionary, approved snapshots, publication) arrive in Phase 2.</p>
        </div>
        <SampleTag>Preview · DR-11</SampleTag>
      </div>
      <Async state={d} rows={8}>
        {(x) => (
          <>
            <div className="mb-3"><Callout tone="warn"><strong>{x.label}.</strong> Scope: {x.scope}. Groups smaller than {x.minN} are suppressed.</Callout></div>
            <div className="grid grid-4 mb-3">
              <div className="card kpi accent-brand"><span className="kpi-label">Active headcount</span><span className="kpi-value">{x.kpis.headcount.toLocaleString()}</span><span className="kpi-sub">Synthetic HRIS, today</span></div>
              <div className="card kpi"><span className="kpi-label">Hires YTD</span><span className="kpi-value">{x.kpis.hiresYtd}</span><span className="kpi-sub">Join date this year</span></div>
              <div className="card kpi"><span className="kpi-label">Separations YTD</span><span className="kpi-value">{x.kpis.separationsYtd}</span><span className="kpi-sub">Leave date this year</span></div>
              <div className="card kpi accent-warn"><span className="kpi-label">Turnover YTD</span><span className="kpi-value">{x.kpis.turnoverYtdPct ?? '—'}%</span><span className="kpi-sub">Illustrative formula</span></div>
            </div>
            <div className="grid grid-2 mb-3">
              <div className="card">
                <div className="card-head"><h3>Headcount by division</h3><span className="hint">Active employees</span></div>
                <div className="card-body"><HBarChart title="Active headcount by division" data={x.headcountByDivision} series={1} /></div>
              </div>
              <div className="card">
                <div className="card-head"><h3>Separations this year by division</h3><span className="hint">Suppressed below {x.minN}</span></div>
                <div className="card-body">
                  <div className="legend"><span className="legend-item"><span className="legend-swatch swatch-2" />Separations</span><span className="legend-item"><span className="legend-swatch swatch-suppressed" />Suppressed (n &lt; {x.minN})</span></div>
                  <HBarChart title="Separations this year by division" data={x.separationsByDivision} series={2} />
                </div>
              </div>
            </div>
            <div className="grid grid-2">
              <div className="card">
                <div className="card-head"><h3>Hires by year</h3><span className="hint">By join date</span></div>
                <div className="card-body"><ColumnChart title="Hires by year" data={x.hiresByYear} series={1} highlightLast /></div>
              </div>
              <div className="card">
                <div className="card-head"><h3>Grade mix</h3><span className="hint">Active employees, G1–G9</span></div>
                <div className="card-body"><ColumnChart title="Active employees by grade" data={x.gradeMix} series={3} highlightLast /></div>
              </div>
            </div>
          </>
        )}
      </Async>
    </>
  );
}
