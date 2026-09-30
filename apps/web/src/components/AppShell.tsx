'use client';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiError, initials } from '@/lib/api';
import { Icon } from './Icon';
import { ThemeSwitch } from './ThemeSwitch';
import { Dropdown, ErrorState, Loading, Toaster } from './ui';

interface NavItem { key: string; label: string; href: string; group: 'main' | 'modules' | 'admin'; available: boolean; phase?: string }
interface Me {
  userId: string; upn: string; displayName: string;
  roles: Array<{ code: string; ref: string; name: string }>;
  roleIds: { ids: string; extras: string[] };
  scope: { bank: boolean; orgUnits: number }; hasAccess: boolean;
}
interface Session { me: Me; permissions: Set<string>; navigation: NavItem[]; can: (p: string) => boolean }

const SessionCtx = createContext<Session | null>(null);
export const useSession = () => {
  const s = useContext(SessionCtx);
  if (!s) throw new Error('useSession outside AppShell');
  return s;
};

/** Compact, numerically ordered role IDs: "R1 · R4 · R10 + PLATFORM_OWNER". */
export function RoleIds({ ids, extras }: { ids: string; extras: string[] }) {
  return (
    <span className="role-ids">
      {ids || '—'}
      {extras.map((x) => <span key={x} className="owner"> + {x}</span>)}
    </span>
  );
}

const GROUPS: Array<[NavItem['group'], string]> = [['main', 'Workspace'], ['modules', 'Modules'], ['admin', 'Administration']];

export function AppShell({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [navOpen, setNavOpen] = useState(false);
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
  useEffect(() => setNavOpen(false), [path]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  async function signOut() {
    await api('/session', { method: 'DELETE' }).catch(() => undefined);
    router.replace('/sign-in');
  }

  if (error) return <div className="content"><div className="card"><ErrorState error={error} /></div></div>;
  if (!session) return <div className="content"><div className="card"><Loading rows={6} /></div></div>;

  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const { me } = session;
  return (
    <SessionCtx.Provider value={session}>
      <a href="#main" className="skip-link">Skip to content</a>
      <div className={`shell ${navOpen ? 'nav-open' : ''}`}>
        <aside className="sidebar" id="primary-nav" aria-label="Primary">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">P&amp;ER</div>
            <div className="brand-text"><strong>People &amp; ER Platform</strong><span>BML · People &amp; Culture</span></div>
          </div>
          <nav className="nav">
            {GROUPS.map(([g, label]) => {
              const items = session.navigation.filter((n) => n.group === g);
              if (!items.length) return null;
              return (
                <div className="nav-group" key={g} role="group" aria-label={label}>
                  <div className="nav-group-label">{label}</div>
                  {items.map((n) => (
                    <Link key={n.key} href={n.href} className={`nav-link ${active(n.href) ? 'active' : ''}`} aria-current={active(n.href) ? 'page' : undefined}>
                      <Icon name={n.key} className="nav-icon" />
                      <span>{n.label}</span>
                      {n.phase && <span className="nav-soon">{n.phase}</span>}
                    </Link>
                  ))}
                </div>
              );
            })}
          </nav>
          <div className="sidebar-foot">v0.2 · BML design system<br />Navigation reflects your server-side permissions.</div>
        </aside>
        <div className="sidebar-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />
        <div className="main">
          <header className="topbar">
            <button className="btn btn-ghost btn-icon menu-toggle" onClick={() => setNavOpen((o) => !o)} aria-expanded={navOpen} aria-controls="primary-nav" aria-label="Open navigation">
              <Icon name="menu" size={18} />
            </button>
            <span className="env-banner" title="DEV environment – synthetic data only"><Icon name="alert" size={13} /><span className="env-text">DEV · SYNTHETIC DATA ONLY</span><span className="sr-only">DEV environment</span></span>
            <div className="topbar-spacer" />
            <Dropdown kind="dialog" label="Account and display settings" trigger={
              <span className="user-chip">
                <span className="avatar" aria-hidden="true">{initials(me.displayName)}</span>
                <span className="user-meta"><strong>{me.displayName}</strong><span><RoleIds {...me.roleIds} /></span></span>
                <Icon name="chevron-down" size={14} />
              </span>}>
              {(close) => (
                <>
                  <div className="dropdown-section">
                    <div className="strong">{me.displayName}</div>
                    <div className="small muted">{me.upn}</div>
                    <div className="mt-1"><RoleIds {...me.roleIds} /></div>
                    <div className="small muted mt-1">{me.roles.map((r) => r.name).join(', ') || 'No active role'}</div>
                  </div>
                  <div className="dropdown-sep" />
                  <div className="dropdown-section">
                    <div className="dropdown-label" id="theme-label">Appearance</div>
                    <ThemeSwitch id="menu-theme" />
                  </div>
                  <div className="dropdown-sep" />
                  <button className="dropdown-item" onClick={() => { close(); signOut(); }}><Icon name="logout" size={16} /> Sign out</button>
                </>
              )}
            </Dropdown>
          </header>
          <main id="main" className="content">
            {me.hasAccess ? children : (
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
