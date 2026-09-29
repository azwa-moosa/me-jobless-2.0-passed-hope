'use client';
import { ModulePlaceholder } from '@/components/ModulePlaceholder';
export default function Page() {
  return <ModulePlaceholder m={{"key": "voice", "title": "Employee Voice", "purpose": "A safe route for employees to raise concerns, with triage and secure follow-up.", "phase": "Phase 7", "blockers": ["DR-27 anonymity model", "DR-28 triage ownership"], "features": ["Identified submission with a reference", "Triage and routing", "Secure two-way messaging (no content in notifications)", "Convert to a linked ER case", "Anonymous route only after IT/Security validation"]}} />;
}
