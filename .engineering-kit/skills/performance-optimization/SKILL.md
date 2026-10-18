---
name: performance-optimization
description: "Measure and improve an observed frontend, API, database, or resource bottleneck while preserving behavior."
license: MIT
---

# Performance Optimization

## Inputs and scope

Use for the task described above. Read relevant project instructions, existing artifacts, and user constraints. Scale the work to the change and risk; a small fix does not need a full project ceremony. Preserve existing authorization and behavior.

## Workflow

1. Define a user-visible symptom, metric, budget, representative dataset, and environment. Capture a baseline before optimizing.
2. Profile the critical path: query plans and counts, server latency, network waterfalls, rendering, bundle transfer, memory, or queue saturation as relevant.
3. Choose the smallest change supported by the profile. Evaluate caching correctness, invalidation, index write cost, pagination, and loading trade-offs.
4. Repeat the same workload and report samples, units, variability, and changes in environment. Verify correctness and authorization after optimization.
5. Deliver before/after evidence and unresolved bottlenecks. If measurement cannot run, label the change a hypothesis and give the command or experiment needed.

## Outputs and handoff

Use the toolkit's `templates/performance-report.md` when available, or create the equivalent artifact directly from the workflow. Report decisions, evidence, unresolved questions, and the next required action. Never invent command execution or approval.

Read [the worked example and review cues](references/guide.md) when applying this workflow to an unfamiliar project. Supporting resources are local to this skill and travel with its folder.
