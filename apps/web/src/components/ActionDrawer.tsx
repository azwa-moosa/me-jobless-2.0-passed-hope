'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api, ApiError, fmtDateTime, labelise, moduleLabel, relDue, useApi } from '@/lib/api';
import { Icon } from './Icon';
import { Async, Modal, PriorityChip, StatusChip, toast } from './ui';
import { UserPicker } from './UserPicker';

export function ActionDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const state = useApi<any>(`/actions/${id}`);
  const [pending, setPending] = useState<{ to: string; label: string; requiresReason: boolean } | null>(null);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [reassign, setReassign] = useState(false);
  const [owner, setOwner] = useState<{ id: string; display_name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doTransition() {
    if (!pending) return;
    setBusy(true); setErr(null);
    try {
      await api(`/actions/${id}/transition`, { method: 'POST', body: { to: pending.to, reason: reason || undefined, notes: notes || undefined, expectedVersion: undefined } });
      toast(`${pending.label}: done`);
      setPending(null); setReason(''); setNotes('');
      state.reload(); onChanged();
    } catch (e) { setErr((e as ApiError).problem.detail ?? 'Failed'); }
    finally { setBusy(false); }
  }

  async function doReassign() {
    if (!owner) return;
    setBusy(true); setErr(null);
    try {
      await api(`/actions/${id}/assign`, { method: 'POST', body: { ownerUserId: owner.id, reason } });
      toast(`Reassigned to ${owner.display_name}`);
      setReassign(false); setReason(''); setOwner(null);
      state.reload(); onChanged();
    } catch (e) { setErr((e as ApiError).problem.detail ?? 'Failed'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Action detail">
        <Async state={state} rows={6}>
          {(a) => {
            const due = relDue(a.dueAt);
            return (
              <>
                <div className="drawer-head">
                  <div>
                    <div className="small muted mono">{a.reference}</div>
                    <h3 className="mt-1">{a.title}</h3>
                    <div className="row mt-2"><StatusChip code={a.status} label={a.statusLabel} /><PriorityChip code={a.priority} />{a.mandatory && <span className="chip chip-violet plain">Mandatory</span>}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close"><Icon name="x" size={16} /></button>
                </div>
                <div className="drawer-body">
                  {a.detail ? <div className="tl-text" style={{ marginTop: 0 }}>{a.detail}</div>
                    : a.detailHidden ? <div className="callout"><Icon name="lock" /><div>Details are restricted to the source record's authorised team. You can still update the status of this task.</div></div> : null}
                  <dl className="dl">
                    <dt>Due</dt><dd><span className={`due ${due.tone}`}>{due.text}</span>{a.dueAt && <span className="muted small"> · {fmtDateTime(a.dueAt)}</span>}</dd>
                    <dt>Owner</dt><dd>{a.owner?.name ?? a.team?.name ?? '—'}{a.team && <span className="muted small"> (team)</span>}</dd>
                    <dt>Source</dt><dd>{moduleLabel(a.sourceModule)}{a.sourceLink && <> · <Link href={a.sourceLink}>Open source record</Link></>}</dd>
                    <dt>Visibility</dt><dd>{labelise(a.visibility)}</dd>
                    <dt>Created</dt><dd>{fmtDateTime(a.createdAt)} by {a.createdBy}</dd>
                    {a.completedAt && <><dt>Completed</dt><dd>{fmtDateTime(a.completedAt)}</dd></>}
                    {a.completionNotes && <><dt>Completion notes</dt><dd>{a.completionNotes}</dd></>}
                  </dl>
                  <div>
                    <h4 className="small muted" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>History</h4>
                    <ul className="timeline mt-2">
                      {a.events.map((e: any, i: number) => (
                        <li key={i} className="tl-item" style={{ paddingBottom: 12 }}>
                          <span className="tl-dot system" />
                          <div className="tl-head"><span className="tl-type">{labelise(e.event_type)}</span>{e.from_value && <span>{labelise(e.from_value)} → {labelise(e.to_value)}</span>}{!e.from_value && e.to_value && e.event_type !== 'REASSIGNED' && <span>{labelise(e.to_value)}</span>}</div>
                          <div className="small muted">{fmtDateTime(e.created_at)} · {e.actor ?? 'System'}{e.reason && <> · “{e.reason}”</>}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {(a.transitions.length > 0 || a.canReassign) && (
                  <div className="drawer-foot">
                    {a.transitions.map((t: any) => (
                      <button key={t.to} className={`btn btn-sm ${t.to === 'COMPLETED' ? 'btn-primary' : ''}`} onClick={() => { setErr(null); setPending(t); }}>
                        {t.to === 'COMPLETED' && <Icon name="check" size={14} />}{t.label}
                      </button>
                    ))}
                    {a.canReassign && <button className="btn btn-sm btn-ghost" onClick={() => { setErr(null); setReassign(true); }}>Reassign</button>}
                  </div>
                )}
                {pending && (
                  <Modal title={pending.label} description={`Move ${a.reference} to “${labelise(pending.to)}”. This is recorded in the action history and audit log.`} onClose={() => setPending(null)}
                    footer={<><button className="btn" onClick={() => setPending(null)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={doTransition}>Confirm</button></>}>
                    {pending.to === 'COMPLETED' && (
                      <div className="field"><label htmlFor="notes">Completion notes {a.mandatory && <span className="req">*</span>}</label>
                        <textarea id="notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done?" />
                        {a.mandatory && <span className="help">Required for mandatory actions.</span>}</div>
                    )}
                    {pending.requiresReason && (
                      <div className="field"><label htmlFor="reason">Reason <span className="req">*</span></label>
                        <textarea id="reason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
                    )}
                    {err && <div className="callout callout-bad"><Icon name="alert" /><div>{err}</div></div>}
                  </Modal>
                )}
                {reassign && (
                  <Modal title="Reassign action" description="Reassignment is audited with the previous owner, new owner and reason." onClose={() => setReassign(false)}
                    footer={<><button className="btn" onClick={() => setReassign(false)}>Cancel</button><button className="btn btn-primary" disabled={busy || !owner || !reason.trim()} onClick={doReassign}>Reassign</button></>}>
                    <div className="field"><label>New owner</label><UserPicker value={owner} onChange={setOwner} /></div>
                    <div className="field"><label htmlFor="rreason">Reason <span className="req">*</span></label><textarea id="rreason" className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
                    {err && <div className="callout callout-bad"><Icon name="alert" /><div>{err}</div></div>}
                  </Modal>
                )}
              </>
            );
          }}
        </Async>
      </aside>
    </>
  );
}
