'use client';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { THEME_KEY, ThemePref } from '@/lib/theme';

interface ThemeState { pref: ThemePref; resolved: 'light' | 'dark'; setPref: (p: ThemePref) => void }
const Ctx = createContext<ThemeState | null>(null);

const media = () => window.matchMedia('(prefers-color-scheme: dark)');
const resolve = (p: ThemePref): 'light' | 'dark' => (p === 'system' ? (media().matches ? 'dark' : 'light') : p);

function apply(p: ThemePref) {
  const t = resolve(p);
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-theme-pref', p);
  return t;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initial values are read from the attributes the bootstrap script already set (no mismatch, no flash).
  const [pref, setPrefState] = useState<ThemePref>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const p = (document.documentElement.getAttribute('data-theme-pref') as ThemePref) || 'system';
    setPrefState(p);
    setResolved((document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light');
  }, []);

  // "System" follows OS changes live.
  useEffect(() => {
    if (pref !== 'system') return;
    const mq = media();
    const onChange = () => setResolved(apply('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return;
      const p = (e.newValue as ThemePref) || 'system';
      setPrefState(p); setResolved(apply(p));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    try { localStorage.setItem(THEME_KEY, p); } catch { /* private mode: still applies for this page */ }
    setPrefState(p);
    setResolved(apply(p));
  }, []);

  return <Ctx.Provider value={{ pref, resolved, setPref }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useTheme outside ThemeProvider');
  return c;
}
