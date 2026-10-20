# Checking result UI

2026-10-20. Scope: refine the existing authenticated paper result screen. Guest Quick Check remains a separate proposed feature.

## Direction and implementation

Use the existing Geist font, green primary, neutral surfaces, borders and compact radii. The local references inspected were PaperResultCard, AnswerReviewDialog, the SessionPage checking states, and index.css. No external visual references were used for this refinement.

Hierarchy: student and review status → score summary → compact question/full-credit/review/confidence metrics → teacher score adjustment → pending decisions → answer comparison → save actions. Reading confidence is explicitly distinguished from correctness. Answer feedback now includes uppercase-rule explanations that were previously absent from the result list.

Use All, Needs review and Incorrect toggle buttons with pressed states to narrow long result lists. Counts reflect the current answer details; filtering does not change points or save eligibility. Show an explicit empty state and visible-result count. Incorrect includes partial-credit answers. Review highlighting uses the shared review predicate, so an accepted low-confidence reading does not remain styled as unresolved.

On narrow screens metrics form two columns and each answer stacks its reading, key, points and confidence. Wider layouts retain aligned points/confidence columns. Long answers wrap and preserve line breaks. Existing loading/error flow, teacher decisions, score validation, and save guards are retained. No new endpoint, permission or dependency is introduced.

## Verification

Lint and the existing test suite passed after the initial UI change. Added a result rendering regression covering comparison labels, uppercase feedback, filter semantics, and the distinction between confidence and correctness. Final command results are reported in the task response.

Browser discovery returned no available browsers; desktop/mobile visual inspection, interactive filter clicks, keyboard navigation and measured contrast remain unverified. Source inspection and static rendering are not visual verification. No deployment was performed.
