---
name: security-engineering
description: "Threat-model or assess authentication, authorization, data handling, dependencies, and API abuse when security review or risk warrants it."
license: MIT
---

# Security Engineering

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Identify assets, actors, entry points, trust boundaries, sensitive data flows, and plausible abuse. Select an ASVS version and risk-based verification scope; do not claim certification.
2. Review authentication, resource authorization, sessions, secrets, validation, uploads, dependencies, and data exposure. Check BOLA/IDOR, injection, XSS, CSRF for cookie-authenticated state changes, CORS, password hashing, and error disclosure as relevant.
3. Use least privilege and secure defaults. Evaluate rate limits and resource exhaustion, retention, deletion, and environment separation. Never hardcode credentials or copy live secrets into evidence.
4. Test only within authorized scope using safe fixtures. Distinguish reproduced vulnerabilities, suspected risks, and controls not verified. Cite evidence and affected paths without exposing sensitive data.
5. Deliver a threat model and actionable findings with severity, confidence, impact, remediation, owner, and retest criteria. A checklist is evidence organization, not proof of security.

## Outputs and handoff

Use the toolkit's `templates/threat-model.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
