'use client';
import Link from 'next/link';
import { use, useState } from 'react';
import { ActionDrawer } from '@/components/ActionDrawer';
import { Icon } from '@/components/Icon';
import { UserPicker } from '@/components/UserPicker';
import { Async, Callout, ConfChip, Empty, Modal, PriorityChip, SampleTag, StatusChip, Tabs, toast } from '@/components/ui';
import { api, ApiError, fmtDate, fmtDateTime, labelise, relDue, useApi } from '@/lib/api';

type Tab = 'overview' | 'timeline' | 'tasks' | 'team' | 'access';

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const kase = useApi<any>(`/er/cases/${id}`);
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <Async state={kase} rows={8}>
      {(c) => (
        <>
          <div className="page-head">
            <div>
              <div className="crumbs"><Link href="/er">ER Case Management</Link> / {c.reference}</div>
              <div className="row"><h1>{c.reference}</h1><StatusChip code={c.status} label={c.statusLabel} /><PriorityChip code={c.priority} /><ConfChip code={c.confidentiality} /></div>
              <p>{labelise(c.type)} · {labelise(c.category)} · Source: {labelise(c.source)} · Opened {fmtDate(c.openedAt)} · Lead {c.lead}</p>
            </div>
            <CaseActions c={c} onChanged={kase.reload} />
          </div>
          <Tabs<Tab> value={tab} onChange={setTab} tabs={[
            { key: 'overview', label: 'Overview' }, { key: 'timeline', label: 'Chronology' }, { key: 'tasks', label: 'Tasks' },
            { key: 'team', label: 'Case team', count: c.team.filter((t: any) => t.active).length },
            ...(c.can.accessLog ? [{ key: 'access' as Tab, label: 'Access log' }] : []),
          ]} />
          {tab === 'overview' && <Overview c={c} />}
          {tab === 'timeline' && <Timeline id={id} canUpdate={c.can.update} />}
          {tab === 'tasks' && <Tasks id={id} canUpdate={c.can.update} />}
          {tab === 'team' && <Team c={c} onChanged={kase.reload} />}
          {tab === 'access' && <AccessLog id={id} />}
        </>
      )}
    </Async>
  );
}

function CaseActions({ c, onChanged }: { c: any; onChanged: () => void }) {
  const [t, setT] = useState<any>(null);
  const [closing, setClosing] = useState(false);
  const [reason, setReason] = useState('');
  const [override, setOverride] = useState('');
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reset = () => { setT(null); setClosing(false); setReason(''); setOverride(''); setBlocked(null); setErr(null); };

  async function run(fn: () => Promise<any>, msg: string) {
    setBusy(true); setErr(null);
    try { await fn(); toast(msg); reset(); onChanged(); }
    catch (e) {
      const p = (e as ApiError).problem;
      if (p.status === 409 && Array.isArray(p.openActions)) setBlocked(p.openActions as string[]);
      setErr(p.detail ?? 'Failed');
    } finally { setBusy(false); }
  }

  return (
    <div className="row">
      {c.transitions.map((x: any) => <button key={x.to} className="btn btn-sm" onClick={() => setT(x)}>{x.label}</button>)}
      {c.can.close && <button className="btn btn-sm btn-danger" onClick={() => setClosing(true)}>Close case</button>}
      {t && (
        <Modal title={t.label} description={`Change status to “${labelise(t.to)}”. Recorded in the chronology and audit log.`} onClose={reset}
          footer={<><button className="btn" onClick={reset}>Cancel</button><button className="btn btn-primary" disabled={busy || (t.requiresReason && !reason.trim())} onClick={() => run(() => api(`/er/cases/${c.id}/status`, { method: 'POST', body: { to: t.to, reason: reason || undefined } }), 'Status updated')}>Confirm</button></>}>
          {t.requiresReason && <div className="field"><label htmlFor="r">Reason <span className="req">*</span></label><textarea id="r" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} /></div>}
          {err && <Callout tone="bad">{err}</Callout>}
        </Modal>
      )}
      {closing && (
        <Modal title={`Close ${c.reference}`} description="Closure is final in this MVP. The closure checklist requires all mandatory actions to be complete, unless you record an override reason." onClose={reset}
          footer={<><button className="btn" onClick={reset}>Cancel</button><button className="btn btn-danger" disabled={busy || !reason.trim() || (!!blocked && !override.trim())}
            onClick={() => run(() => api(`/er/cases/${c.id}/close`, { method: 'POST', body: { reason, overrideReason: override || undefined } }), 'Case closed')}>Close case</button></>}>
          <div className="field"><label htmlFor="cr">Closure reason <span className="req">*</span></label><textarea id="cr" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          {blocked && (
            <>
              <Callout tone="warn">Open mandatory actions: <strong>{blocked.join(', ')}</strong>. Record an override reason to close anyway (audited).</Callout>
              <div className="field"><label htmlFor="or">Override reason <span className="req">*</span></label><textarea id="or" className="textarea" value={override} onChange={(e) => setOverride(e.target.value)} /></div>
            </>
          )}
          {err && !blocked && <Callout tone="bad">{err}</Callout>}
        </Modal>
      )}
    </div>
  );
}

