'use client';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiError, initials } from '@/lib/api';
import { Icon } from './Icon';
import { ErrorState, Loading, Toaster } from './ui';

interface NavItem { key: string; label: string; href: string; group: 'main' | 'modules' | 'admin'; available: boolean; phase?: string }
interface Me { userId: string; upn: string; displayName: string; roles: Array<{ code: string; name: string }>; scope: { bank: boolean; orgUnits: number }; hasAccess: boolean }
interface Session { me: Me; permissions: Set<string>; navigation: NavItem[]; can: (p: string) => boolean }

const SessionCtx = createContext<Session | null>(null);
export const useSession = () => {
  const s = useContext(SessionCtx);
  if (!s) throw new Error('useSession outside AppShell');
  return s;
};

const GROUPS: Array<[NavItem['group'], string]> = [['main', 'Workspace'], ['modules', 'Modules'], ['admin', 'Administration']];

export function AppShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    Promise.all([api<Me>('/me'), api<{ permissions: string[]; navigation: NavItem[] }>('/me/capabilities')])
      .then(([me, caps]) => {
        const permissions = new Set(caps.permissions);
        setSession({ me, permissions, navigation: caps.navigation, can: (p) => permissions.has(p) });
      })
      .catch((e) => setError(e));
  }, []);

  async function signOut() {
    await api('/session', { method: 'DELETE' }).catch(() => undefined);
    router.replace('/sign-in');
  }

  if (error) return <div className="content"><div className="card"><ErrorState error={error} /></div></div>;
  if (!session) return <div className="content"><div className="card"><Loading rows={6} /></div></div>;

  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  return (
    <SessionCtx.Provider value={session}>
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="shell">
        <aside className="sidebar" aria-label="Primary">
          <div className="brand">
            <div className="brand-mark">P&amp;ER</div>
            <div className="brand-text"><strong>People &amp; ER Platform</strong><span>People &amp; Culture</span></div>
          </div>
          <nav className="nav">
            {GROUPS.map(([g, label]) => {
              const items = session.navigation.filter((n) => n.group === g);
              if (!items.length) return null;
              return (
                <div className="nav-group" key={g}>
                  <div className="nav-group-label">{label}</div>
                  {items.map((n) => (
                    <Link key={n.key} href={n.href} className={`nav-link ${active(n.href) ? 'active' : ''}`} aria-current={active(n.href) ? 'page' : undefined}>
                      <Icon name={n.key} className="nav-icon" />
                      <span>{n.label}</span>
                      {!n.available && <span className="nav-soon">{n.phase}</span>}
                    </Link>
                  ))}
                </div>
              );
            })}
          </nav>
          <div className="sidebar-foot">v0.1 · Sprint 1 foundation<br />Navigation reflects your server-side permissions.</div>
        </aside>
        <div className="main">
          <header className="topbar">
            <span className="env-banner" title="DEV environment – synthetic data only"><Icon name="alert" size={13} /> DEV · SYNTHETIC DATA ONLY</span>
            <div className="topbar-spacer" />
            <div className="user-chip">
              <div className="avatar" aria-hidden="true">{initials(session.me.displayName)}</div>
              <div className="user-meta">
                <strong>{session.me.displayName}</strong>
                <span>{session.me.roles.map((r) => r.name).join(', ') || 'No active role'}</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={signOut} title="Sign out"><Icon name="logout" size={16} /><span className="sr-only">Sign out</span></button>
            </div>
          </header>
          <main id="main" className="content">
            {session.me.hasAccess ? children : (
              <div className="card"><div className="state denied"><div className="state-icon"><Icon name="lock" /></div>
                <h3>No active access</h3>
                <p>You are signed in, but you hold no active role or your access grant has expired. Contact the People &amp; Culture access approver.</p>
              </div></div>
            )}
          </main>
        </div>
      </div>
      <Toaster />
    </SessionCtx.Provider>
  );
}
