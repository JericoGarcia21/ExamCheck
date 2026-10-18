---
name: devops-deployment
description: "Prepare stack-appropriate deployment, CI, configuration, migrations, backups, rollback, and observability; use for release operations."
license: MIT
---

# Devops Deployment

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Read runtime, hosting, data, availability, and budget constraints. Choose cPanel/shared hosting, VPS, Docker, Vercel, Render, or comparable hosting according to supported processes and storage.
2. Document build/start commands, environment variables without values, secrets delivery, TLS, production debug settings, health checks, logging/redaction, and monitoring ownership.
3. Plan migration ordering and compatibility, backup and restore verification, rollback triggers, and handling irreversible data changes. Test in an isolated environment when available.
4. Configure least-privilege CI and environment separation. Pin dependencies and actions according to project policy; do not expose secrets in pull-request jobs.
5. Deliver a runbook with pass/fail/not-verified evidence. Stop before deployment, live migrations, DNS changes, or infrastructure mutations unless the user has authorized that exact scope.

## Outputs and handoff

Use the toolkit's `templates/deployment-checklist.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
