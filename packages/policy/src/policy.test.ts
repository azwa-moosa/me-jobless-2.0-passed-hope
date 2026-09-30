import { describe, expect, it } from 'vitest';
import {
  ROLES, PERMISSIONS, SecurityContext, can, canInOrg, canSeeCase, maskRestricted, navigationFor,
  auditModulesFor, checkTransition, formatRoleIds, availableTransitions, addBusinessDays, formatSequence, StateMachineDef,
} from './index';

function ctxFor(roleCodes: string[], scope: Partial<SecurityContext['scope']> = {}): SecurityContext {
  const perms = new Set<string>();
  roleCodes.forEach((c) => ROLES.find((r) => r.code === c)!.permissions.forEach((p) => perms.add(p)));
  return {
    userId: 'u1', upn: 'u1@test', displayName: 'Test', employeeUid: null, roles: roleCodes, permissions: perms,
    scope: { bank: scope.bank ?? false, orgUnitIds: scope.orgUnitIds ?? new Set() },
    auditModules: auditModulesFor(roleCodes),
  };
}

describe('catalogue', () => {
  it('defines 16 numbered roles R1–R16 plus supplementary roles, all unique', () => {
    expect(ROLES.filter((r) => /^R\d+$/.test(r.ref))).toHaveLength(16);
    expect(new Set(ROLES.map((r) => r.code)).size).toBe(ROLES.length);
  });
  it('formats role IDs in numeric order with supplementary roles appended', () => {
    const f = formatRoleIds(['ACCESS_APPROVER', 'DOCUMENT_APPROVER', 'DOCUMENT_HR', 'ENGAGEMENT_HR', 'FWT_COORDINATOR', 'HR_ANALYTICS_ADMIN', 'VOICE_TRIAGE', 'AUDIT_REVIEWER', 'PLATFORM_OWNER']);
    expect(f.ids).toBe('R1 · R4 · R10 · R11 · R13 · R14 · R15 · R16');
    expect(f.extras).toEqual(['PLATFORM_OWNER']);
  });
  it('Platform Owner cannot read ER cases or reveal restricted fields', () => {
    const o = ctxFor(['PLATFORM_OWNER']);
    expect(can(o, 'er.case.read')).toBe(false);
    expect(can(o, 'employee.salary.reveal')).toBe(false);
    expect(can(o, 'audit.verify')).toBe(true);
  });
  it('permission codes are unique', () => {
    expect(new Set(PERMISSIONS.map((p) => p.code)).size).toBe(PERMISSIONS.length);
  });
  it('Platform Administrator holds no business-data permissions (BP §15)', () => {
    const admin = ctxFor(['PLATFORM_ADMIN']);
    for (const p of ['employee.search', 'employee.read', 'er.case.read', 'employee.salary.reveal', 'engagement.admin', 'voice.triage']) {
      expect(can(admin, p)).toBe(false);
    }
  });
  it('only Document HR may reveal restricted fields in the draft matrix', () => {
    const holders = ROLES.filter((r) => r.permissions.includes('employee.salary.reveal')).map((r) => r.code);
    expect(holders).toEqual(['DOCUMENT_HR']);
  });
  it('Manager and Employee cannot read ER cases', () => {
    expect(can(ctxFor(['MANAGER']), 'er.case.read')).toBe(false);
    expect(can(ctxFor(['EMPLOYEE']), 'er.case.read')).toBe(false);
  });
});

describe('scope', () => {
  it('Division Head sees only own division units', () => {
    const dh = ctxFor(['DIVISION_HEAD'], { orgUnitIds: new Set(['div-a', 'dept-a1']) });
    expect(canInOrg(dh, 'employee.search', 'dept-a1')).toBe(true);
    expect(canInOrg(dh, 'employee.search', 'div-b')).toBe(false);
    expect(canInOrg(dh, 'employee.search', null)).toBe(false);
  });
  it('BANK scope passes any unit but still needs the permission', () => {
    const hr = ctxFor(['HR_ANALYTICS_ADMIN'], { bank: true });
    expect(canInOrg(hr, 'employee.search', 'anything')).toBe(true);
    expect(canInOrg(hr, 'er.case.read', 'anything')).toBe(false);
  });
});

