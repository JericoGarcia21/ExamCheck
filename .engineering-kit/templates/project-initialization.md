# New project initialization prompt

Copy the following into your coding assistant; attach the toolkit or make it accessible. Replace the context fields you know and let discovery resolve material gaps.

```text
Use fullstack-ai-engineering-kit to plan this project before implementing it.
Product/problem: [describe the actual problem and current workaround]
Users and primary workflow: [who does what]
Existing repository or stack: [existing system or new project]
Constraints: [budget, hosting, timeline, team experience, privacy]
Deliverables and success measure: [what completion looks like]
Known roles, integrations, and sensitive data: [known facts]
Design references and brand: [optional URLs, screenshots, existing brand, or delegate visual direction]

Read the toolkit AGENTS.md and references/workflow.md. Collect enough context;
ask concise questions only where answers materially change behavior or architecture.
Produce project-brief.md, requirements.md, acceptance-criteria.md, architecture.md,
database-design.md (or explain why inapplicable), API contract where relevant,
threat-model.md, qa-test-plan.md, and implementation-plan.md.
Separate MVP, optional, future, and excluded scope. Recommend a proportionate stack
with alternatives, data/permission boundaries, failure behavior, hosting limits,
and feature-based slices. Present a readiness summary with assumptions, blockers,
security/QA needs, and decisions requiring approval.
For a user-facing interface, use frontend-design to establish a specific visual
direction grounded in real content and inspected references when available.
Include a design brief and representative screen in the plan; avoid defaulting
to a generic landing page or dashboard composition. Label unverified references.
Stop before product implementation until necessary decisions are approved.
Do not deploy or modify live infrastructure. Never fabricate test or audit results.
```

For a filled example, see [the club booking project](../examples/club-booking/README.md).
