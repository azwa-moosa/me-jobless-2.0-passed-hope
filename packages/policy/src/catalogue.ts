/**
 * Permission catalogue and role bundles.
 *
 * DRAFT – implements F-access-matrix.md v0.1, which still requires HR, ER and Information Security
 * sign-off (DR-06, DR-07, DR-20). Everything here is seeded into platform.permission / role_permission,
 * so sign-off changes data, not enforcement code.
 */

export interface PermissionDef {
  code: string;
  module: string;
  description: string;
  restrictedField?: boolean;
}

export const PERMISSIONS: PermissionDef[] = [
  { code: 'me.read', module: 'platform', description: 'Sign in and view own profile' },
  // Employee data (EmployeeService)
  { code: 'employee.search', module: 'employee', description: 'Search employees within scope (summary fields)' },
  { code: 'employee.read', module: 'employee', description: 'View employee profile within scope (restricted fields masked)' },
  { code: 'employee.positions.read', module: 'employee', description: 'View position history' },
  { code: 'employee.salary.reveal', module: 'employee', description: 'Reveal salary (restricted field)', restrictedField: true },
  { code: 'employee.nid.reveal', module: 'employee', description: 'Reveal NID (restricted field)', restrictedField: true },
  { code: 'employee.passport.reveal', module: 'employee', description: 'Reveal passport number (restricted field)', restrictedField: true },
  { code: 'org.read', module: 'org', description: 'Browse organisation hierarchy (as-of any date)' },
  // Configuration / admin / audit
  { code: 'config.lookups.read', module: 'config', description: 'Read configured lookups and state machines' },
  { code: 'admin.feature_flags.manage', module: 'admin', description: 'View and change feature flags' },
  { code: 'admin.users.read', module: 'admin', description: 'View users, roles and scope grants' },
  { code: 'audit.read', module: 'audit', description: 'Read audit events for permitted modules' },
  { code: 'audit.verify', module: 'audit', description: 'Run audit hash-chain verification' },
  // Action Centre
  { code: 'actions.use', module: 'actions', description: 'My Work: own actions' },
  { code: 'actions.create', module: 'actions', description: 'Create ad-hoc actions' },
  { code: 'actions.team.read', module: 'actions', description: 'Team Work view for own teams' },
  { code: 'actions.reassign', module: 'actions', description: 'Reassign actions' },
  { code: 'actions.reopen', module: 'actions', description: 'Reopen completed actions' },
  // ER Case Management
  { code: 'er.dashboard.read', module: 'er', description: 'ER dashboard (authorised cases only)' },
  { code: 'er.case.create', module: 'er', description: 'Create ER case' },
  { code: 'er.case.read', module: 'er', description: 'Read ER cases where on the case team' },
  { code: 'er.case.read_all', module: 'er', description: 'Read all ER cases (portfolio override – DR-20)' },
  { code: 'er.case.update', module: 'er', description: 'Add chronology entries, participants and tasks' },
  { code: 'er.case.status', module: 'er', description: 'Change case status per state machine' },
  { code: 'er.case.team.manage', module: 'er', description: 'Manage case team membership' },
  { code: 'er.case.close', module: 'er', description: 'Close case (incl. override with reason)' },
  { code: 'er.case.access_log.read', module: 'er', description: 'Read case access log' },
  // Later-phase modules (navigation placeholders only in Sprint 1)
  { code: 'analytics.dashboard.read', module: 'analytics', description: 'View published dashboards within scope' },
  { code: 'analytics.admin', module: 'analytics', description: 'Periods, uploads, validation, metrics' },
  { code: 'engagement.read', module: 'engagement', description: 'Engagement results (thresholded)' },
  { code: 'engagement.admin', module: 'engagement', description: 'Survey cycles, population, import' },
  { code: 'fwt.claims', module: 'engagement', description: 'Fun with Teams activities and claims' },
  { code: 'voice.submit', module: 'voice', description: 'Submit identified Voice report' },
  { code: 'voice.triage', module: 'voice', description: 'Triage Voice submissions' },
  { code: 'manager.intake', module: 'manager', description: 'People Manager guided intake' },
  { code: 'documents.request', module: 'documents', description: 'Create document requests' },
  { code: 'documents.approve', module: 'documents', description: 'Approve documents' },
  { code: 'reports.read', module: 'reports', description: 'Reports' },
];

export type ScopeType = 'BANK' | 'ORG_UNIT' | 'SELF' | 'NONE';

export interface RoleDef {
  code: string;
  ref: string; // R1..R16 in the access matrix
  name: string;
  defaultScope: ScopeType;
  status: string;
  permissions: string[];
  /** Which audit modules this role may read ('*' = all). */
  auditModules?: string[] | '*';
  privileged?: boolean;
}

const BASE = ['me.read', 'actions.use', 'voice.submit'];
const EMP_READ = ['employee.search', 'employee.read', 'employee.positions.read', 'org.read', 'config.lookups.read'];
const ER_OFFICER = [
  ...BASE, ...EMP_READ, 'actions.create', 'actions.team.read',
  'er.dashboard.read', 'er.case.create', 'er.case.read', 'er.case.update', 'er.case.status',
];

