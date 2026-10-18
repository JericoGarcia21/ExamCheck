---
name: frontend-engineering
description: "Implement approved frontend behavior with reusable components, state handling, API integration, and responsive accessible HTML."
license: MIT
---

# Frontend Engineering

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Read the approved UX and API contract; inspect existing component and state conventions before adding dependencies.
2. Build a vertical user flow with semantic HTML and explicit state ownership. Keep server data, transient UI state, and derived values distinct.
3. Handle request cancellation or stale responses, pending actions, validation, retries, errors, and empty results. Do not expose secrets in client bundles or treat hidden buttons as authorization.
4. Use design tokens and reusable components where repeated behavior warrants them; preserve page-specific hierarchy and avoid unnecessary component frameworks.
5. Verify keyboard interactions, responsive content, API error paths, and the primary workflow using the project test tools. Update evidence and API/UX documentation together.

## Outputs and handoff

Use the toolkit's `templates/implementation-plan.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
