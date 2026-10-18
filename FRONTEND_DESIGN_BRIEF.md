# ExamCheck design brief

Date: 2026-10-18. Scope: source-grounded design review and implementation handoff. No product code or live services changed.

## Task and direction

Teachers prepare classes on desktop and capture papers on phones. The primary task is selecting the right student, reviewing uncertain answers, and saving a final grade without losing teacher decisions. Preserve the existing forest-green identity, Geist typography, navigation, Google authentication, routes, scoring rules, and Supabase authorization.

Keep compact session rows for browsing, a focused capture/review workspace for grading, and a comparison table for class results. Avoid adding decorative dashboard cards. Existing dashboard workflow guidance should remain secondary to resuming work.

## Source observations and proposed changes

1. `DashboardPage.tsx` links its latest session with “Continue checking” regardless of key confirmation. Proposed: show the session name and class beside the action; use “Finish answer key” for a draft and “Continue checking” for a confirmed key. Keep the same destination. Acceptance: teachers can identify the destination and required next step before opening it.
2. `ResultsPage.tsx` distinguishes key status from checked-paper counts, but its main filters describe keys. Preserve those facts and labels; avoid implying a confirmed key means grading is complete. Keep export actions within the selected session and retain unchecked roster members.
3. `PaperResultCard.tsx` already names the student, counts pending reviews, previews the final score, and disables saving until review is complete. Retain this hierarchy. Keep the reason for disabled saving visible beside the action; announce save progress and completion without moving focus unexpectedly.
4. Search controls on Checking and Results have accessible names but rely on placeholders visually. Proposed: add persistent visible labels, retaining existing search and clear behavior.
5. Light input borders have low contrast against white. Where borders are the sole input boundary, use the existing secondary-text color for the boundary or another measured 3:1 token. Do not darken every decorative surface divider.

## Tokens and layout

| Element | Decision |
| --- | --- |
| Color | Retain canvas #f3f6f5, surface #ffffff, text #203c35, secondary text #596e65, primary #17664d, focus #28785b |
| Typography | Geist Variable; titles 28–34px; section titles 16–20px; working text 14px; metadata 12px; tabular scores |
| Spacing | 4px base; 8px related fields, 16px groups, 24px sections; retain current responsive shell |
| Radius | 12px surfaces, 8px controls; no added glow or decorative gradients |
| Focus | Visible 2px outline with 2px offset; pale focus on the forest navigation rail; never color alone for state |
| Targets | At least 44px controls; retain 48px student rows |
| Mobile | Below 768px retain bottom navigation and safe-area clearance; stack answer text, points, confidence below 640px |

At 320px, wrap session titles, student names, and code without clipping. For wide results tables, use a labeled horizontal scroll region while keeping student identity understandable. At desktop widths, keep roster selection beside paper review only where both remain readable. DOM order should match the visible task order: session context, key setup, student choice, capture, review, save.

## State coverage

| State | Feedback | Action | Accessibility |
| --- | --- | --- | --- |
| Empty | Explain missing class, roster, or session | Link to the relevant setup step | Semantic heading and named action |
| No matches | Distinguish filters from an empty workspace | Clear search/filters | Politely announce result count |
| Loading | Preserve student/session identity and stable space | Disable duplicate submissions | Busy region and concise status |
| Invalid | Explain the specific answer-key or score constraint | Correct the field | Associate help/error with input; focus first invalid field on submit |
| Read/save error | Name the failed operation; preserve available review input | Retry that operation | Alert once; avoid raw service details in user copy |
| Success | Identify whose final result was saved | Select the next student or view results | Polite status; deliberate focus movement only |
| Disabled | Explain pending review, invalid score, or active save | Resolve the named prerequisite | Native disabled control plus nearby explanation |
| Forbidden | Explain that the session cannot be accessed | Return to the session list | Do not render cached student details after access loss |
| Offline/camera denied | Explain connection or permission requirement | Reconnect, retry camera, or upload | Persistent text; preserve supported upload fallback |

## Architecture, security, and delivery plan

Use the existing React components, CSS tokens, routes, query keys, and services. No new dependency, database, API, or role is needed. Visual status must reflect authoritative saved state; never infer save success from a local score preview. Keep student data out of design fixtures and screenshots; use synthetic content.

Proposed feature sequence: (1) contextual dashboard action and visible search labels; (2) measured input-boundary tokens and consistent operation feedback; (3) authenticated desktop/mobile acceptance of the existing capture, review, save, and export flow. Before significant implementation, obtain the user's decision on this proposed scope, as required by AGENTS.md. This brief does not authorize deployment.

## Evidence and acceptance

Inspected PRODUCT.md, DESIGN.md, AppLayout, Dashboard, Checking, Results, SessionPage, SessionResultsPage, PaperResultCard, SessionListCard, and CSS. Calculated opaque sRGB contrast using Node: text #203c35 on white 11.94:1; secondary #596e65 on white 5.46:1; white on primary #17664d 6.90:1; input border #ccd9d1 on white 1.46:1. These measurements cover only those pairs.

Browser rendering, keyboard navigation, screen readers, zoom, camera permissions, and mobile reflow are NOT VERIFIED in this review. No screenshot or usability-test evidence is claimed. No product tests were run for this documentation-only artifact.

Acceptance fixtures: a long session title (“Introduction to Programming — Midterm Practical Examination”), a wrapped student name, multiline code, zero submissions, a draft key, an invalid score, a pending review, failed save, and denied camera permission. Check at 320px, 390px, 768px, and 1440px; keyboard-only navigation and 200% zoom must preserve access to every action. Verify teacher overrides and review gates remain unchanged.

Open decision: approve the proposed refinement scope or identify a different screen priority. Next action: implement the approved slice, then record actual checks and remaining evidence gaps.
