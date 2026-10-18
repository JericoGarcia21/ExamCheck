# backend-api-engineering: review cues

## Worked example

GET /bookings/{id} must scope lookup to the authenticated user or authorized staff. An unpredictable ID alone does not prevent BOLA.

## Before handing off

- Can another developer reproduce the important decision or observation?
- Does the artifact identify unresolved assumptions and who resolves them?
- Is the next action within the user's authorized scope?

## Evaluation request

Ask an agent to apply this skill to the worked example. Inspect whether its output resolves the concrete decision, identifies missing evidence, and avoids making unsupported success claims. This is a manual behavioral check, not a recorded test pass.
