import { ROLES } from './catalogue';

/** Built server-side per request from DB grants (never from the token alone). */
export interface SecurityContext {
  userId: string;
  upn: string;
  displayName: string;
  employeeUid: string | null;
  roles: string[];
  permissions: Set<string>;
  scope: {
    bank: boolean;
    /** Org units in scope (already expanded to descendants, resolved as-of today). */
    orgUnitIds: Set<string>;
  };
  auditModules: '*' | Set<string>;
}

export class PolicyDenied extends Error {
  constructor(public readonly permission: string, public readonly reason: string) {
    super(`Denied: ${permission} (${reason})`);
  }
}

export function can(ctx: SecurityContext, permission: string): boolean {
  return ctx.permissions.has(permission);
}

export function assertCan(ctx: SecurityContext, permission: string): void {
  if (!can(ctx, permission)) throw new PolicyDenied(permission, 'missing permission');
}

/** Role permission AND organisational scope. */
export function canInOrg(ctx: SecurityContext, permission: string, orgUnitId: string | null | undefined): boolean {
  if (!can(ctx, permission)) return false;
  if (ctx.scope.bank) return true;
  return !!orgUnitId && ctx.scope.orgUnitIds.has(orgUnitId);
}

export interface CaseAccessFacts {
  isActiveTeamMember: boolean;
  isCreator: boolean;
}

/** ER case-level access: permission AND (case team OR portfolio override). Not menu hiding (ER-003). */
export function canSeeCase(ctx: SecurityContext, facts: CaseAccessFacts): boolean {
  if (!can(ctx, 'er.case.read')) return false;
  return can(ctx, 'er.case.read_all') || facts.isActiveTeamMember || facts.isCreator;
}

export function auditModulesFor(roleCodes: string[]): '*' | Set<string> {
  const out = new Set<string>();
  for (const code of roleCodes) {
    const r = ROLES.find((x) => x.code === code);
    if (!r?.auditModules) continue;
    if (r.auditModules === '*') return '*';
    r.auditModules.forEach((m) => out.add(m));
  }
  return out;
}

// ------------------------------------------------------------------ field masking (PLT-004)
export const MASK = '••••••';

export const RESTRICTED_FIELDS = {
  salary: 'employee.salary.reveal',
  nid: 'employee.nid.reveal',
  passport: 'employee.passport.reveal',
} as const;
export type RestrictedField = keyof typeof RESTRICTED_FIELDS;

export interface MaskedField {
  masked: true;
  canReveal: boolean;
}

/**
 * Restricted fields are ALWAYS masked in normal responses. A separate, audited reveal call returns
 * a single value when the caller holds the field permission.
 */
export function maskRestricted<T extends Partial<Record<RestrictedField, unknown>>>(
  ctx: SecurityContext,
  record: T,
): Omit<T, RestrictedField> & Record<RestrictedField, MaskedField> {
  const out: any = { ...record };
  for (const f of Object.keys(RESTRICTED_FIELDS) as RestrictedField[]) {
    out[f] = { masked: true, canReveal: can(ctx, RESTRICTED_FIELDS[f]) };
  }
  return out;
}

// ------------------------------------------------------------------ navigation (hints only – API still enforces)
export interface NavItem {
  key: string;
  label: string;
  href: string;
  group: 'main' | 'modules' | 'admin';
  available: boolean; // false = module placeholder ("not yet available")
  phase?: string;
}

const NAV: Array<NavItem & { anyOf: string[] }> = [
  { key: 'home', label: 'Home', href: '/', group: 'main', available: true, anyOf: ['me.read'] },
  { key: 'my-work', label: 'HR Action Centre', href: '/my-work', group: 'main', available: true, anyOf: ['actions.use'] },
  { key: 'er', label: 'Employee Relations', href: '/er', group: 'modules', available: true, anyOf: ['er.dashboard.read'] },
  { key: 'analytics', label: 'People Analytics', href: '/analytics', group: 'modules', available: true, phase: 'Preview', anyOf: ['analytics.dashboard.read', 'analytics.admin'] },
  { key: 'engagement', label: 'Engagement', href: '/engagement', group: 'modules', available: true, phase: 'Preview', anyOf: ['engagement.read', 'engagement.admin', 'fwt.claims'] },
  { key: 'voice', label: 'Employee Voice', href: '/voice', group: 'modules', available: false, phase: 'Phase 7', anyOf: ['voice.submit', 'voice.triage'] },
  { key: 'manager', label: 'People Manager', href: '/manager', group: 'modules', available: false, phase: 'Phase 8', anyOf: ['manager.intake'] },
  { key: 'documents', label: 'Documents', href: '/documents', group: 'modules', available: false, phase: 'Phase 4b', anyOf: ['documents.request', 'documents.approve'] },
  { key: 'employees', label: 'Employees', href: '/employees', group: 'modules', available: true, anyOf: ['employee.search'] },
  { key: 'reports', label: 'Reports', href: '/reports', group: 'modules', available: false, phase: 'Phase 4', anyOf: ['reports.read'] },
  { key: 'access', label: 'Access Management', href: '/admin/access', group: 'admin', available: true, anyOf: ['admin.users.read'] },
  { key: 'audit', label: 'Audit', href: '/admin/audit', group: 'admin', available: true, anyOf: ['audit.read'] },
  { key: 'org', label: 'Organisation', href: '/admin/org', group: 'admin', available: true, anyOf: ['org.read'] },
  { key: 'config', label: 'Configuration', href: '/admin/config', group: 'admin', available: true, anyOf: ['config.lookups.read'] },
  { key: 'flags', label: 'Feature Flags', href: '/admin/flags', group: 'admin', available: true, anyOf: ['admin.feature_flags.manage'] },
  { key: 'design', label: 'Design System', href: '/admin/design-system', group: 'admin', available: true, anyOf: ['config.lookups.read'] },
];

export function navigationFor(ctx: SecurityContext): NavItem[] {
  return NAV.filter((n) => n.anyOf.some((p) => can(ctx, p))).map(({ anyOf, ...n }) => n);
}
