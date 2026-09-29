/**
 * EmployeeService provider contract (EMP-001). No Employee Master is created by the platform:
 * DEV/UAT use the synthetic HRIS stub; UAT/PROD will use the authoritative HRIS adapter (DR-04)
 * behind this same interface.
 */
export interface EmployeeRecord {
  uid: string;
  fullName: string;
  email: string;
  status: string;
  joinDate: string;
  leaveDate: string | null;
  grade: string;
  positionTitle: string;
  orgUnitId: string;
  managerUid: string | null;
  salary: number;
  currency: string;
  nid: string;
  passport: string | null;
}

export interface PositionEntry {
  positionTitle: string;
  grade: string;
  orgUnitId: string;
  orgUnitName: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  changeType: string;
}

export interface EmployeeProvider {
  readonly name: string;
  search(q: string, opts: { orgUnitIds: string[] | 'ALL'; limit: number }): Promise<EmployeeRecord[]>;
  get(uid: string): Promise<EmployeeRecord | null>;
  getMany(uids: string[]): Promise<EmployeeRecord[]>;
  positions(uid: string): Promise<PositionEntry[]>;
}

export const EMPLOYEE_PROVIDER = Symbol('EMPLOYEE_PROVIDER');
