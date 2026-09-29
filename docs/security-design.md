# Security design – v0.1 (foundation)

Status: draft for Information Security review. Threat model covers the Sprint 1 foundation and the ER MVP slice.

## Controls in place

| Threat | Control | Evidence |
|---|---|---|
| Unauthenticated access | Global AuthGuard; token signature/issuer/audience/expiry verified; web middleware redirects to sign-in | `/me` without token → 401 (security suite) |
| Mock login reaching UAT/PROD | App refuses to boot if `MOCK_IDP_ENABLED` outside `dev`; mock tokens rejected unless dev; persona endpoint 404 | Section 5 of `tests/security/run-matrix.mjs` |
| Privilege via UI tampering | Navigation is a hint only; every route declares a permission; boot fails on undeclared routes | RouteAccessAuditor |
| Cross-division access | Scope resolved from DB grants against org tree as-of today; employee search filtered in SQL | Division Head tests |
| ER confidentiality | Case-team policy + Postgres RLS (defence in depth); 403 vs 404 distinguished via SECURITY DEFINER existence check; access logged | ER negative tests |
| Restricted field leakage | Always masked; audited reveal; log redaction; audit summaries carry names not values | Mask + redaction tests |
| Audit tampering | Append-only grants, blocking trigger, SHA-256 hash chain, verify endpoint | Tamper test |
| Lost audit on failure | Outbox written in same transaction; rollback leaves nothing | Atomicity test |
| CSRF | httpOnly SameSite=Strict cookie + required custom header on mutating requests at the BFF | `/api/*` proxy |
| Clickjacking / sniffing | `frame-ancestors 'none'`, X-Frame-Options DENY, nosniff, HSTS on API | Headers |
| Real data in repo | PII/secret scanner in CI; synthetic IDs prefixed `TEST-` | `pnpm scan:pii` |
| Anonymous Voice over-claiming | `voice.anonymous_route` cannot be enabled (409) until DR-27 | Security suite |

## Open items (need BML input)

DR-03 residency · DR-08 classification labels (INT/CONF/REST/HREST are placeholders) · DR-09 retention · DR-37 audit reviewers/retention/IP policy · DR-39 malware scanning · DR-44 break-glass · DR-48 session timeout/MFA · nonce-based CSP · key management via Key Vault · pen test before PROD.
