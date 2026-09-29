'use client';
import { ModulePlaceholder } from '@/components/ModulePlaceholder';
export default function Page() {
  return <ModulePlaceholder m={{"key": "reports", "title": "Reports", "purpose": "Permission-controlled, masked reporting and exports across modules.", "phase": "Phase 4", "blockers": ["DR-38 export policy"], "features": ["Action Centre workload reports", "ER aggregates with small-number suppression", "Masked PDF / Excel / CSV exports (audited)"]}} />;
}