function Overview({ c }: { c: any }) {
  return (
    <div className="grid grid-main-side">
      <div className="stack">
        <div className="card">
          <div className="card-head"><h3>Issue / allegation summary</h3><span className="lock"><Icon name="lock" /> Encrypted at rest</span></div>
          <div className="card-body"><div className="tl-text" style={{ marginTop: 0 }}>{c.summary}</div></div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Participants</h3></div>
          <div className="card-body flush">
            <table className="table"><thead><tr><th>Role</th><th>Employee</th><th>Position</th></tr></thead><tbody>
              {c.participants.map((p: any) => <tr key={p.id}><td><span className="chip chip-navy plain">{labelise(p.role)}</span></td><td><span className="cell-main">{p.name ?? '—'}</span> <span className="mono small muted">{p.uid}</span></td><td>{p.position ?? '—'}</td></tr>)}
            </tbody></table>
          </div>
        </div>
      </div>
      <div className="stack">
        <div className="card">
          <div className="card-head"><h3>Case facts</h3></div>
          <div className="card-body">
            <dl className="dl" style={{ gridTemplateColumns: '120px 1fr' }}>
              <dt>Reported</dt><dd>{fmtDate(c.reportedDate)}</dd>
              <dt>Incident</dt><dd>{fmtDate(c.incidentDate)}</dd>
              <dt>Opened</dt><dd>{fmtDateTime(c.openedAt)}</dd>
              {c.closedAt && <><dt>Closed</dt><dd>{fmtDateTime(c.closedAt)}</dd><dt>Reason</dt><dd>{c.closureReason}</dd></>}
              <dt>Legal hold</dt><dd>{c.legalHold ? 'Yes' : 'No'}</dd>
            </dl>
          </div>
        </div>
        <Callout tone="warn"><strong>Sample workflow.</strong> {c.workflowNote}</Callout>
        <Callout tone="info">AI may later summarise chronology or draft approved wording. It will never determine guilt, credibility or sanction (BP §8.1).</Callout>
      </div>
    </div>
  );
}

