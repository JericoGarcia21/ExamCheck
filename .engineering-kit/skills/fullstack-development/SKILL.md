---
name: fullstack-development
description: "Build an approved feature across UI, API, database, tests, and documentation in small reviewable increments."
license: MIT
---

# Fullstack Development

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Confirm scope, architecture decisions or recorded delegation, acceptance criteria, and relevant project commands. For a small fix, use a short proportional plan.
2. Choose the smallest end-to-end feature slice. Identify schema, contract, permissions, UI states, and tests before changing code.
3. Implement server validation and authorization, persistence invariants, and client feedback together. Use existing framework practices and add dependencies only for a demonstrated need.
4. Keep changes reviewable; avoid premature abstractions, duplication, unused packages, and unrelated redesigns. Synchronize contracts and documentation with behavior.
5. Run meaningful checks for the changed risks and record exact outcomes. Report completed criteria, remaining gaps, and next slice; never equate generated code with working functionality.

## Outputs and handoff

Use the toolkit's `templates/implementation-plan.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
