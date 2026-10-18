# code-audit: review cues

## Worked example

High confidence defect: retrying a payment callback can create a second ledger row because no provider event uniqueness is enforced. Include the replay fixture and affected transaction.

## Before handing off

- Can another developer reproduce the important decision or observation?
- Does the artifact identify unresolved assumptions and who resolves them?
- Is the next action within the user's authorized scope?

## Evaluation request

Ask an agent to apply this skill to the worked example. Inspect whether its output resolves the concrete decision, identifies missing evidence, and avoids making unsupported success claims. This is a manual behavioral check, not a recorded test pass.