function Timeline({ id, canUpdate }: { id: string; canUpdate: boolean }) {
  const tl = useApi<any[]>(`/er/cases/${id}/timeline`);
  const lookups = useApi<any>('/config/lookups?set=er.event_type');
  const [adding, setAdding] = useState(false);
  const [amend, setAmend] = useState<any>(null);
  const [f, setF] = useState({ eventType: 'NOTE', eventAt: '', text: '', reason: '' });
  const [err, setErr] = useState<string | null>(null);
  const reset = () => { setAdding(false); setAmend(null); setF({ eventType: 'NOTE', eventAt: '', text: '', reason: '' }); setErr(null); };

  async function save() {
    try {
      if (amend) await api(`/er/cases/${id}/timeline/${amend.id}/amend`, { method: 'POST', body: { text: f.text, reason: f.reason } });
      else await api(`/er/cases/${id}/timeline`, { method: 'POST', body: { eventType: f.eventType, text: f.text, eventAt: f.eventAt ? new Date(f.eventAt).toISOString() : undefined } });
      toast(amend ? 'Amendment recorded' : 'Entry added'); reset(); tl.reload();
    } catch (e) { setErr((e as ApiError).problem.detail ?? 'Failed'); }
  }

  const dotClass = (t: string) => t === 'AMENDMENT' ? 'amend' : t === 'CLOSED' ? 'closed' : ['CREATED', 'STATUS_CHANGED', 'TEAM_CHANGED', 'TASK_CREATED'].includes(t) ? 'system' : '';
  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Chronology</h3><div className="hint">Immutable. Corrections are recorded as linked amendments; the original is never overwritten.</div></div>
        {canUpdate && <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> Add entry</button>}
      </div>
      <div className="card-body">
        <Async state={tl} rows={5}>
          {(items) => items.length === 0 ? <Empty title="No entries" /> : (
            <ul className="timeline">
              {items.map((e) => (
                <li key={e.id} className={`tl-item ${e.amendedBy.length ? 'amended' : ''}`}>
                  <span className={`tl-dot ${dotClass(e.type)}`} />
                  <div className="tl-head">
                    <span className="tl-type">{labelise(e.type)}</span>
                    <span>{fmtDateTime(e.eventAt)}</span><span>· {e.recordedBy}</span>
                    {e.recordedAt !== e.eventAt && Math.abs(new Date(e.recordedAt).getTime() - new Date(e.eventAt).getTime()) > 60000 && <span className="small">(recorded {fmtDateTime(e.recordedAt)})</span>}
                    {canUpdate && e.type !== 'AMENDMENT' && <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setAmend(e); setF({ ...f, text: e.text }); }}>Amend</button>}
                  </div>
                  <div className="tl-text">{e.text}</div>
                  {e.amends && <div className="tl-note">Amends an earlier entry · Reason: {e.amendmentReason}</div>}
                  {e.amendedBy.length > 0 && <div className="tl-note">This entry has {e.amendedBy.length} amendment(s) below.</div>}
                </li>
              ))}
            </ul>
          )}
        </Async>
      </div>
      {(adding || amend) && (
        <Modal title={amend ? 'Record amendment' : 'Add chronology entry'} description={amend ? 'The original entry stays unchanged. Your correction is linked to it with a reason.' : 'Entries cannot be edited or deleted after saving.'} onClose={reset}
          footer={<><button className="btn" onClick={reset}>Cancel</button><button className="btn btn-primary" onClick={save} disabled={!f.text.trim() || (!!amend && !f.reason.trim())}>Save</button></>}>
          {!amend && (
            <div className="form-grid">
              <div className="field"><label htmlFor="et">Type</label><select id="et" className="select" value={f.eventType} onChange={(e) => setF({ ...f, eventType: e.target.value })}>
                {(lookups.data?.['er.event_type']?.values ?? []).map((v: any) => <option key={v.code} value={v.code}>{v.label}</option>)}</select></div>
              <div className="field"><label htmlFor="ea">When it happened</label><input id="ea" type="datetime-local" className="input" value={f.eventAt} onChange={(e) => setF({ ...f, eventAt: e.target.value })} /></div>
            </div>
          )}
          <div className="field"><label htmlFor="tx">{amend ? 'Corrected text' : 'Entry'} <span className="req">*</span></label><textarea id="tx" className="textarea" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></div>
          {amend && <div className="field"><label htmlFor="ar">Reason for amendment <span className="req">*</span></label><input id="ar" className="input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>}
          {err && <Callout tone="bad">{err}</Callout>}
        </Modal>
      )}
    </div>
  );
}

function Tasks({ id, canUpdate }: { id: string; canUpdate: boolean }) {
  const tasks = useApi<any[]>(`/er/cases/${id}/tasks`);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState<any>({ detail: '', priority: 'MEDIUM', dueAt: '', mandatory: false });
  const [owner, setOwner] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    try {
      await api(`/er/cases/${id}/tasks`, { method: 'POST', body: { ...f, ownerUserId: owner?.id, dueAt: f.dueAt ? new Date(`${f.dueAt}T17:00:00+05:00`).toISOString() : undefined } });
      toast('Task created'); setAdding(false); setF({ detail: '', priority: 'MEDIUM', dueAt: '', mandatory: false }); setOwner(null); tasks.reload();
    } catch (e) { setErr((e as ApiError).problem.detail ?? 'Failed'); }
  }
  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Case tasks</h3><div className="hint">Created in the HR Action Centre. Owners outside the case team see only “ER follow-up task”.</div></div>
        {canUpdate && <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> Add task</button>}
      </div>
      <div className="card-body flush">
        <Async state={tasks} rows={3}>
          {(rows) => rows.length === 0 ? <Empty title="No tasks" /> : (
            <table className="table"><thead><tr><th>Reference</th><th>Task</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead><tbody>
              {rows.map((t) => { const d = relDue(t.dueAt); return (
                <tr key={t.id} className="clickable" onClick={() => setOpen(t.id)}>
                  <td className="mono">{t.reference}</td>
                  <td>{t.detail}{t.mandatory && <> <span className="chip chip-violet plain">Mandatory</span></>}</td>
                  <td>{t.owner}</td>
                  <td>{t.completedAt ? <span className="muted small">Done {fmtDate(t.completedAt)}</span> : <span className={`due ${d.tone}`}>{d.text}</span>}</td>
                  <td><StatusChip code={t.status} /></td>
                </tr>); })}
            </tbody></table>
          )}
        </Async>
      </div>
      {open && <ActionDrawer id={open} onClose={() => setOpen(null)} onChanged={tasks.reload} />}
      {adding && (
        <Modal title="Add case task" onClose={() => setAdding(false)} footer={<><button className="btn" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" disabled={!f.detail.trim()} onClick={save}>Create task</button></>}>
          <div className="field"><label htmlFor="td">Task (restricted detail) <span className="req">*</span></label><textarea id="td" className="textarea" value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} /></div>
          <div className="field"><label>Owner (default: you)</label><UserPicker value={owner} onChange={setOwner} /></div>
          <div className="form-grid">
            <div className="field"><label htmlFor="tdue">Due date</label><input id="tdue" type="date" className="input" value={f.dueAt} onChange={(e) => setF({ ...f, dueAt: e.target.value })} /></div>
            <div className="field"><label htmlFor="tp">Priority</label><select id="tp" className="select" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></div>
          </div>
          <label className="row small"><input type="checkbox" checked={f.mandatory} onChange={(e) => setF({ ...f, mandatory: e.target.checked })} /> Mandatory before closure</label>
          {err && <Callout tone="bad">{err}</Callout>}
        </Modal>
      )}
    </div>
  );
}

