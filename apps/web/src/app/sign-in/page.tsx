'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, initials } from '@/lib/api';
import { ErrorState, Loading } from '@/components/ui';

interface Persona { upn: string; displayName: string; roleCode: string; roleName: string; ref: string; scope: string; expired: boolean; note: string }

function SignIn() {
  const [personas, setPersonas] = useState<Persona[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const router = useRouter();
  const next = useSearchParams().get('next') ?? '/';

  useEffect(() => { api<Persona[]>('/auth/personas').then(setPersonas).catch(setError); }, []);

  async function signIn(upn: string) {
    setBusy(upn);
    try {
      await api('/session', { method: 'POST', body: { upn } });
      router.replace(next.startsWith('/') ? next : '/');
    } catch (e) { setError(e as ApiError); setBusy(null); }
  }

  const sorted = (personas ?? []).slice().sort((a, b) => Number(a.ref?.slice(1)) - Number(b.ref?.slice(1)) || a.upn.localeCompare(b.upn))
    .filter((p) => !filter || `${p.displayName} ${p.roleName} ${p.note}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="signin">
      <section className="signin-hero">
        <div className="brand" style={{ padding: 0, border: 0 }}>
          <div className="brand-mark">P&amp;ER</div>
          <div className="brand-text"><strong>People &amp; ER Platform</strong><span>People &amp; Culture</span></div>
        </div>
        <h1>One governed platform for People Analytics, ER and HR workflows.</h1>
        <p>This is the <strong>DEV</strong> environment. It contains synthetic data only and uses a mock identity provider so each role can be tested.</p>
        <ul>
          <li>Access is decided server-side by role + organisational scope on every request.</li>
          <li>Salary, NID and passport are always masked; reveals are audited.</li>
          <li>ER cases are visible only to the case team (with database row-level security).</li>
          <li>Every material action is written to a hash-chained, append-only audit trail.</li>
        </ul>
        <p className="small" style={{ marginTop: 'auto' }}>In UAT and PROD this page is replaced by Microsoft Entra ID single sign-on with MFA. The mock sign-in cannot run outside DEV.</p>
      </section>
      <section className="signin-main">
        <div className="row-between">
          <div>
            <h2>Choose a DEV persona</h2>
            <p className="muted mt-1">One persona per draft role (R1–R16) plus edge cases. Roles are pending sign-off (DR-06).</p>
          </div>
          <input className="input" style={{ maxWidth: 260 }} placeholder="Filter personas…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter personas" />
        </div>
        {error && <div className="card mt-3"><ErrorState error={error} /></div>}
        {!personas && !error && <div className="card mt-3"><Loading rows={5} /></div>}
        <div className="persona-grid">
          {sorted.map((p) => (
            <button key={p.upn} className={`persona ${p.expired ? 'expired' : ''}`} onClick={() => signIn(p.upn)} disabled={!!busy}>
              <div className="avatar">{initials(p.displayName)}</div>
              <div>
                <strong>{p.displayName}</strong>
                <div className="role">{p.ref} · {p.roleName}</div>
                {p.note.includes('(') && <div className="note">{p.note.slice(p.note.indexOf('(') + 1, p.note.lastIndexOf(')'))}</div>}
                <div className="note">Scope: {p.scope}{p.expired && <span className="chip chip-bad plain" style={{ marginLeft: 6 }}>Expired grant</span>}</div>
                {busy === p.upn && <div className="note">Signing in…</div>}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return <Suspense><SignIn /></Suspense>;
}
