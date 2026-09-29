'use client';
import { useCallback, useEffect, useState } from 'react';

export interface Problem {
  status: number;
  title: string;
  detail?: string;
  correlationId?: string;
  [k: string]: unknown;
}

export class ApiError extends Error {
  constructor(public problem: Problem) { super(problem.detail ?? problem.title); }
  get status() { return this.problem.status; }
}

/** All calls go through the same-origin BFF (/api/*). The session cookie is httpOnly. */
export async function api<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-requested-with': 'bml-web' },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = `/sign-in?next=${encodeURIComponent(window.location.pathname)}`;
    throw new ApiError({ status: 401, title: 'Signed out' });
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError({ status: res.status, title: json?.title ?? res.statusText, ...json, correlationId: json?.correlationId ?? res.headers.get('x-correlation-id') ?? undefined });
  return json as T;
}

export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try { setData(await api<T>(path)); setError(null); }
    catch (e) { setError(e instanceof ApiError ? e : new ApiError({ status: 0, title: 'Network error', detail: String(e) })); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}

// ------------------------------------------------------------------ formatting (display in Maldives time, AS-02)
const TZ = 'Indian/Maldives';
export const fmtDate = (v?: string | null) => v ? new Date(v).toLocaleDateString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (v?: string | null) => v ? new Date(v).toLocaleString('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
export function relDue(v?: string | null): { text: string; tone: '' | 'overdue' | 'soon' } {
  if (!v) return { text: 'No due date', tone: '' };
  const days = Math.round((new Date(v).getTime() - Date.now()) / 86400000);
  if (days < 0) return { text: `${Math.abs(days) || 1}d overdue`, tone: 'overdue' };
  if (days === 0) return { text: 'Due today', tone: 'soon' };
  if (days <= 3) return { text: `Due in ${days}d`, tone: 'soon' };
  return { text: `Due ${fmtDate(v)}`, tone: '' };
}
export const initials = (name?: string) => (name ?? '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const MODULES: Record<string, string> = { er: 'ER Case Management', platform: 'Platform', actions: 'Action Centre', analytics: 'People Analytics', engagement: 'Engagement', voice: 'Employee Voice', manager: 'People Manager', studio: 'Document Studio' };
export const moduleLabel = (m?: string) => (m && MODULES[m]) ?? labelise(m);
export const labelise = (code?: string | null) => code ? code.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : '—';
