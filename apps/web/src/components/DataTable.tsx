'use client';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { Empty } from './ui';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Value used for sorting; omit to make the column unsortable. */
  sort?: (row: T) => string | number | null | undefined;
  align?: 'left' | 'right';
  width?: number | string;
  /** Hide on the stacked mobile card when the value is redundant. */
  hideOnMobile?: boolean;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Text the search box matches against. Omit to hide search. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyText?: ReactNode;
  caption: string;
  sticky?: boolean;
}

/**
 * Standard data-dense table: search, column sort, pagination, sticky header,
 * right-aligned numerics, stacked cards on narrow screens. One component, used everywhere.
 */
export function DataTable<T>({ columns, rows, rowKey, searchText, searchPlaceholder = 'Search…', pageSize = 15, defaultSort, onRowClick, selectedKey, toolbar, emptyTitle = 'No records', emptyText, caption, sticky = true }: Props<T>) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState(defaultSort ?? null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = needle && searchText ? rows.filter((r) => searchText(r).toLowerCase().includes(needle)) : rows.slice();
    const col = sort && columns.find((c) => c.key === sort.key);
    if (col?.sort) {
      const dir = sort!.dir === 'asc' ? 1 : -1;
      out = out.sort((a, b) => {
        const va = col.sort!(a), vb = col.sort!(b);
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        return (va > vb ? 1 : -1) * dir;
      });
    }
    return out;
  }, [rows, q, sort, columns, searchText]);

  useEffect(() => setPage(1), [q, sort, rows]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) =>
    setSort((s) => (!s || s.key !== key ? { key, dir: 'asc' } : s.dir === 'asc' ? { key, dir: 'desc' } : null));

  return (
    <div>
      {(searchText || toolbar) && (
        <div className="table-toolbar">
          {searchText && (
            <div className="search">
              <Icon name="search" />
              <input className="input" type="search" placeholder={searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${caption}`} />
            </div>
          )}
          {toolbar}
          <span className="table-count" aria-live="polite">{filtered.length.toLocaleString()} {filtered.length === 1 ? 'record' : 'records'}</span>
        </div>
      )}
      {filtered.length === 0 ? <Empty title={q ? 'No matches' : emptyTitle} icon="search">{q ? 'Try a different search term.' : emptyText}</Empty> : (
        <div className={`table-wrap ${sticky ? 'sticky' : ''}`}>
          <table className="table stack-mobile">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {columns.map((c) => {
                  const active = sort?.key === c.key;
                  return (
                    <th key={c.key} className={c.align === 'right' ? 'num' : ''} style={c.width ? { width: c.width } : undefined}
                      aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : c.sort ? 'none' : undefined} scope="col">
                      {c.sort ? (
                        <button type="button" className="th-sort" onClick={() => toggleSort(c.key)} data-active={active ? "true" : "false"}>
                          {c.header}<span className="arrow" aria-hidden="true">{active ? (sort!.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      ) : c.header}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const k = rowKey(r);
                return (
                  <tr key={k} className={`${onRowClick ? 'clickable' : ''} ${selectedKey === k ? 'selected' : ''}`}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r); } : undefined}
                    tabIndex={onRowClick ? 0 : undefined} aria-selected={selectedKey ? selectedKey === k : undefined}>
                    {columns.map((c) => <td key={c.key} data-label={c.header} className={c.align === 'right' ? 'num' : ''}>{c.render(r)}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && <Pagination page={page} pages={pages} total={filtered.length} pageSize={pageSize} onPage={setPage} />}
    </div>
  );
}

export function Pagination({ page, pages, total, pageSize, onPage }: { page: number; pages: number; total: number; pageSize: number; onPage: (p: number) => void }) {
  const from = (page - 1) * pageSize + 1, to = Math.min(total, page * pageSize);
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span>Showing {from}–{to} of {total.toLocaleString()}</span>
      <div className="pages">
        <button className="btn btn-sm btn-ghost btn-icon" onClick={() => onPage(page - 1)} disabled={page === 1} aria-label="Previous page"><Icon name="chevron-left" size={14} /></button>
        {nums.map((n, i) => (
          <span key={n} className="row" style={{ gap: 4 }}>
            {i > 0 && n - nums[i - 1] > 1 && <span aria-hidden="true">…</span>}
            <button className="btn btn-sm page-btn" aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>{n}</button>
          </span>
        ))}
        <button className="btn btn-sm btn-ghost btn-icon" onClick={() => onPage(page + 1)} disabled={page === pages} aria-label="Next page"><Icon name="chevron-right" size={14} /></button>
      </div>
    </nav>
  );
}