export const ROLES: RoleDef[] = [
  { ref: 'R1', code: 'HR_ANALYTICS_ADMIN', name: 'HR Analytics Admin', defaultScope: 'BANK', status: 'From blueprint',
    permissions: [...BASE, ...EMP_READ, 'actions.create', 'actions.team.read', 'audit.read', 'analytics.admin', 'analytics.dashboard.read', 'reports.read'],
    auditModules: ['analytics'] },
  { ref: 'R2', code: 'ER_OFFICER', name: 'ER Officer', defaultScope: 'BANK', status: 'DR-06 / DR-20', permissions: ER_OFFICER },
  { ref: 'R3', code: 'ER_MANAGER', name: 'ER Manager', defaultScope: 'BANK', status: 'DR-06 / DR-20',
    permissions: [...ER_OFFICER, 'er.case.read_all', 'er.case.team.manage', 'er.case.close', 'er.case.access_log.read', 'audit.read', 'actions.reassign', 'actions.reopen'],
    auditModules: ['er'] },
  { ref: 'R4', code: 'ENGAGEMENT_HR', name: 'Engagement HR', defaultScope: 'BANK', status: 'From blueprint',
    permissions: [...BASE, 'employee.search', 'org.read', 'config.lookups.read', 'actions.create', 'actions.team.read', 'engagement.admin', 'engagement.read', 'fwt.claims', 'reports.read', 'audit.read'],
    auditModules: ['engagement'] },
  { ref: 'R5', code: 'HR_LEADERSHIP', name: 'HR Leadership', defaultScope: 'BANK', status: 'From blueprint',
    permissions: [...BASE, 'org.read', 'analytics.dashboard.read', 'engagement.read', 'reports.read'] },
  { ref: 'R6', code: 'DIVISION_HEAD', name: 'Division Head', defaultScope: 'ORG_UNIT', status: 'From blueprint (split – DR-06)',
    permissions: [...BASE, 'employee.search', 'employee.read', 'org.read', 'analytics.dashboard.read', 'engagement.read', 'manager.intake'] },
  { ref: 'R7', code: 'DEPARTMENT_HEAD', name: 'Department Head', defaultScope: 'ORG_UNIT', status: 'From blueprint (split – DR-06)',
    permissions: [...BASE, 'employee.search', 'employee.read', 'org.read', 'analytics.dashboard.read', 'engagement.read', 'manager.intake'] },
  { ref: 'R8', code: 'MANAGER', name: 'Manager', defaultScope: 'SELF', status: 'From blueprint', permissions: [...BASE, 'manager.intake'] },
  { ref: 'R9', code: 'EMPLOYEE', name: 'Employee', defaultScope: 'SELF', status: 'From blueprint', permissions: [...BASE] },
  { ref: 'R10', code: 'DOCUMENT_HR', name: 'Document HR', defaultScope: 'BANK', status: 'From blueprint',
    permissions: [...BASE, ...EMP_READ, 'employee.salary.reveal', 'employee.nid.reveal', 'employee.passport.reveal', 'actions.create', 'documents.request', 'audit.read'],
    auditModules: ['studio', 'employee'] },
  { ref: 'R11', code: 'DOCUMENT_APPROVER', name: 'Document Approver', defaultScope: 'BANK', status: 'Matrix DR-30',
    permissions: [...BASE, 'documents.approve'] },
  { ref: 'R12', code: 'PLATFORM_ADMIN', name: 'Platform Administrator', defaultScope: 'NONE', status: 'From blueprint (no business data)',
    permissions: [...BASE, 'admin.feature_flags.manage', 'admin.users.read', 'config.lookups.read', 'org.read', 'audit.read'],
    auditModules: ['platform', 'admin', 'auth', 'config'], privileged: true },
  { ref: 'R13', code: 'VOICE_TRIAGE', name: 'Voice Triage Officer', defaultScope: 'NONE', status: 'Proposed – DR-28',
    permissions: [...BASE, 'voice.triage'] },
  { ref: 'R14', code: 'AUDIT_REVIEWER', name: 'Audit Reviewer', defaultScope: 'NONE', status: 'Proposed – DR-37',
    permissions: ['me.read', 'audit.read', 'audit.verify'], auditModules: '*' },
  { ref: 'R15', code: 'FWT_COORDINATOR', name: 'FwT Coordinator', defaultScope: 'ORG_UNIT', status: 'Proposed – DR-26',
    permissions: [...BASE, 'fwt.claims'] },
  { ref: 'R16', code: 'ACCESS_APPROVER', name: 'Access Approver', defaultScope: 'NONE', status: 'Proposed – DR-06',
    permissions: [...BASE, 'admin.users.read', 'audit.read'], auditModules: ['platform', 'admin', 'auth'], privileged: true },
];

export const PERMISSION_CODES = new Set(PERMISSIONS.map((p) => p.code));

// Build-time integrity: every role permission must exist in the catalogue.
for (const r of ROLES) for (const p of r.permissions) {
  if (!PERMISSION_CODES.has(p)) throw new Error(`Role ${r.code} references unknown permission ${p}`);
}
