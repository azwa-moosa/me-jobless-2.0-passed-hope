'use client';
import { useMemo, useState } from 'react';
import { Async, Callout } from '@/components/ui';
import { useApi } from '@/lib/api';

interface Unit { id: string; code: string; name: string; level: string; parent_id: string | null; effective_from: string }

export default function OrgBrowser() {
  const today = new Date().toISOString().slice(0, 10);
  const [asOf, setAsOf] = useState(today);
  const tree = useApi<any>(`/org-units/tree?asOf=${asOf}`);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Organisation</h1>
          <p>Effective-dated hierarchy with configurable levels. Pick any date to see the structure as it was – scope checks use the tree as of today.</p>
        </div>
        <div className="row">
          <label htmlFor="asof" className="small strong">As of</label>
          <input id="asof" type="date" className="input" style={{ width: 170 }} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          <button className="btn btn-sm" onClick={() => setAsOf('2026-06-30')}>Before restructure</button>
          <button className="btn btn-sm" onClick={() => setAsOf(today)}>Today</button>
        </div>
      </div>
      <div className="mb-3"><Callout tone="warn">Synthetic structure (12 divisions / 17 sections / 58 departments) – not BML's real hierarchy. The real source and levels are pending DR-05. Try the dates around 1 July 2026 to see a department move between divisions.</Callout></div>
      <Async state={tree} rows={10}>
        {(d) => <TreeView units={d.units} levels={d.levels} />}
      </Async>
    </>
  );
}

function TreeView({ units, levels }: { units: Unit[]; levels: any[] }) {
  const children = useMemo(() => {
    const m = new Map<string | null, Unit[]>();
    units.forEach((u) => m.set(u.parent_id, [...(m.get(u.parent_id) ?? []), u]));
    return m;
  }, [units]);
  const [open, setOpen] = useState<Set<string>>(() => new Set(units.filter((u) => u.level === 'BANK').map((u) => u.id)));
  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const counts = levels.map((l) => ({ ...l, n: units.filter((u) => u.level === l.code).length })).filter((l) => l.n);

  const Node = ({ u }: { u: Unit }) => {
    const kids = children.get(u.id) ?? [];
    return (
      <li>
        <span className="tree-node">
          {kids.length ? <button className="tree-toggle" onClick={() => toggle(u.id)} aria-label={open.has(u.id) ? 'Collapse' : 'Expand'}>{open.has(u.id) ? '▾' : '▸'}</button> : <span style={{ width: 18 }} />}
          <span className={`lvl ${u.level}`}>{u.level}</span>
          <span className="strong">{u.name}</span>
          <span className="mono small muted">{u.code}</span>
          {kids.length > 0 && <span className="small muted">({kids.length})</span>}
        </span>
        {kids.length > 0 && open.has(u.id) && <ul>{kids.map((k) => <Node key={k.id} u={k} />)}</ul>}
      </li>
    );
  };

  return (
    <div className="grid grid-main-side">
      <div className="card"><div className="card-body"><ul className="tree">{(children.get(null) ?? []).map((u) => <Node key={u.id} u={u} />)}</ul></div></div>
      <div className="card">
        <div className="card-head"><h3>Levels</h3><span className="hint">Configurable</span></div>
        <div className="card-body flush"><table className="table"><tbody>{counts.map((l) => <tr key={l.code}><td><span className={`lvl ${l.code}`}>{l.code}</span></td><td>{l.label}</td><td className="right strong">{l.n}</td></tr>)}</tbody></table></div>
        <div className="card-foot"><button className="btn btn-sm" onClick={() => setOpen(new Set(units.map((u) => u.id)))}>Expand all</button></div>
      </div>
    </div>
  );
}
