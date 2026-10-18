# Release gates

For the exact revision and target, assign PASS, FAIL, or NOT VERIFIED to each applicable gate. Include evidence, timestamp, and owner. Record exclusions with rationale outside the status column. Required FAIL or NOT VERIFIED means no-go unless an accountable owner explicitly accepts a documented exception.

| Gate | Expected evidence |
| --- | --- |
| Requirements | Approved scope and acceptance-to-test traceability |
| QA | Actual unit/integration/E2E results for relevant risks; unresolved failures disclosed |
| Security | Threat/control review, dependency triage, permissions and negative tests |
| UX/accessibility | Primary flows, responsive states, keyboard checks and relevant WCAG review |
| Performance | Representative measurements against agreed budgets when applicable |
| Production configuration | Validated runtime, TLS, debug/log settings, secrets delivery and least privilege |
| Data changes | Compatible migrations, backups, restore evidence and irreversible-change plan |
| Recovery | Rollback trigger, procedure, rehearsal or explicit evidence gap |
| Operations | Health checks, logging redaction, monitoring/alerts, responsible operator |
| Documentation | Setup, API, support and runbooks match candidate behavior |
| Authorization | User approval for deployment and live infrastructure scope |

A recommendation is not a deployment action. Use [the report](../templates/release-readiness.md) to record residual risks and next actions.
