'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError, initials } from '@/lib/api';
import { ErrorState, Loading } from '@/components/ui';
import { RoleIds } from '@/components/AppShell';
import { ThemeSwitch } from '@/components/ThemeSwitch';

interface Persona { upn: string; displayName: string; title: string; scope: string; group: 'primary' | 'fixture'; note: string; roleIds: string; extras: string[]; expired: boolean }

function PersonaCard({ p, busy, onPick }: { p: Persona; busy: string | null; onPick: (upn: string) => void }) {
  return (
    <button className={`persona ${p.extras.length ? 'owner' : ''} ${p.expired ? 'expired' : ''}`} onClick={() => onPick(p.upn)} disabled={!!busy}
      aria-label={`Sign in as ${p.displayName}, ${p.title}`}>
      <div className="avatar" aria-hidden="true">{initials(p.displayName)}</div>
      <div>
        <strong>{p.displayName}</strong>
        <div className="title">{p.title}</div>
        <RoleIds ids={p.roleIds} extras={p.extras} />
        <div className="scope">SCOPE: {p.scope}</div>
        {p.expired && <span className="chip chip-bad plain mt-1">Expired grant</span>}
        {busy === p.upn && <div className="note">Signing in…</div>}
      </div>
    </button>
  );
}

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

  const match = (p: Persona) => !filter || `${p.displayName} ${p.title} ${p.roleIds} ${p.scope}`.toLowerCase().includes(filter.toLowerCase());
  const primary = (personas ?? []).filter((p) => p.group === 'primary' && match(p));
  const fixtures = (personas ?? []).filter((p) => p.group === 'fixture' && match(p));

  return (
    <div className="signin">
      <section className="signin-hero">
        <div className="brand" style={{ padding: 0, border: 0 }}>
          <div className="brand-mark" aria-hidden="true">P&amp;ER</div>
          <div className="brand-text"><strong>People &amp; ER Platform</strong><span>BML · People &amp; Culture</span></div>
        </div>
        <div className="accent-rule" aria-hidden="true" />
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
      <main className="signin-main">
        <div className="row-between">
          <div>
            <div className="eyebrow">DEV sign-in</div>
            <h2>Choose a persona</h2>
            <p className="muted mt-1">Role IDs follow the draft access matrix (R1–R16). Roles are pending sign-off (DR-06).</p>
          </div>
          <div className="row">
            <ThemeSwitch id="signin-theme" />
            <input className="input" style={{ maxWidth: 220 }} type="search" placeholder="Filter personas…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter personas" />
          </div>
        </div>
        {error && <div className="card mt-3"><ErrorState error={error} /></div>}
        {!personas && !error && <div className="card mt-3"><Loading rows={5} /></div>}
        <div className="persona-grid">{primary.map((p) => <PersonaCard key={p.upn} p={p} busy={busy} onPick={signIn} />)}</div>
        {fixtures.length > 0 && (
          <details className="fixtures">
            <summary>Single-role test fixtures ({fixtures.length}) – used by the automated security and e2e suites</summary>
            <div className="persona-grid">{fixtures.map((p) => <PersonaCard key={p.upn} p={p} busy={busy} onPick={signIn} />)}</div>
          </details>
        )}
      </main>
    </div>
  );
}

export default function Page() {
  return <Suspense><SignIn /></Suspense>;
}
