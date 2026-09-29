'use client';
import { useSession } from './AppShell';
import { Icon } from './Icon';
import { Callout, PermissionDenied } from './ui';

export interface ModuleInfo { key: string; title: string; purpose: string; phase: string; blockers: string[]; features: string[] }

export function ModulePlaceholder({ m }: { m: ModuleInfo }) {
  const { navigation } = useSession();
  if (!navigation.some((n) => n.key === m.key)) return <div className="card"><PermissionDenied detail={`${m.title} is not part of your role.`} /></div>;
  return (
    <>
      <div className="page-head"><div><h1>{m.title}</h1><p>{m.purpose}</p></div><span className="chip chip-muted plain">{m.phase}</span></div>
      <div className="grid grid-2">
        <div className="card">
          <div className="state"><div className="state-icon"><Icon name={m.key} /></div><h3>Not yet available</h3>
            <p>This module is scheduled for {m.phase}. Your role already has access, so it will appear here automatically when released.</p></div>
        </div>
        <div className="stack">
          <div className="card"><div className="card-head"><h3>Planned scope</h3></div>
            <div className="card-body"><ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>{m.features.map((f) => <li key={f}>{f}</li>)}</ul></div></div>
          <Callout tone="warn">Waiting on BML decisions: <strong>{m.blockers.join(', ')}</strong> (see the decisions register).</Callout>
        </div>
      </div>
    </>
  );
}
