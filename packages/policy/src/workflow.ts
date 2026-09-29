/**
 * Generic, configuration-driven state machine (ACT-005, ER-005).
 * Definitions live in config.state_machine; the ER one is a SAMPLE pending DR-15.
 */
export interface Transition {
  from: string[];
  to: string;
  permission: string;
  requiresReason?: boolean;
  label?: string;
}
export interface StateMachineDef {
  initial: string;
  states: Array<{ code: string; label: string; terminal?: boolean }>;
  transitions: Transition[];
}

export type TransitionCheck =
  | { ok: true; transition: Transition }
  | { ok: false; status: 403 | 409 | 422; reason: string };

export function checkTransition(
  def: StateMachineDef,
  from: string,
  to: string,
  hasPermission: (p: string) => boolean,
  reason?: string,
): TransitionCheck {
  const t = def.transitions.find((x) => x.to === to && x.from.includes(from));
  if (!t) return { ok: false, status: 409, reason: `Transition ${from} → ${to} is not allowed` };
  if (!hasPermission(t.permission)) return { ok: false, status: 403, reason: `Requires ${t.permission}` };
  if (t.requiresReason && !reason?.trim()) return { ok: false, status: 422, reason: 'A reason is required for this transition' };
  return { ok: true, transition: t };
}

export function availableTransitions(def: StateMachineDef, from: string, hasPermission: (p: string) => boolean): Transition[] {
  return def.transitions.filter((t) => t.from.includes(from) && hasPermission(t.permission));
}

export function isTerminal(def: StateMachineDef, state: string): boolean {
  return !!def.states.find((s) => s.code === state)?.terminal;
}

// ------------------------------------------------------------------ business calendar (CFG-002)
/**
 * Add N business days using a configured working week (ISO weekdays 1=Mon..7=Sun) and holiday list.
 * No weekend is hard-coded here – the calendar comes from configuration (DR-35).
 */
export function addBusinessDays(start: Date, days: number, workingDays: number[], holidays: string[] = []): Date {
  const hol = new Set(holidays);
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
    if (workingDays.includes(iso) && !hol.has(d.toISOString().slice(0, 10))) added++;
  }
  return d;
}

// ------------------------------------------------------------------ reference sequences (CFG-003)
export function formatSequence(format: string, value: number, now: Date): string {
  return format
    .replace('{YYYY}', String(now.getUTCFullYear()))
    .replace(/\{SEQ:(\d+)\}/, (_, n) => String(value).padStart(Number(n), '0'));
}

export function periodKey(resetPolicy: string, now: Date): string {
  return resetPolicy === 'YEARLY' ? String(now.getUTCFullYear()) : 'ALL';
}
