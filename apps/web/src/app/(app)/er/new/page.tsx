'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from '@/components/AppShell';
import { Icon } from '@/components/Icon';
import { Async, Callout, PermissionDenied, SampleTag } from '@/components/ui';
import { api, ApiError, useApi } from '@/lib/api';

export default function NewCase() {
  const { can } = useSession();
  const router = useRouter();
  const lookups = useApi<any>(can('er.case.create') ? '/config/lookups' : null);
  const today = new Date().toISOString().slice(0, 10);
  const [f, setF] = useState<any>({ caseType: '', category: '', source: '', priority: 'MEDIUM', confidentiality: 'STANDARD', reportedDate: today, incidentDate: '', summary: '', subjectUid: '', firstTaskDue: '' });
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [subject, setSubject] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => api(`/employees?q=${encodeURIComponent(q)}&limit=8`).then((r) => setResults(r.items)).catch(() => setResults([])), 250);
    return () => clearTimeout(t);
  }, [q]);

  if (!can('er.case.create')) return <div className="card"><PermissionDenied detail="Creating ER cases requires the ER Officer or ER Manager role." /></div>;

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  const opts = (set: string) => (lookups.data?.[set]?.values ?? []).map((v: any) => <option key={v.code} value={v.code}>{v.label}</option>);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await api('/er/cases', { method: 'POST', body: { ...f, subjectUid: subject?.uid, firstTaskDue: f.firstTaskDue ? new Date(`${f.firstTaskDue}T17:00:00+05:00`).toISOString() : undefined, incidentDate: f.incidentDate || undefined } });
      router.push(`/er/cases/${r.id}`);
    } catch (e2) { setErr((e2 as ApiError).problem.detail ?? 'Could not create case'); setBusy(false); }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumbs"><Link href="/er">Employee Relations</Link> / New case</div>
          <h1>New ER case</h1>
          <p>Structured intake. You will be added as case lead; the case is visible only to its case team and ER Managers.</p>
        </div>
      </div>
      <Async state={lookups} rows={6}>
        {() => (
          <form className="grid grid-main-side" onSubmit={submit}>
            <div className="card">
              <div className="card-head"><h3>Case details</h3><SampleTag>Sample categories · DR-15</SampleTag></div>
              <div className="card-body">
                <div className="form-grid">
                  <div className="field span-2">
                    <label htmlFor="emp">Subject employee <span className="req">*</span></label>
                    {subject ? (
                      <div className="row-between callout"><div><strong>{subject.fullName}</strong> <span className="mono small">{subject.uid}</span><div className="small muted">{subject.positionTitle} · {subject.orgUnit}</div></div>
                        <button type="button" className="btn btn-sm" onClick={() => setSubject(null)}>Change</button></div>
                    ) : (
                      <div className="stack" style={{ gap: 6 }}>
                        <div className="search"><Icon name="search" /><input id="emp" className="input" placeholder="Search by name, UID or position (EmployeeService)" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" /></div>
                        {results.length > 0 && (
                          <div className="card" style={{ boxShadow: 'var(--shadow-md)' }}>
                            {results.map((r) => (
                              <div key={r.uid} className="action-row" style={{ gridTemplateColumns: '1fr' }} onClick={() => { setSubject(r); setQ(''); setResults([]); }} role="button" tabIndex={0}>
                                <div><span className="strong">{r.fullName}</span> <span className="mono small muted">{r.uid}</span><div className="small muted">{r.positionTitle} · {r.orgUnit}</div></div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="field"><label htmlFor="ct">Case type <span className="req">*</span></label><select id="ct" className="select" required value={f.caseType} onChange={set('caseType')}><option value="">Select…</option>{opts('er.case_type')}</select></div>
                  <div className="field"><label htmlFor="cat">Category <span className="req">*</span></label><select id="cat" className="select" required value={f.category} onChange={set('category')}><option value="">Select…</option>{opts('er.category')}</select></div>
                  <div className="field"><label htmlFor="src">Source <span className="req">*</span></label><select id="src" className="select" required value={f.source} onChange={set('source')}><option value="">Select…</option>{opts('er.source')}</select></div>
                  <div className="field"><label htmlFor="pr">Priority</label><select id="pr" className="select" value={f.priority} onChange={set('priority')}>{opts('er.priority')}</select></div>
                  <div className="field"><label htmlFor="rd">Reported date <span className="req">*</span></label><input id="rd" type="date" className="input" required max={today} value={f.reportedDate} onChange={set('reportedDate')} /></div>
                  <div className="field"><label htmlFor="id">Incident date</label><input id="id" type="date" className="input" max={today} value={f.incidentDate} onChange={set('incidentDate')} /></div>
                  <div className="field span-2">
                    <label htmlFor="sum">Issue / allegation summary <span className="req">*</span></label>
                    <textarea id="sum" className="textarea" required minLength={10} value={f.summary} onChange={set('summary')} placeholder="Facts as reported. Avoid opinions or conclusions." />
                    <span className="help">Stored encrypted. Never included in notifications, logs or audit summaries.</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="stack">
              <div className="card">
                <div className="card-head"><h3>Handling</h3></div>
                <div className="card-body stack">
                  <div className="field"><label htmlFor="cf">Confidentiality</label><select id="cf" className="select" value={f.confidentiality} onChange={set('confidentiality')}>{opts('er.confidentiality')}</select></div>
                  <div className="field"><label htmlFor="due">Intake review due</label><input id="due" type="date" className="input" min={today} value={f.firstTaskDue} onChange={set('firstTaskDue')} />
                    <span className="help">No automatic SLA until ER SLAs are approved (DR-16).</span></div>
                </div>
              </div>
              <Callout tone="info">A reference number is allocated on save, a mandatory “review intake” task is created in your My Work, and the creation is audited.</Callout>
              {err && <Callout tone="bad">{err}</Callout>}
              <button className="btn btn-primary w-full" type="submit" disabled={busy || !subject}>{busy ? 'Creating…' : 'Create case'}</button>
            </div>
          </form>
        )}
      </Async>
    </>
  );
}
