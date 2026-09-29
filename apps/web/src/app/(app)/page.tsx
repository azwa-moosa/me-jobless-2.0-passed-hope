'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useSession } from '@/components/AppShell';
import { ActionDrawer } from '@/components/ActionDrawer';
import { Icon } from '@/components/Icon';
import { Async, Callout, Empty, PriorityChip, StatusChip } from '@/components/ui';
import { relDue, useApi } from '@/lib/api';

export default function Home() {
  const { me, can, navigation } = useSession();
  const hour = Number(new Date().toLocaleString('en-GB', { timeZone: 'Indian/Maldives', hour: '2-digit', hour12: false }));
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const upcoming = navigation.filter((n) => !n.available);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{greet}, {me.displayName.split(' ')[0]}</h1>
          <p>Exception-first view: what is overdue, due soon or blocked across everything you are allowed to see.</p>
        </div>
      </div>

      {can('actions.use') && <WorkSummary />}
      {can('er.dashboard.read') && <ErSnapshot />}

      <div className="grid grid-2 mt-3">
        <div className="card">
          <div className="card-head"><h3>What's live in this build</h3><span className="hint">Sprint 1 + first slice</span></div>
          <div className="card-body stack small">
            <Callout tone="ok">Sign-in (DEV personas), role-adaptive navigation, server-side policy, field masking and an immutable, hash-chained audit trail.</Callout>
            <Callout tone="ok">HR Action Centre – My Work, Team, Overdue, Due soon, Blocked, Completed with controlled status transitions.</Callout>
            <Callout tone="ok">ER Case Management MVP – intake, restricted profile, immutable chronology with amendments, case team, tasks, closure checklist.</Callout>
            <Callout tone="warn">All workflow values (ER statuses, categories, numbering, working week) are <strong>sample configuration</strong> pending BML decisions.</Callout>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Coming next for your role</h3><span className="hint">Per roadmap</span></div>
          <div className="card-body flush">
            {upcoming.length === 0 ? <Empty title="Nothing queued" icon="check">All modules you can access are live.</Empty> : (
              <table className="table"><tbody>
                {upcoming.map((n) => (
                  <tr key={n.key}><td><div className="row"><Icon name={n.key} size={16} /> <span className="cell-main">{n.label}</span></div></td><td className="right"><span className="chip chip-muted plain">{n.phase}</span></td></tr>
                ))}
              </tbody></table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function WorkSummary() {
  const summary = useApi<any>('/actions/summary');
  const overdue = useApi<any>('/actions?view=overdue');
  const soon = useApi<any>('/actions?view=due_soon');
  const [open, setOpen] = useState<string | null>(null);
  const reload = () => { summary.reload(); overdue.reload(); soon.reload(); };
  const list = [...(overdue.data?.items ?? []), ...(soon.data?.items ?? [])].slice(0, 6);
  return (
    <>
      <Async state={summary} rows={2}>
        {(s) => (
          <div className="grid grid-4 mb-3">
            <Link href="/my-work?view=my" className="card kpi"><span className="kpi-label">My open actions</span><span className="kpi-value">{s.my}</span><span className="kpi-sub">Assigned to you</span></Link>
            <Link href="/my-work?view=overdue" className={`card kpi ${s.overdue ? 'accent-bad' : 'accent-ok'}`}><span className="kpi-label">Overdue</span><span className="kpi-value">{s.overdue}</span><span className="kpi-sub">Past due date</span></Link>
            <Link href="/my-work?view=due_soon" className={`card kpi ${s.due_soon ? 'accent-warn' : ''}`}><span className="kpi-label">Due soon</span><span className="kpi-value">{s.due_soon}</span><span className="kpi-sub">Within {3} business days</span></Link>
            <Link href="/my-work?view=blocked" className={`card kpi ${s.blocked ? 'accent-warn' : ''}`}><span className="kpi-label">Blocked</span><span className="kpi-value">{s.blocked}</span><span className="kpi-sub">Waiting on something</span></Link>
          </div>
        )}
      </Async>
      <div className="card mb-3">
        <div className="card-head"><h3>Needs attention</h3><Link href="/my-work" className="btn btn-sm">Open My Work</Link></div>
        <div className="card-body flush">
          {list.length === 0 && !overdue.loading ? <Empty title="You're all caught up" icon="check">Nothing overdue or due in the next few business days.</Empty> :
            list.map((a: any) => {
              const due = relDue(a.dueAt);
              return (
                <div key={a.id} className="action-row" onClick={() => setOpen(a.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(a.id)}>
                  <div>
                    <div className="action-title">{a.title} {a.detailHidden && <span className="lock"><Icon name="lock" /> restricted</span>}</div>
                    {a.detail && <div className="action-detail">{a.detail}</div>}
                    <div className="action-meta"><span className="mono">{a.reference}</span><span>{a.owner?.name ?? a.team?.name}</span></div>
                  </div>
                  <div className="action-right"><span className={`due ${due.tone}`}>{due.text}</span><div className="row"><PriorityChip code={a.priority} /><StatusChip code={a.status} label={a.statusLabel} /></div></div>
                </div>
              );
            })}
        </div>
      </div>
      {open && <ActionDrawer id={open} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  );
}

function ErSnapshot() {
  const d = useApi<any>('/er/dashboard');
  return (
    <div className="card mb-3">
      <div className="card-head"><h3>ER snapshot</h3><Link href="/er" className="btn btn-sm">ER dashboard</Link></div>
      <Async state={d} rows={2}>
        {(x) => (
          <div className="card-body">
            <div className="row" style={{ gap: 28 }}>
              <div><div className="kpi-label">Open cases</div><div className="kpi-value">{x.open}</div></div>
              <div><div className="kpi-label">Overdue case actions</div><div className="kpi-value" style={{ color: x.overdueActions ? 'var(--bad-700)' : undefined }}>{x.overdueActions}</div></div>
              <div className="small muted" style={{ marginLeft: 'auto', maxWidth: 320 }}><Icon name="lock" size={12} /> {x.scope}</div>
            </div>
          </div>
        )}
      </Async>
    </div>
  );
}
