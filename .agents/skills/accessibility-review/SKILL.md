---
name: accessibility-review
description: "Review and remediate semantic HTML, keyboard behavior, focus, contrast, forms, and assistive technology support."
license: MIT
---

# Accessibility Review

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Define pages, user journeys, platforms, and target WCAG version and level with the project; use WCAG 2.2 AA as a proposed baseline when appropriate, not an unsupported compliance claim.
2. Inspect landmarks, headings, accessible names, label/error associations, semantic controls, image alternatives, and dynamic announcements.
3. Manually test keyboard operation, focus visibility/order, modal trapping and return, zoom/reflow, and reduced-motion behavior. Measure contrast using the relevant criterion.
4. Use automated checks to supplement manual review. Record actual browser and assistive technology combinations; do not infer screen-reader success from a static scan.
5. Report criterion, affected element, user impact, reproduction, severity, and retest evidence. Separate automated results, manual results, and not-verified criteria.

## Outputs and handoff

Use the toolkit's `templates/accessibility-report.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