function Team({ c, onChanged }: { c: any; onChanged: () => void }) {
  const [adding, setAdding] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState('OFFICER');
  const [err, setErr] = useState<string | null>(null);
  async function add() {
    try { await api(`/er/cases/${c.id}/team`, { method: 'POST', body: { userId: user?.id, role } }); toast('Member added'); setAdding(false); setUser(null); onChanged(); }
    catch (e) { setErr((e as ApiError).problem.detail ?? 'Failed'); }
  }
  async function remove(u: any) {
    const reason = window.prompt(`Reason for removing ${u.name} from the case team?`);
    if (!reason) return;
    try { await api(`/er/cases/${c.id}/team/${u.userId}?reason=${encodeURIComponent(reason)}`, { method: 'DELETE' }); toast('Member removed'); onChanged(); }
    catch (e) { toast((e as ApiError).problem.detail ?? 'Failed', true); }
  }
  return (
    <div className="card">
      <div className="card-head">
        <div><h3>Case team</h3><div className="hint">Case access is granted by team membership (enforced by the API and by database row-level security).</div></div>
        {c.can.manageTeam && <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={14} /> Add member</button>}
      </div>
      <div className="card-body flush">
        <table className="table"><thead><tr><th>Member</th><th>Case role</th><th>From</th><th>Until</th><th /></tr></thead><tbody>
          {c.team.map((t: any, i: number) => (
            <tr key={i} style={{ opacity: t.active ? 1 : .55 }}>
              <td className="cell-main">{t.name}</td><td><span className="chip chip-navy plain">{labelise(t.role)}</span></td>
              <td>{fmtDate(t.from)}</td><td>{t.to ? fmtDate(t.to) : <span className="chip chip-ok">Active</span>}</td>
              <td className="right">{c.can.manageTeam && t.active && t.role !== 'LEAD' && <button className="btn btn-sm btn-ghost" onClick={() => remove(t)}>Remove</button>}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
      {adding && (
        <Modal title="Add case team member" description="Only users holding an ER role can be added." onClose={() => setAdding(false)}
          footer={<><button className="btn" onClick={() => setAdding(false)}>Cancel</button><button className="btn btn-primary" disabled={!user} onClick={add}>Add</button></>}>
          <div className="field"><label>Person</label><UserPicker value={user} onChange={setUser} permission="er.case.read" /></div>
          <div className="field"><label htmlFor="rl">Case role</label><select id="rl" className="select" value={role} onChange={(e) => setRole(e.target.value)}>{['OFFICER', 'INVESTIGATOR', 'REVIEWER', 'OBSERVER'].map((r) => <option key={r} value={r}>{labelise(r)}</option>)}</select></div>
          {err && <Callout tone="bad">{err}</Callout>}
        </Modal>
      )}
    </div>
  );
}

function AccessLog({ id }: { id: string }) {
  const log = useApi<any[]>(`/er/cases/${id}/access-log`);
  return (
    <div className="card">
      <div className="card-head"><div><h3>Access log</h3><div className="hint">Every open of this case and every change, from the immutable audit trail.</div></div><SampleTag>Relayed within ~1s</SampleTag></div>
      <div className="card-body flush">
        <Async state={log} rows={4}>
          {(rows) => rows.length === 0 ? <Empty title="No events yet" /> : (
            <table className="table"><thead><tr><th>#</th><th>When</th><th>Who</th><th>Event</th><th>Outcome</th></tr></thead><tbody>
              {rows.map((r) => <tr key={r.chain_seq}><td className="mono small">{r.chain_seq}</td><td>{fmtDateTime(r.occurred_at)}</td><td>{r.actor ?? 'System'}</td><td className="mono small">{r.event_type}</td><td><span className={`chip ${r.outcome === 'SUCCESS' ? 'chip-ok' : 'chip-bad'}`}>{r.outcome}</span></td></tr>)}
            </tbody></table>
          )}
        </Async>
      </div>
    </div>
  );
}
