---
name: backend-api-engineering
description: "Implement or review server endpoints, validation, authentication, resource authorization, transactions, and API error contracts."
license: MIT
---

# Backend Api Engineering

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Define method, path, request schema, response schema, status codes, authentication, resource permissions, and compatibility expectations before endpoint changes.
2. Validate and bound inputs on the server. Enforce tenant and object ownership for every resource access, including list, export, batch, and nested routes.
3. Use parameterized queries, explicit transaction boundaries, uniqueness constraints, and safe concurrency behavior. Evaluate idempotency for retried state-changing requests.
4. Return useful stable errors without stack traces, SQL, tokens, or sensitive records. Apply bounded pagination, upload limits, rate limits, and CORS rules according to the actual threat model.
5. Test success, malformed input, unauthenticated access, cross-user access, conflicts, and dependency failures. Keep the contract and callers synchronized.

## Outputs and handoff

Use the toolkit's `templates/api-contract.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
