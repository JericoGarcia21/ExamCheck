---
name: code-audit
description: "Review code correctness, architecture, maintainability, security, dependencies, and test gaps; produce evidence-backed prioritized findings."
license: MIT
---

# Code Audit

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Define the revision, paths, intended behavior, scope, and review limitations. Inspect callers and tests as well as changed lines.
2. Trace important flows for correctness, failure handling, authorization, transaction integrity, dependency risk, and unnecessary complexity.
3. Prioritize concrete defects separately from optional improvements. For each finding record severity, confidence, file and line, impact, evidence, and a specific remediation.
4. Check queries, network requests, bundle growth, and accessibility where relevant; require measurements before performance claims.
5. Report checks executed and coverage gaps. Do not fabricate vulnerabilities, insist on personal style, or imply that an empty report proves absence of defects.

## Outputs and handoff

Use the toolkit's `templates/code-audit-report.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
