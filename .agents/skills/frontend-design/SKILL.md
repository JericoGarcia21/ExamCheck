---
name: frontend-design
description: "Design or refine product interfaces around user tasks, brand, visual hierarchy, responsive states, and purposeful information density."
license: MIT
---

# Frontend Design

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Inspect existing screens, brand, user tasks, real content, and accessibility needs. Preserve functioning interaction patterns unless the requested outcome needs change.
   For a new interface or substantial redesign, read [reference research and visual direction](references/visual-direction.md). Use supplied references or research relevant real interfaces when browsing is available; record what was actually inspected. Establish a specific visual direction before building screens.
2. Choose layout and density from the workflow: a comparison task may need a table; a guided action may need a focused form. Establish typography, spacing, color, radius, and focus tokens.
3. Avoid arbitrary gradients, glow, excessive whitespace, oversized rounding, meaningless icons, repetitive cards, and visually uniform sections. Make contextual actions and content hierarchy explicit.
4. Specify empty, loading, validation, error, success, disabled, and permission states. Define mobile reflow, long-content behavior, keyboard order, and semantic structure.
5. Deliver a design brief or reviewable mockup with rationale and state coverage. Validate using realistic content, narrow viewports, keyboard navigation, and contrast; label unverified checks.
   Compare rendered screens with the brief and reference observations. Correct generic composition, weak hierarchy, and inconsistent details before handoff; do not claim visual verification from source code alone.

## Outputs and handoff

Use the toolkit's `templates/design-brief.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