describe('ER case access', () => {
  it('ER Officer needs case-team membership', () => {
    const o = ctxFor(['ER_OFFICER']);
    expect(canSeeCase(o, { isActiveTeamMember: false, isCreator: false })).toBe(false);
    expect(canSeeCase(o, { isActiveTeamMember: true, isCreator: false })).toBe(true);
    expect(canSeeCase(o, { isActiveTeamMember: false, isCreator: true })).toBe(true);
  });
  it('ER Manager portfolio override', () => {
    expect(canSeeCase(ctxFor(['ER_MANAGER']), { isActiveTeamMember: false, isCreator: false })).toBe(true);
  });
  it('team membership alone is not enough without er.case.read', () => {
    expect(canSeeCase(ctxFor(['MANAGER']), { isActiveTeamMember: true, isCreator: false })).toBe(false);
  });
});

describe('field masking', () => {
  const rec = { uid: 'E1', name: 'X', salary: 1000, nid: 'TEST-A1', passport: 'TEST-P1' };
  it('masks every restricted field for every role, with canReveal per permission', () => {
    for (const r of ROLES) {
      const m: any = maskRestricted(ctxFor([r.code]), rec);
      expect(JSON.stringify(m)).not.toContain('1000');
      expect(JSON.stringify(m)).not.toContain('TEST-A1');
      expect(m.salary.canReveal).toBe(r.code === 'DOCUMENT_HR');
    }
  });
});

describe('navigation', () => {
  it('Employee sees Home, My Work, Voice only', () => {
    expect(navigationFor(ctxFor(['EMPLOYEE'])).map((n) => n.key)).toEqual(['home', 'my-work', 'voice']);
    expect(navigationFor(ctxFor(['EMPLOYEE'])).map((n) => n.label)).toEqual(['Home', 'HR Action Centre', 'Employee Voice']);
  });
  it('Audit Reviewer sees Home + Audit Log', () => {
    expect(navigationFor(ctxFor(['AUDIT_REVIEWER'])).map((n) => n.key)).toEqual(['home', 'audit']);
  });
  it('audit module visibility', () => {
    expect(auditModulesFor(['AUDIT_REVIEWER'])).toBe('*');
    expect([...(auditModulesFor(['ER_MANAGER']) as Set<string>)]).toEqual(['er']);
  });
});

describe('state machine', () => {
  const def: StateMachineDef = {
    initial: 'OPEN',
    states: [{ code: 'OPEN', label: 'Open' }, { code: 'DONE', label: 'Done', terminal: true }],
    transitions: [
      { from: ['OPEN'], to: 'DONE', permission: 'actions.use' },
      { from: ['DONE'], to: 'OPEN', permission: 'actions.reopen', requiresReason: true },
    ],
  };
  it('illegal transition → 409', () => {
    expect(checkTransition(def, 'OPEN', 'OPEN', () => true)).toMatchObject({ ok: false, status: 409 });
  });
  it('missing permission → 403', () => {
    expect(checkTransition(def, 'DONE', 'OPEN', (p) => p !== 'actions.reopen', 'x')).toMatchObject({ ok: false, status: 403 });
  });
  it('reason required → 422', () => {
    expect(checkTransition(def, 'DONE', 'OPEN', () => true, ' ')).toMatchObject({ ok: false, status: 422 });
  });
  it('lists only permitted transitions', () => {
    expect(availableTransitions(def, 'DONE', () => false)).toHaveLength(0);
  });
});

describe('business calendar', () => {
  it('uses the configured working week, not a hard-coded weekend', () => {
    // Thu 2026-10-01 + 1 business day
    const sunToThu = [7, 1, 2, 3, 4];
    const monToFri = [1, 2, 3, 4, 5];
    expect(addBusinessDays(new Date('2026-10-01T00:00:00Z'), 1, sunToThu).toISOString().slice(0, 10)).toBe('2026-10-04');
    expect(addBusinessDays(new Date('2026-10-01T00:00:00Z'), 1, monToFri).toISOString().slice(0, 10)).toBe('2026-10-02');
  });
  it('skips configured holidays', () => {
    expect(addBusinessDays(new Date('2026-10-01T00:00:00Z'), 1, [1, 2, 3, 4, 5], ['2026-10-02']).toISOString().slice(0, 10)).toBe('2026-10-05');
  });
});

describe('sequence format', () => {
  it('formats tokens', () => {
    expect(formatSequence('ER-{YYYY}-{SEQ:5}', 42, new Date('2026-09-29T00:00:00Z'))).toBe('ER-2026-00042');
  });
});
