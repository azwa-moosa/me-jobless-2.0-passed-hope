'use client';
import { Async, Callout, toast } from '@/components/ui';
import { api, ApiError, fmtDateTime, useApi } from '@/lib/api';

export default function Flags() {
  const flags = useApi<any[]>('/admin/feature-flags');
  async function set(key: string, enabled: boolean) {
    try { await api(`/admin/feature-flags/${key}`, { method: 'PATCH', body: { enabled } }); toast(`${key} ${enabled ? 'enabled' : 'disabled'} (audited)`); flags.reload(); }
    catch (e) { toast((e as ApiError).problem.detail ?? 'Failed', true); }
  }
  return (
    <>
      <div className="page-head"><div><h1>Feature flags</h1><p>Per-environment switches for incremental release. Every change is audited. Some flags are locked behind a BML decision.</p></div></div>
      <div className="mb-3"><Callout tone="info">Platform Administrators manage technical switches only and have no access to employee, ER or Voice data.</Callout></div>
      <div className="card">
        <Async state={flags} rows={5}>{(rows) => (
          <div className="card-body flush"><table className="table"><thead><tr><th>Flag</th><th>Description</th><th>Updated</th><th className="right">State</th></tr></thead><tbody>
            {rows.map((f) => (
              <tr key={f.key}>
                <td className="mono small strong">{f.key}</td><td>{f.description}</td><td className="small muted">{fmtDateTime(f.updated_at)}</td>
                <td className="right"><button className={`btn btn-sm ${f.enabled ? 'btn-primary' : ''}`} onClick={() => set(f.key, !f.enabled)} aria-pressed={f.enabled}>{f.enabled ? 'On' : 'Off'}</button></td>
              </tr>))}
          </tbody></table></div>)}</Async>
      </div>
    </>
  );
}
