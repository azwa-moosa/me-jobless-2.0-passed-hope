'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type U = { id: string; display_name: string; upn?: string; roles?: string };

export function UserPicker({ value, onChange, permission }: { value: U | null; onChange: (u: U | null) => void; permission?: string }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<U[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      api<U[]>(`/directory/users?q=${encodeURIComponent(q)}${permission ? `&permission=${permission}` : ''}`).then(setItems).catch(() => setItems([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q, permission]);
  return (
    <div className="stack" style={{ gap: 8 }}>
      <input className="input" placeholder="Search people…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" />
      <select className="select" value={value?.id ?? ''} onChange={(e) => onChange(items.find((i) => i.id === e.target.value) ?? null)} aria-label="Select person">
        <option value="">Select…</option>
        {items.map((u) => <option key={u.id} value={u.id}>{u.display_name}{u.roles ? ` — ${u.roles}` : ''}</option>)}
      </select>
    </div>
  );
}
