'use client';
import { ThemePref } from '@/lib/theme';
import { Icon } from './Icon';
import { useTheme } from './ThemeProvider';

const OPTIONS: Array<{ value: ThemePref; label: string; icon: string }> = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'monitor' },
];

/** Light / Dark / System. Radio-group semantics with arrow-key support. */
export function ThemeSwitch({ id = 'theme' }: { id?: string }) {
  const { pref, setPref } = useTheme();
  const move = (dir: number) => {
    const i = OPTIONS.findIndex((o) => o.value === pref);
    const next = OPTIONS[(i + dir + OPTIONS.length) % OPTIONS.length];
    setPref(next.value);
    document.getElementById(`${id}-${next.value}`)?.focus();
  };
  return (
    <div className="segmented" role="radiogroup" aria-label="Colour theme"
      onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(1); } if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); } }}>
      {OPTIONS.map((o) => (
        <button key={o.value} id={`${id}-${o.value}`} type="button" role="radio" aria-checked={pref === o.value} tabIndex={pref === o.value ? 0 : -1}
          onClick={() => setPref(o.value)} data-theme-option={o.value}>
          <Icon name={o.icon} size={13} /> {o.label}
        </button>
      ))}
    </div>
  );
}
