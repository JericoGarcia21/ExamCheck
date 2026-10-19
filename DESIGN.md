# ExamCheck interface

The workspace uses a fixed forest-green navigation rail on desktop, with a white contextual top bar and mist-green working canvas. Below 768px the rail becomes a mobile header and a bottom navigation bar with safe-area padding. Pages retain familiar web controls and existing routes.

## Tokens

- Canvas: #f3f6f5. Working surfaces: #ffffff. Text: #203c35. Secondary text: #596e65.
- Primary action: #17664d with white text. Border: #d9e3dd. Input border: #ccd9d1. Focus: #28785b.
- Navigation: #163e32 with #c7d9d0 text; selected item #e4eedf with #173e31 text.
- Dashboard checking area: #e1ecdf with #203f30 text. Confirmed keys use green status labels; draft keys use amber labels. Labels always name the state.
- Self-hosted Geist Variable throughout. Main title 26–34px, section titles 16px, body 13–14px, metadata 11–12px. Tight heading tracking, normal body spacing, tabular counts.
- Surfaces 12–14px radius, controls 8px; default buttons at least 44px tall. Surfaces use borders rather than decorative shadows.

## Composition and behavior

Dashboard: heading and class action, real class/session summary, checking call to action, recent sessions, and a setup guide. Its connected Capture / Review / Save sequence explains the real workflow. Counts and recent sessions use existing services and shared query keys; session creation, deletion, and key confirmation refresh the dashboard. No demo data ships.

Lists share a bordered white surface, generous rows, explicit key status, and visible focus. Session names wrap. Checking includes search by session, class, or school year and distinguishes failed, empty, and unmatched requests.

Sign-in uses a forest introduction panel and white role-selection panel. Existing Google OAuth and role behavior are preserved. On phones the introduction becomes a compact section above the controls. Splash colors, favicon, and generated PWA icons share the palette. Raster icons come from scripts/generate-icons.mjs; no generated photographic assets are used.

Keyboard skip link, focus indicators, reduced-motion handling, native button semantics, error messages, and mobile bottom padding are required.

## Verification

### Checking screen refinement (2026-10-18)

The student picker now pairs a visible search label with roster progress and
explicit selected/checked states. Selection is exposed through aria-pressed.
Roster rows have a minimum 48px height and allow long names to wrap.

Paper review separates the student identity, review status, and final-score
summary. The summary previews a valid teacher override; invalid overrides have
associated inline help and disable saving. On phones, each answer stacks its
text, points, and confidence; above 640px those fields align into columns.
Answer text preserves line breaks and wraps long code. Penalty controls and point
inputs have minimum 44px heights. Rubric and maximum-point inputs have explicit
accessible names. Existing routes, theme, and grading behavior are retained.

Accessibility review scope: student selection, paper review, and answer-key essay
fields. WCAG 2.2 AA is the target baseline, not a compliance claim. Source and
server-rendered checks cover labels, selected state, validation associations,
and disabled saving. Browser inventory returned no connected surfaces; narrow
viewport rendering, zoom, keyboard/focus order, contrast measurement, and screen
reader behavior remain NOT VERIFIED. No browser screenshots were produced.

TypeScript, lint, regression tests, and production build are checked for this redesign. A rendered desktop/mobile browser review remains pending because this session has no available browser surface.

## Identity and responsive refinement - 2026-10-19

User requested consistent web/mobile design, installed PWA identity, and splash.
Inspected the local navigation, login, dashboard, install prompt, HTML and React
splash, manifest configuration, favicon, and raster icon generator. These existing
screens supply the visual reference: forest green, Geist, restrained surfaces.

Implemented one paper/check mark across login, desktop/mobile navigation, install
banner, favicon, and generated PWA assets. SVG and PNG use the same normalized
geometry and solid #17664d background. Apple touch icon has an opaque full-bleed
background; the maskable asset retains generous mark clearance. Startup HTML and
React loading use the same 88px mark and visible workspace-loading message, with
reduced-motion support. Native OS launch screens remain browser/platform controlled.

Preserved routes, authentication, grading and permissions. Improved input boundary
contrast, mobile input text sizing, long-content wrapping, header/navigation safe
areas, install control targets and expanded-state semantics. Existing error, empty,
success and disabled states are retained. No new dependencies or API changes.

Validation: lint passed; all 46 existing tests passed. Browser inventory returned
no apps or browsers, so rendered layouts at 320/390/768/1440px, keyboard navigation,
200% zoom, screen reader behavior, and native installed launch remain unverified.
The next acceptance step is a connected desktop/mobile visual review and actual
PWA install check. No deployment performed.
