'use client';
import { useState } from 'react';
import { RoleIds } from '@/components/AppShell';
import { DataTable } from '@/components/DataTable';
import { Async, Callout, Modal } from '@/components/ui';
import { fmtDate, fmtDateTime, labelise, useApi } from '@/lib/api';

export default function AccessManagement() {
  const users = useApi<any[]>('/admin/access');
  const [sel, setSel] = useState<any>(null);
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Administration</div>
          <h1>Access Management</h1>
          <p>Who holds which role, in which scope, until when. Role IDs follow the draft access matrix and are always shown in numeric order.</p>
        </div>
      </div>
      <div className="mb-3"><Callout tone="info">Read-only in this release. Granting and revoking with maker-checker approval (Access Approver, R16) is Sprint 2 – DR-06 / DR-44.</Callout></div>
      <div className="card">
        <Async state={users} rows={8}>
          {(rows) => (
            <DataTable caption="Users and access grants" rows={rows} rowKey={(u) => u.id} onRowClick={setSel} pageSize={20}
              searchText={(u) => `${u.name} ${u.upn} ${u.roleIds} ${u.extras.join(' ')}`} searchPlaceholder="Search people or role ID (e.g. R3)…"
              defaultSort={{ key: 'name', dir: 'asc' }}
              columns={[
                { key: 'name', header: 'User', sort: (u) => u.name, render: (u) => <><div className="cell-main">{u.name}</div><div className="cell-sub">{u.upn}</div></> },
                { key: 'roles', header: 'Roles', sort: (u) => u.roleIds, render: (u) => <RoleIds ids={u.roleIds} extras={u.extras} /> },
                { key: 'grants', header: 'Active grants', align: 'right', sort: (u) => u.activeGrants, render: (u) => <>{u.activeGrants}{u.expiredGrants > 0 && <div className="cell-sub">{u.expiredGrants} expired</div>}</> },
                { key: 'login', header: 'Last sign-in', sort: (u) => u.lastLoginAt ?? '', render: (u) => <span className="small nowrap">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'Never'}</span> },
                { key: 'type', header: 'Type', render: (u) => u.synthetic ? <span className="chip chip-warn plain">DEV persona</span> : <span className="chip chip-navy plain">Entra</span> },
              ]} />
          )}
        </Async>
      </div>
      {sel && (
        <Modal title={sel.name} description={<>{sel.upn} · <RoleIds ids={sel.roleIds} extras={sel.extras} /></>} onClose={() => setSel(null)} footer={<button className="btn" onClick={() => setSel(null)}>Close</button>}>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Role</th><th>Scope</th><th>Valid</th></tr></thead>
            <tbody>{sel.grants.map((g: any, i: number) => (
              <tr key={i}><td><div className="cell-main">{g.name}</div><div className="cell-sub mono">{g.role}</div></td>
                <td>{labelise(g.scopeType)}{g.orgUnit && <div className="cell-sub">{g.orgUnit}</div>}</td>
                <td className="nowrap">{fmtDate(g.validFrom)} – {g.validTo ? fmtDate(g.validTo) : 'open'}{!g.active && <div><span className="chip chip-bad plain">Expired</span></div>}</td></tr>
            ))}</tbody>
          </table></div>
        </Modal>
      )}
    </>
  );
}
