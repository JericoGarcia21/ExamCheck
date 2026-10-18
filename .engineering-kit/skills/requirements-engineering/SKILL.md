---
name: requirements-engineering
description: "Turn an agreed product scope into measurable requirements and acceptance criteria; use for ambiguous behavior or changing requirements."
license: MIT
---

# Requirements Engineering

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Read the brief and existing behavior. Assign stable requirement IDs and link each to a user workflow and business outcome.
2. Specify normal, invalid, boundary, permission-denied, empty, and recovery behavior. Resolve ambiguous words such as fast or intuitive with a measurable target or explicit open question.
3. Write Given/When/Then acceptance criteria, role and resource permissions, data constraints, and justified nonfunctional requirements.
4. Mark MVP, optional, excluded, and future work; track dependencies and disagreements without expanding scope.
5. Produce requirements.md and acceptance-criteria.md with a requirement-to-test mapping. Flag blockers before architecture or implementation depends on them.

## Outputs and handoff

Use the toolkit's `templates/requirements.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
