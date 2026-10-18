---
name: documentation
description: "Write or update practical software documentation grounded in actual behavior, setup, architecture, and operating evidence."
license: MIT
---

# Documentation

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Identify audience and task: contributor setup, user workflow, API use, architecture decision, or operator recovery. Read code and existing docs before describing behavior.
2. Provide prerequisites, commands, expected observable outcomes, configuration names without secrets, and common failure recovery. Separate verified examples from illustrative ones.
3. Keep requirements, API, schema, setup, and release notes consistent with changes. Explain decisions and trade-offs that cannot be inferred from code.
4. Use concise Markdown, relative links, original prose, and source attribution. Do not copy proprietary manuals or invent authorship, test results, or guarantees.
5. Validate local links and execute safe documented commands when available. Record version-sensitive assumptions and documentation gaps.

## Outputs and handoff

Use the toolkit's `templates/documentation-plan.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
