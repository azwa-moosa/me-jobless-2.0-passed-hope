'use client';
import { useState } from 'react';
import { HBarChart, LineChart } from '@/components/Charts';
import { DataTable } from '@/components/DataTable';
import { Icon } from '@/components/Icon';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { Callout, ConfChip, Dropdown, Empty, ErrorState, FileUpload, Loading, MaskedField, Modal, PermissionDenied, PriorityChip, SampleTag, SensitivityBanner, StatusChip, Tabs, toast, Tooltip } from '@/components/ui';
import { ApiError } from '@/lib/api';

const TOKENS = [
  ['--bml-navy', 'BML navy'], ['--bml-blue', 'BML blue'], ['--bml-cyan', 'BML cyan'], ['--bml-red', 'BML red'],
  ['--background', 'Background'], ['--surface', 'Surface'], ['--surface-secondary', 'Surface 2'], ['--foreground', 'Foreground'],
  ['--foreground-muted', 'Muted text'], ['--border', 'Border'], ['--primary', 'Primary'], ['--brand-red', 'Brand red'],
  ['--success', 'Success'], ['--warning', 'Warning'], ['--danger', 'Danger'], ['--info', 'Info'],
  ['--chart-1', 'Chart 1'], ['--chart-2', 'Chart 2'], ['--chart-3', 'Chart 3'], ['--chart-4', 'Chart 4'], ['--chart-5', 'Chart 5'],
];
const ROWS = Array.from({ length: 23 }, (_, i) => ({ id: `ER-2026-${String(i + 1).padStart(4, '0')}`, owner: ['Rayya', 'Humaam', 'Shai'][i % 3], days: (i * 7) % 41, status: ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'][i % 4] }));

export default function DesignSystem() {
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
  const [modal, setModal] = useState(false);
  const [revealed, setRevealed] = useState<string | undefined>();
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Administration</div>
          <h1>Design System</h1>
          <p>Every component the platform uses, rendered from the central BML tokens. Switch theme to check both modes on one page.</p>
        </div>
        <ThemeSwitch id="ds-theme" />
      </div>

      <section className="card mb-3" aria-labelledby="ds-tokens">
        <div className="card-head"><h3 id="ds-tokens">Tokens</h3><span className="hint">styles/tokens.css – change once, applies everywhere</span></div>
        <div className="card-body swatch-grid">
          {TOKENS.map(([v, l]) => <div key={v} className="swatch"><div className="chip-color" style={{ background: `var(${v})` }} /><div>{l}<br />{v}</div></div>)}
        </div>
      </section>

      <div className="grid grid-2 mb-3">
        <section className="card" aria-labelledby="ds-buttons">
          <div className="card-head"><h3 id="ds-buttons">Buttons</h3></div>
          <div className="card-body stack">
            <div className="row">
              <button className="btn btn-primary">Primary</button><button className="btn btn-secondary">Secondary</button>
              <button className="btn btn-outline">Outline</button><button className="btn btn-ghost">Ghost</button>
              <button className="btn btn-danger">Danger</button><button className="btn btn-brand">Brand</button>
            </div>
            <div className="row">
              <button className="btn btn-primary btn-sm"><Icon name="plus" size={14} /> Small</button><button className="btn btn-sm" disabled>Disabled</button>
              <Tooltip label="Tooltips appear on hover and keyboard focus"><button className="btn btn-sm btn-ghost btn-icon" aria-label="Help"><Icon name="info" size={15} /></button></Tooltip>
              <Dropdown label="Row actions" align="left" trigger={<span className="btn btn-sm">Actions <Icon name="chevron-down" size={14} /></span>}>
                {(close) => <>
                  <button className="dropdown-item" role="menuitem" onClick={() => { close(); toast('Assigned'); }}>Assign</button>
                  <button className="dropdown-item" role="menuitem" onClick={() => { close(); toast('Exported'); }}>Export</button>
                </>}
              </Dropdown>
              <button className="btn btn-sm btn-outline" onClick={() => setModal(true)}>Open dialog</button>
            </div>
            <Tabs value={tab} onChange={setTab} tabs={[{ key: 'a', label: 'Overview' }, { key: 'b', label: 'Overdue', count: 3, bad: true }, { key: 'c', label: 'Completed', count: 12 }]} />
          </div>
        </section>
        <section className="card" aria-labelledby="ds-status">
          <div className="card-head"><h3 id="ds-status">Status &amp; sensitivity</h3></div>
          <div className="card-body stack">
            <div className="row"><StatusChip code="OPEN" /><StatusChip code="IN_PROGRESS" /><StatusChip code="BLOCKED" /><StatusChip code="COMPLETED" /><StatusChip code="INVESTIGATION" /></div>
            <div className="row"><PriorityChip code="URGENT" /><PriorityChip code="MEDIUM" /><PriorityChip code="LOW" /><ConfChip code="RESTRICTED" /><SampleTag /><span className="chip chip-brand plain">Brand</span></div>
            <div className="dl" style={{ gridTemplateColumns: '90px 1fr' }}>
              <span className="muted">Salary</span><MaskedField label="Salary" canReveal value={revealed} onReveal={() => setRevealed('MVR 12,800.00')} />
              <span className="muted">NID</span><MaskedField label="NID" canReveal={false} onReveal={() => undefined} />
            </div>
            <SensitivityBanner><strong>Confidential ER record.</strong> Calm, clear marker – not an alarm.</SensitivityBanner>
            <Callout tone="info">Information callout</Callout>
            <Callout tone="ok">Success callout</Callout>
            <Callout tone="warn">Warning callout</Callout>
            <Callout tone="bad">Error callout – always paired with an icon and text, never colour alone.</Callout>
          </div>
        </section>
      </div>

      <section className="card mb-3" aria-labelledby="ds-forms">
        <div className="card-head"><h3 id="ds-forms">Forms</h3></div>
        <div className="card-body form-grid">
          <div className="field"><label htmlFor="ds-in">Text input</label><input id="ds-in" className="input" placeholder="Placeholder" /></div>
          <div className="field"><label htmlFor="ds-sel">Select</label><select id="ds-sel" className="select"><option>Grievance</option><option>Disciplinary</option></select></div>
          <div className="field"><label htmlFor="ds-date">Date</label><input id="ds-date" type="date" className="input" defaultValue="2026-09-30" /></div>
          <div className="field"><label htmlFor="ds-err">With error <span className="req">*</span></label><input id="ds-err" className="input" aria-invalid="true" aria-describedby="ds-err-msg" defaultValue="ER-26" />
            <span className="error-text" id="ds-err-msg"><Icon name="alert" size={12} /> Reference must look like ER-2026-0001</span></div>
          <div className="field span-2"><label htmlFor="ds-ta">Textarea</label><textarea id="ds-ta" className="textarea" placeholder="Facts as reported…" /></div>
          <div className="field"><div className="search"><Icon name="search" /><input className="input" type="search" placeholder="Search…" aria-label="Search example" /></div></div>
          <label className="row small"><input type="checkbox" defaultChecked /> Mandatory before closure</label>
          <div className="span-2"><FileUpload label="Upload evidence" hint="PDF, DOCX, max 20 MB (DR-39)" /></div>
        </div>
      </section>

      <section className="card mb-3" aria-labelledby="ds-table">
        <div className="card-head"><h3 id="ds-table">Data table</h3><span className="hint">Search · sort · paginate · sticky header · stacked on mobile</span></div>
        <DataTable caption="Sample table" rows={ROWS} rowKey={(r) => r.id} pageSize={8} searchText={(r) => `${r.id} ${r.owner}`}
          columns={[
            { key: 'id', header: 'Reference', sort: (r) => r.id, render: (r) => <span className="mono cell-main">{r.id}</span> },
            { key: 'owner', header: 'Owner', sort: (r) => r.owner, render: (r) => r.owner },
            { key: 'status', header: 'Status', sort: (r) => r.status, render: (r) => <StatusChip code={r.status} /> },
            { key: 'days', header: 'Age (days)', align: 'right', sort: (r) => r.days, render: (r) => r.days },
          ]} />
      </section>

      <div className="grid grid-2 mb-3">
        <section className="card" aria-labelledby="ds-chart1"><div className="card-head"><h3 id="ds-chart1">Bars</h3></div>
          <div className="card-body"><HBarChart title="Sample distribution" data={[{ label: 'Retail Operations', value: 136 }, { label: 'Technology', value: 113 }, { label: 'Legal', value: null }, { label: 'Finance', value: 74 }]} /></div></section>
        <section className="card" aria-labelledby="ds-chart2"><div className="card-head"><h3 id="ds-chart2">Lines (categorical order)</h3></div>
          <div className="card-body"><LineChart title="Sample series" periods={['Q1', 'Q2', 'Q3', 'Q4']} unit="%" min={0} max={100}
            series={[1, 2, 3, 4, 5].map((s) => ({ name: `Series ${s}`, slot: s, values: [20 + s * 10, 25 + s * 11, 22 + s * 12, 30 + s * 11] }))} /></div></section>
      </div>

      <div className="grid grid-2">
        <section className="card"><div className="card-head"><h3>Empty &amp; loading</h3></div><Empty title="No actions here">New tasks will appear here.</Empty><Loading rows={3} /></section>
        <section className="card"><div className="card-head"><h3>Error &amp; access denied</h3></div>
          <ErrorState error={new ApiError({ status: 500, title: 'Something went wrong', detail: 'Sample error', correlationId: '00000000-0000-0000-0000-000000000000' })} />
          <PermissionDenied detail="Sample access-denied state." /></section>
      </div>

      {modal && (
        <Modal title="Confirm status change" description="Dialogs use surface tokens and trap attention; Escape closes." onClose={() => setModal(false)}
          footer={<><button className="btn" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={() => { setModal(false); toast('Confirmed'); }}>Confirm</button></>}>
          <div className="field"><label htmlFor="ds-reason">Reason <span className="req">*</span></label><textarea id="ds-reason" className="textarea" /></div>
        </Modal>
      )}
    </>
  );
}
