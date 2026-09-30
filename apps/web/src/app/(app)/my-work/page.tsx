'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/components/AppShell';
import { ActionDrawer } from '@/components/ActionDrawer';
import { Icon } from '@/components/Icon';
import { Async, Empty, Modal, PriorityChip, StatusChip, Tabs, toast } from '@/components/ui';
import { api, ApiError, moduleLabel, relDue, useApi } from '@/lib/api';

type View = 'my' | 'team' | 'overdue' | 'due_soon' | 'blocked' | 'completed';

function MyWork() {
  const { can } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const view = (params.get('view') as View) ?? 'my';
  const summary = useApi<any>('/actions/summary');
  const list = useApi<any>(`/actions?view=${view}`);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const reload = () => { list.reload(); summary.reload(); };

  const s = summary.data ?? {};
  const tabs: Array<{ key: View; label: string; count?: number | null; bad?: boolean }> = [
    { key: 'my', label: 'My Work', count: s.my },
    ...(can('actions.team.read') ? [{ key: 'team' as View, label: 'Team Work', count: s.team }] : []),
    { key: 'overdue', label: 'Overdue', count: s.overdue, bad: true },
    { key: 'due_soon', label: 'Due soon', count: s.due_soon },
    { key: 'blocked', label: 'Blocked', count: s.blocked },
    { key: 'completed', label: 'Completed', count: s.completed },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Workspace</div>
          <h1>HR Action Centre</h1>
          <p>One work queue for tasks from every module. Restricted details are shown only when you are authorised for the source record.</p>
        </div>
        {can('actions.create') && <button className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" size={16} /> New action</button>}
      </div>
      <Tabs tabs={tabs} value={view} onChange={(v) => router.replace(`/my-work?view=${v}`)} />
      <div className="card">
        <Async state={list} rows={5}>
          {(d) => d.items.length === 0 ? (
            <Empty title={view === 'overdue' ? 'Nothing overdue' : 'No actions here'} icon={view === 'overdue' ? 'check' : 'inbox'}>
              {view === 'due_soon' ? `Nothing due in the next ${d.dueSoonBusinessDays} business days (configured calendar).` : 'New tasks from any module will appear here.'}
            </Empty>
          ) : (
            <div>
              {d.items.map((a: any) => {
                const due = relDue(a.dueAt);
                return (
                  <div key={a.id} className="action-row" onClick={() => setOpen(a.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpen(a.id)}>
                    <div>
                      <div className="action-title">
                        {a.title}
                        {a.mandatory && <span className="chip chip-violet plain">Mandatory</span>}
                        {a.detailHidden && <span className="lock"><Icon name="lock" /> restricted detail</span>}
                      </div>
                      {a.detail && <div className="action-detail">{a.detail}</div>}
                      <div className="action-meta">
                        <span className="mono">{a.reference}</span>
                        <span>{moduleLabel(a.sourceModule)}</span>
                        <span>{a.owner?.name ?? `${a.team?.name} (team)`}</span>
                      </div>
                    </div>
                    <div className="action-right">
                      {view !== 'completed' ? <span className={`due ${due.tone}`}>{due.text}</span> : <span className="due">Closed</span>}
                      <div className="row"><PriorityChip code={a.priority} /><StatusChip code={a.status} label={a.statusLabel} /></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Async>
      </div>
      {open && <ActionDrawer id={open} onClose={() => setOpen(null)} onChanged={reload} />}
      {creating && <NewAction onClose={() => setCreating(false)} onCreated={() => { setCreating(false); reload(); }} />}
    </>
  );
}

function NewAction({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ title: '', detail: '', priority: 'MEDIUM', dueAt: '' });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lookups = useApi<any>('/config/lookups?set=action.priority');
  async function submit() {
    setBusy(true); setErr(null);
    try {
      const r = await api('/actions', { method: 'POST', body: { ...f, dueAt: f.dueAt ? new Date(`${f.dueAt}T17:00:00+05:00`).toISOString() : undefined } });
      toast(`Created ${r.reference}`); onCreated();
    } catch (e) { setErr((e as ApiError).problem.detail ?? 'Failed'); }
    finally { setBusy(false); }
  }
  return (
    <Modal title="New action" description="Ad-hoc task assigned to you. Module workflows create their own actions automatically." onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={busy || !f.title.trim()}>Create</button></>}>
      <div className="field"><label htmlFor="t">Title <span className="req">*</span></label><input id="t" className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
      <div className="field"><label htmlFor="d">Detail</label><textarea id="d" className="textarea" value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} /></div>
      <div className="form-grid">
        <div className="field"><label htmlFor="p">Priority</label>
          <select id="p" className="select" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
            {(lookups.data?.['action.priority']?.values ?? [{ code: 'MEDIUM', label: 'Medium' }]).map((v: any) => <option key={v.code} value={v.code}>{v.label}</option>)}
          </select></div>
        <div className="field"><label htmlFor="due">Due date</label><input id="due" type="date" className="input" value={f.dueAt} onChange={(e) => setF({ ...f, dueAt: e.target.value })} /></div>
      </div>
      {err && <div className="callout callout-bad"><Icon name="alert" /><div>{err}</div></div>}
    </Modal>
  );
}

export default function Page() { return <Suspense><MyWork /></Suspense>; }
