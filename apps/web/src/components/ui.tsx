'use client';
import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiError, labelise } from '@/lib/api';
import { Icon } from './Icon';

// ------------------------------------------------------------------ states (PLT-005)
export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card-body stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ width: `${90 - i * 12}%` }} />)}
    </div>
  );
}

export function Empty({ title, children, icon = 'inbox' }: { title: string; children?: ReactNode; icon?: string }) {
  return (
    <div className="state">
      <div className="state-icon"><Icon name={icon} /></div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function PermissionDenied({ detail, correlationId }: { detail?: string; correlationId?: string }) {
  return (
    <div className="state denied" role="alert">
      <div className="state-icon"><Icon name="lock" /></div>
      <h3>You don't have access to this</h3>
      <p>{(detail ?? 'Your role or organisational scope does not include this record.').replace(/\.?$/, '.')} This attempt has been recorded in the audit log.</p>
      {correlationId && <p className="small">Reference <span className="corr">{correlationId}</span></p>}
      <Link href="/" className="btn mt-2">Back to Home</Link>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  if (error.status === 403) return <PermissionDenied detail={error.problem.detail} correlationId={error.problem.correlationId} />;
  if (error.status === 404) return <Empty title="Not found" icon="search">{error.problem.detail ?? 'This record does not exist.'}</Empty>;
  return (
    <div className="state error" role="alert">
      <div className="state-icon"><Icon name="alert" /></div>
      <h3>{error.problem.title || 'Something went wrong'}</h3>
      <p>{error.problem.detail ?? 'Please try again.'}</p>
      {error.problem.correlationId && <p className="small">Quote this reference to support: <span className="corr">{error.problem.correlationId}</span></p>}
      {onRetry && <button className="btn mt-2" onClick={onRetry}>Try again</button>}
    </div>
  );
}

/** Renders loading / error / content consistently. */
export function Async<T>({ state, children, rows }: { state: { data: T | null; error: ApiError | null; loading: boolean; reload: () => void }; children: (d: T) => ReactNode; rows?: number }) {
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (state.loading && !state.data) return <Loading rows={rows} />;
  if (!state.data) return null;
  return <>{children(state.data)}</>;
}

// ------------------------------------------------------------------ chips
const STATUS_TONE: Record<string, string> = {
  OPEN: 'chip-info', IN_PROGRESS: 'chip-navy', BLOCKED: 'chip-warn', COMPLETED: 'chip-ok', CANCELLED: 'chip-muted',
  INTAKE: 'chip-info', ASSESSMENT: 'chip-navy', INVESTIGATION: 'chip-violet', OUTCOME_PENDING: 'chip-warn', ON_HOLD: 'chip-muted', CLOSED: 'chip-ok',
};
export const StatusChip = ({ code, label }: { code: string; label?: string }) => <span className={`chip ${STATUS_TONE[code] ?? ''}`}>{label ?? labelise(code)}</span>;

const PRIORITY_TONE: Record<string, string> = { URGENT: 'chip-bad', HIGH: 'chip-bad', MEDIUM: 'chip-warn', LOW: 'chip-muted' };
export const PriorityChip = ({ code }: { code: string }) => <span className={`chip plain ${PRIORITY_TONE[code] ?? ''}`}>{labelise(code)}</span>;

const CONF_TONE: Record<string, string> = { RESTRICTED: 'chip-bad', HIGH: 'chip-warn', STANDARD: 'chip-muted' };
export const ConfChip = ({ code }: { code: string }) => <span className={`chip plain ${CONF_TONE[code] ?? ''}`}><Icon name="lock" size={11} /> {labelise(code)}</span>;

export const SampleTag = ({ children = 'Sample config' }: { children?: ReactNode }) => <span className="tag" title="Placeholder pending a BML decision – not BML policy">{children}</span>;

export function Callout({ tone = 'info', children, icon }: { tone?: 'info' | 'warn' | 'bad' | 'ok'; children: ReactNode; icon?: string }) {
  return <div className={`callout callout-${tone}`}><Icon name={icon ?? (tone === 'info' ? 'info' : tone === 'ok' ? 'check' : 'alert')} /><div>{children}</div></div>;
}

// ------------------------------------------------------------------ modal & toast
export function Modal({ title, description, children, onClose, footer }: { title: string; description?: ReactNode; children?: ReactNode; onClose: () => void; footer: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head"><h3 id="modal-title">{title}</h3>{description && <p>{description}</p>}</div>
        {children && <div className="modal-body">{children}</div>}
        <div className="modal-foot">{footer}</div>
      </div>
    </div>
  );
}

let pushToast: ((t: { text: string; bad?: boolean }) => void) | null = null;
export const toast = (text: string, bad = false) => pushToast?.({ text, bad });
export function Toaster() {
  const [t, setT] = useState<{ text: string; bad?: boolean } | null>(null);
  useEffect(() => {
    pushToast = (x) => { setT(x); setTimeout(() => setT(null), 3800); };
    return () => { pushToast = null; };
  }, []);
  return t ? <div className={`toast ${t.bad ? 'bad' : ''}`} role="status">{t.text}</div> : null;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: Array<{ key: T; label: string; count?: number | null; bad?: boolean }>; value: T; onChange: (k: T) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} className={`tab ${value === t.key ? 'active' : ''}`} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count !== undefined && t.count !== null && <span className={`count ${t.bad && t.count > 0 && value !== t.key ? 'bad' : ''}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
