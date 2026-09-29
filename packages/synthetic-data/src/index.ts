/**
 * Deterministic synthetic data generator.  SYNTHETIC – NOT REAL DATA.
 *
 * Same seed → byte-identical output (see `datasetHash`). All names are invented; identifiers use
 * TEST- prefixes so the CI PII scanner can distinguish them from real formats.
 * Organisation shape is configurable (default 12 divisions / 17 sections / 58 departments, ~1,200 staff, 9 grades)
 * – it is NOT BML's actual structure (DR-05).
 */
import { createHash } from 'node:crypto';

export const SYNTHETIC_MARKER = 'SYNTHETIC – NOT REAL DATA';

export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
    chance: (p: number) => next() < p,
  };
}

export interface OrgVersion { parentCode: string | null; level: string; name: string; from: string; to: string | null }
export interface OrgUnit { code: string; versions: OrgVersion[] }
export interface Employee {
  uid: string; fullName: string; email: string; status: 'ACTIVE' | 'SEPARATED'; joinDate: string; leaveDate: string | null;
  grade: string; positionTitle: string; orgCode: string; managerUid: string | null; nid: string; passport: string | null; salary: number;
}
export interface Position { uid: string; title: string; grade: string; orgCode: string; from: string; to: string | null; changeType: string }
export interface Persona {
  upn: string; displayName: string; roleCode: string; scopeType: 'BANK' | 'ORG_UNIT' | 'SELF' | 'NONE';
  orgCode?: string; employeeUid?: string; validTo?: string; note: string;
}
export interface SyntheticDataset {
  marker: string; seed: number;
  levels: Array<{ code: string; depth: number; label: string }>;
  org: OrgUnit[]; employees: Employee[]; positions: Position[]; personas: Persona[];
}

export interface GeneratorOptions { seed?: number; divisions?: number; sections?: number; departments?: number; employees?: number }

const DIVISIONS = ['Retail Operations', 'Corporate Services', 'Treasury & Markets', 'Risk Management', 'Technology', 'Finance',
  'People & Culture', 'Operations', 'Compliance', 'Digital Channels', 'Credit', 'Internal Assurance', 'Strategy', 'Legal'];
const DEPT_WORDS = ['Branch Network', 'Customer Service', 'Payments', 'Cards', 'Lending', 'Collections', 'Reporting', 'Controls',
  'Procurement', 'Facilities', 'Infrastructure', 'Applications', 'Data', 'Security', 'Talent', 'Learning', 'Rewards',
  'Employee Relations', 'Engagement', 'Analytics', 'Planning', 'Accounts', 'Tax', 'Liquidity', 'Trade', 'Onboarding',
  'Quality', 'Projects', 'Vendor Management', 'Regulatory'];
const FIRST = ['Aishath', 'Mariyam', 'Fathimath', 'Aminath', 'Hawwa', 'Khadheeja', 'Zeena', 'Shifa', 'Nashwa', 'Raifa',
  'Ahmed', 'Mohamed', 'Ibrahim', 'Hassan', 'Ali', 'Hussain', 'Ismail', 'Yoosuf', 'Abdulla', 'Moosa', 'Nizar', 'Shaan', 'Imran', 'Ziyad'];
const LAST = ['Rasheed', 'Naseem', 'Waheed', 'Shareef', 'Latheef', 'Zahir', 'Nazeer', 'Faisal', 'Saeed', 'Adam', 'Manik',
  'Didi', 'Riyaz', 'Shakir', 'Hameed', 'Jaleel', 'Rauf', 'Nasih', 'Thaufeeq', 'Areef'];
