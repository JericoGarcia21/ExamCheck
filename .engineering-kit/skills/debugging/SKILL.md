---
name: debugging
description: "Reproduce, isolate, fix, and verify a concrete software failure without speculative unrelated changes."
license: MIT
---

# Debugging

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Capture expected versus observed behavior, reproducible steps, environment, revision, and sanitized logs. If reproduction is unavailable, state the evidence limit.
2. Form a small set of falsifiable hypotheses. Trace data and control flow; change one relevant variable at a time and preserve observations.
3. Identify the root cause and affected cases before choosing a minimal fix. Do not hide errors, weaken authorization, or add retries to mask an unexplained failure.
4. Add a regression check that fails for the original defect when useful, and test adjacent boundary or recovery cases. Remove temporary instrumentation and avoid secret-bearing logs.
5. Deliver cause, fix, executed verification, remaining uncertainty, and follow-up. Stop repeated destructive or externally mutating retries when scope or safety is unclear.

## Outputs and handoff

Use the toolkit's `templates/debugging-report.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
