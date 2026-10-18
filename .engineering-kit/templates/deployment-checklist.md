# Deployment runbook

Record release revision, hosting/runtime, owner, explicit live-change authorization, build/start commands, environment variable names, and secret delivery mechanism. Never include secret values.

| Step | Command / procedure | Expected outcome | Actual status / evidence | Recovery |
| --- | --- | --- | --- | --- |
| Backup | Stack-specific procedure | Restorable snapshot | NOT VERIFIED | Restore rehearsal |
| Migration | Versioned migration | Compatible schema | NOT VERIFIED | Forward repair or tested rollback |

Cover TLS, debug disabled, health checks, durable storage, worker/cron support, migration ordering, compatibility, logging/redaction, monitoring alerts, rollback triggers and ownership. Use [hosting decisions](../references/deployment-targets.md) and [release gates](../checklists/release-readiness.md).
