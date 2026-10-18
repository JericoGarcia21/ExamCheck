# security-engineering: review cues

## Worked example

Suspected risk: export endpoint appears to omit ownership filtering. Verified vulnerability requires an authorized test showing another fixture user can retrieve that export.

## Before handing off

- Can another developer reproduce the important decision or observation?
- Does the artifact identify unresolved assumptions and who resolves them?
- Is the next action within the user's authorized scope?

## Evaluation request

Ask an agent to apply this skill to the worked example. Inspect whether its output resolves the concrete decision, identifies missing evidence, and avoids making unsupported success claims. This is a manual behavioral check, not a recorded test pass.
