import { describe, it, expect } from 'vitest';
import { generate, datasetHash } from './index';

describe('synthetic generator', () => {
  const a = generate();
  it('is deterministic (same seed → same hash)', () => {
    expect(datasetHash(generate())).toBe(datasetHash(a));
    expect(datasetHash(generate({ seed: 1 }))).not.toBe(datasetHash(a));
  });
  it('produces the configured shape', () => {
    const lv = (l: string) => a.org.filter((o) => o.versions[0].level === l).length;
    expect(lv('DIVISION')).toBe(12);
    expect(lv('SECTION')).toBe(17);
    expect(lv('DEPARTMENT')).toBe(58);
    expect(a.employees).toHaveLength(1200);
    expect(new Set(a.employees.map((e) => e.grade)).size).toBe(9);
  });
  it('uses TEST- identifiers only', () => {
    for (const e of a.employees) {
      expect(e.nid.startsWith('TEST-')).toBe(true);
      if (e.passport) expect(e.passport.startsWith('TEST-')).toBe(true);
      expect(e.email.endsWith('.invalid')).toBe(true);
    }
  });
  it('position histories are contiguous and end at current placement', () => {
    for (const e of a.employees.slice(0, 200)) {
      const h = a.positions.filter((p) => p.uid === e.uid);
      for (let i = 1; i < h.length; i++) expect(h[i].from).toBe(h[i - 1].to);
      expect(h.at(-1)!.orgCode).toBe(e.orgCode);
    }
  });
  it('has an effective-dated restructure', () => {
    expect(a.org.find((o) => o.code === 'DEP040')!.versions).toHaveLength(2);
  });
  it('covers every role R1–R16 and PLATFORM_OWNER across personas', () => {
    expect(new Set(a.personas.flatMap((p) => p.grants.map((g) => g.roleCode))).size).toBe(17);
  });
  it('has the ten named primary personas in display order', () => {
    expect(a.personas.filter((p) => p.group === 'primary').map((p) => p.displayName)).toEqual(
      ['Azwa Moosa', 'Azwa Moosa Number 2', 'Maiz', 'Shai', 'Rayya', 'Humaam', 'Anj', 'Arif', 'Ish', 'Bishwajit']);
  });
});