const GRADES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9'];
const GRADE_WEIGHTS = [0.14, 0.18, 0.18, 0.15, 0.12, 0.1, 0.07, 0.04, 0.02];
const TITLES: Record<string, string[]> = {
  G1: ['Assistant', 'Clerk'], G2: ['Officer', 'Teller'], G3: ['Senior Officer', 'Associate'],
  G4: ['Executive', 'Analyst'], G5: ['Senior Executive', 'Senior Analyst'], G6: ['Assistant Manager'],
  G7: ['Manager'], G8: ['Senior Manager', 'Head of Department'], G9: ['Division Head'],
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const RESTRUCTURE = '2026-07-01';
const ORIGIN = '2018-01-01';

export function generate(opts: GeneratorOptions = {}): SyntheticDataset {
  const seed = opts.seed ?? 20260929;
  const nDiv = opts.divisions ?? 12, nSec = opts.sections ?? 17, nDept = opts.departments ?? 58, nEmp = opts.employees ?? 1200;
  const r = rng(seed);

  const levels = [
    { code: 'BANK', depth: 0, label: 'Bank' },
    { code: 'DIVISION', depth: 1, label: 'Division' },
    { code: 'SECTION', depth: 2, label: 'Section' },
    { code: 'DEPARTMENT', depth: 3, label: 'Department' },
    { code: 'UNIT', depth: 4, label: 'Unit' },
  ];

  const org: OrgUnit[] = [{ code: 'BANK', versions: [{ parentCode: null, level: 'BANK', name: 'Synthetic Bank (SYN)', from: ORIGIN, to: null }] }];
  const divCodes: string[] = [];
  for (let i = 0; i < nDiv; i++) {
    const code = `DIV${String(i + 1).padStart(2, '0')}`;
    divCodes.push(code);
    org.push({ code, versions: [{ parentCode: 'BANK', level: 'DIVISION', name: `${DIVISIONS[i % DIVISIONS.length]} Division`, from: ORIGIN, to: null }] });
  }
  const secCodes: string[] = [];
  for (let i = 0; i < nSec; i++) {
    const code = `SEC${String(i + 1).padStart(2, '0')}`;
    const parent = divCodes[i % nDiv];
    secCodes.push(code);
    org.push({ code, versions: [{ parentCode: parent, level: 'SECTION', name: `${DEPT_WORDS[(i * 7) % DEPT_WORDS.length]} Section`, from: ORIGIN, to: null }] });
  }
  const deptCodes: string[] = [];
  for (let i = 0; i < nDept; i++) {
    const code = `DEP${String(i + 1).padStart(3, '0')}`;
    // Some departments sit under a section, others directly under a division (configurable depth).
    const parent = i < nSec * 2 ? secCodes[i % nSec] : divCodes[i % nDiv];
    deptCodes.push(code);
    org.push({ code, versions: [{ parentCode: parent, level: 'DEPARTMENT', name: `${DEPT_WORDS[i % DEPT_WORDS.length]} ${Math.floor(i / DEPT_WORDS.length) + 1}`, from: ORIGIN, to: null }] });
  }
  // Effective-dated restructure: DEP040 moves from its division to DIV01 from 2026-07-01 (proves as-of queries).
  const moved = org.find((o) => o.code === 'DEP040');
  if (moved) {
    const old = moved.versions[0];
    old.to = RESTRUCTURE;
    moved.versions.push({ ...old, parentCode: 'DIV01', from: RESTRUCTURE, to: null, name: `${old.name} (moved)` });
  }

  // ---- employees
  const pickGrade = () => {
    let x = r.next(), acc = 0;
    for (let i = 0; i < GRADES.length; i++) { acc += GRADE_WEIGHTS[i]; if (x < acc) return GRADES[i]; }
    return 'G1';
  };
  const employees: Employee[] = [];
  const positions: Position[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < nEmp; i++) {
    const uid = `S${String(10001 + i)}`;
    let fullName = `${r.pick(FIRST)} ${r.pick(LAST)}`;
    if (usedNames.has(fullName)) fullName = `${fullName} ${String.fromCharCode(65 + (i % 26))}.`;
    usedNames.add(fullName);
    const grade = pickGrade();
    const join = new Date(Date.UTC(r.int(2008, 2025), r.int(0, 11), r.int(1, 28)));
    const separated = r.chance(0.05);
    const leave = separated ? new Date(Date.UTC(2026, r.int(0, 7), r.int(1, 28))) : null;
    const dept = deptCodes[i % nDept];
    const title = r.pick(TITLES[grade]);
    const gi = GRADES.indexOf(grade);

    // position history: hire → optional transfer → optional promotion
    const hist: Position[] = [];
    let cur = { title: gi > 0 && r.chance(0.3) ? r.pick(TITLES[GRADES[gi - 1]]) : title, grade: gi > 0 ? GRADES[gi - 1] : grade, org: r.chance(0.25) ? r.pick(deptCodes) : dept };
    let from = iso(join);
    const events: Array<{ at: string; type: string; next: typeof cur }> = [];
    const span = Math.max(1, (Date.UTC(2026, 8, 1) - join.getTime()) / 86400000);
    if (cur.org !== dept) events.push({ at: iso(new Date(join.getTime() + span * 0.4 * 86400000)), type: 'TRANSFER', next: { ...cur, org: dept } });
    if (cur.grade !== grade) {
      const last = events.at(-1)?.next ?? cur;
      events.push({ at: iso(new Date(join.getTime() + span * 0.7 * 86400000)), type: 'PROMOTION', next: { ...last, grade, title } });
    }
    let type = 'HIRE';
    for (const e of events) {
      if (e.at <= from) continue;
      hist.push({ uid, title: cur.title, grade: cur.grade, orgCode: cur.org, from, to: e.at, changeType: type });
      cur = e.next; from = e.at; type = e.type;
    }
    hist.push({ uid, title: cur.title, grade: cur.grade, orgCode: cur.org, from, to: leave ? iso(leave) : null, changeType: type });
    const final = hist[hist.length - 1];
    positions.push(...hist);

    const base = [9000, 12000, 15000, 19000, 24000, 31000, 40000, 52000, 68000][GRADES.indexOf(final.grade)];
    employees.push({
      uid, fullName, email: `${uid.toLowerCase()}@synthetic.invalid`,
      status: separated ? 'SEPARATED' : 'ACTIVE', joinDate: iso(join), leaveDate: leave ? iso(leave) : null,
      grade: final.grade, positionTitle: final.title, orgCode: final.orgCode, managerUid: null,
      nid: `TEST-A${String(r.int(100000, 999999))}`,
      passport: r.chance(0.7) ? `TEST-P${String(r.int(1000000, 9999999))}` : null,
      salary: base + r.int(0, 40) * 100,
    });
  }
  // managers: highest grade active employee per department manages the others
  const byOrg = new Map<string, Employee[]>();
  employees.forEach((e) => { if (!byOrg.has(e.orgCode)) byOrg.set(e.orgCode, []); byOrg.get(e.orgCode)!.push(e); });
  for (const list of byOrg.values()) {
    const head = [...list].filter((e) => e.status === 'ACTIVE').sort((a, b) => b.grade.localeCompare(a.grade) || a.uid.localeCompare(b.uid))[0];
    list.forEach((e) => { if (head && e.uid !== head.uid) e.managerUid = head.uid; });
  }

  const deptOfDiv1 = org.find((o) => o.versions[0].level === 'DEPARTMENT' && o.versions[0].parentCode === 'DIV01')?.code ?? 'DEP013';
  const empIn = (code: string) => employees.find((e) => e.orgCode === code && e.status === 'ACTIVE')!.uid;

  const personas: Persona[] = [
    { upn: 'analytics.admin@dev.synthetic.local', displayName: 'Nashwa Latheef', roleCode: 'HR_ANALYTICS_ADMIN', scopeType: 'BANK', note: 'R1 · HR Analytics Admin' },
    { upn: 'er.officer@dev.synthetic.local', displayName: 'Raifa Shareef', roleCode: 'ER_OFFICER', scopeType: 'BANK', note: 'R2 · ER Officer (on case team)' },
    { upn: 'er.officer2@dev.synthetic.local', displayName: 'Imran Hameed', roleCode: 'ER_OFFICER', scopeType: 'BANK', note: 'R2 · ER Officer (not on case team – negative tests)' },
    { upn: 'er.manager@dev.synthetic.local', displayName: 'Khadheeja Waheed', roleCode: 'ER_MANAGER', scopeType: 'BANK', note: 'R3 · ER Manager (portfolio)' },
    { upn: 'engagement.hr@dev.synthetic.local', displayName: 'Zeena Naseem', roleCode: 'ENGAGEMENT_HR', scopeType: 'BANK', note: 'R4 · Engagement HR' },
    { upn: 'hr.leadership@dev.synthetic.local', displayName: 'Ibrahim Zahir', roleCode: 'HR_LEADERSHIP', scopeType: 'BANK', note: 'R5 · HR Leadership' },
    { upn: 'division.head@dev.synthetic.local', displayName: 'Hussain Faisal', roleCode: 'DIVISION_HEAD', scopeType: 'ORG_UNIT', orgCode: 'DIV01', note: 'R6 · Division Head (DIV01)' },
    { upn: 'division.head.expired@dev.synthetic.local', displayName: 'Ali Riyaz', roleCode: 'DIVISION_HEAD', scopeType: 'ORG_UNIT', orgCode: 'DIV02', validTo: '2026-01-01', note: 'R6 · Division Head – EXPIRED grant (edge)' },
    { upn: 'department.head@dev.synthetic.local', displayName: 'Mariyam Saeed', roleCode: 'DEPARTMENT_HEAD', scopeType: 'ORG_UNIT', orgCode: deptOfDiv1, note: `R7 · Department Head (${deptOfDiv1})` },
    { upn: 'manager@dev.synthetic.local', displayName: 'Yoosuf Adam', roleCode: 'MANAGER', scopeType: 'SELF', employeeUid: empIn('DEP005'), note: 'R8 · Manager' },
    { upn: 'employee@dev.synthetic.local', displayName: 'Hawwa Nazeer', roleCode: 'EMPLOYEE', scopeType: 'SELF', employeeUid: empIn('DEP006'), note: 'R9 · Employee' },
    { upn: 'document.hr@dev.synthetic.local', displayName: 'Shifa Rauf', roleCode: 'DOCUMENT_HR', scopeType: 'BANK', note: 'R10 · Document HR (may reveal restricted fields)' },
    { upn: 'document.approver@dev.synthetic.local', displayName: 'Hassan Jaleel', roleCode: 'DOCUMENT_APPROVER', scopeType: 'BANK', note: 'R11 · Document Approver' },
    { upn: 'platform.admin@dev.synthetic.local', displayName: 'Shaan Manik', roleCode: 'PLATFORM_ADMIN', scopeType: 'NONE', note: 'R12 · Platform Admin (no business data)' },
    { upn: 'voice.triage@dev.synthetic.local', displayName: 'Aminath Thaufeeq', roleCode: 'VOICE_TRIAGE', scopeType: 'NONE', note: 'R13 · Voice Triage (proposed)' },
    { upn: 'audit.reviewer@dev.synthetic.local', displayName: 'Moosa Areef', roleCode: 'AUDIT_REVIEWER', scopeType: 'NONE', note: 'R14 · Audit Reviewer (proposed)' },
    { upn: 'fwt.coordinator@dev.synthetic.local', displayName: 'Fathimath Nasih', roleCode: 'FWT_COORDINATOR', scopeType: 'ORG_UNIT', orgCode: 'DIV03', note: 'R15 · FwT Coordinator (proposed)' },
    { upn: 'access.approver@dev.synthetic.local', displayName: 'Ziyad Shakir', roleCode: 'ACCESS_APPROVER', scopeType: 'NONE', note: 'R16 · Access Approver (proposed)' },
  ];

  return { marker: SYNTHETIC_MARKER, seed, levels, org, employees, positions, personas };
}

export function datasetHash(ds: SyntheticDataset): string {
  return createHash('sha256').update(JSON.stringify(ds)).digest('hex');
}
