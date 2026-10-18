# Security review checklist

Choose the applicable control scope using [official security references](../references/sources.md). Record selected ASVS version and requirement IDs after consulting that version; this checklist is not an ASVS compliance mapping.

Use PASS, FAIL, or NOT VERIFIED with evidence and owner for each applicable item. Record exclusions with rationale.

| Area | Review and useful evidence | Status |
| --- | --- | --- |
| Identity | Authentication lifecycle, recovery abuse, appropriate password hashing, MFA where risk warrants | NOT VERIFIED |
| Authorization | Role and object/tenant checks for read/write/list/export/batch; two-user negative tests | NOT VERIFIED |
| Sessions | Secure cookie flags, expiry, rotation, revocation; CSRF protection for relevant cookie flows | NOT VERIFIED |
| Injection/XSS | Parameterized queries; context-safe output; HTML sanitization when needed | NOT VERIFIED |
| Input/uploads | Server schemas, bounds, content validation, safe storage/names, malware controls by risk | NOT VERIFIED |
| API abuse | Bounded pagination, timeouts, rate/resource limits, idempotency; appropriate CORS allowlist | NOT VERIFIED |
| Data/privacy | Minimized responses, log redaction, retention/deletion, transport/storage protection | NOT VERIFIED |
| Secrets/config | Secret store or environment delivery, least privilege, production debug disabled | NOT VERIFIED |
| Supply chain | Lockfiles, supported runtimes, dependency review and actionable advisory triage | NOT VERIFIED |
| Recovery | Backup protection, tested restore, incident owner and revocation procedure | NOT VERIFIED |

Distinguish demonstrated vulnerabilities from unverified risks. Do not include live credentials or personal records in evidence.
