# ExamCheck — Phase-by-Phase Development Breakdown

Develop slowly but surely: finish and test one phase before starting the next. Every phase has clear deliverables.

## Phase 0 — Project Setup (Foundation before features) — ✅ DONE

- [x] Init Vite + React + TypeScript project
- [x] Install & configure Tailwind CSS + shadcn/ui
- [x] Set up Supabase project + Supabase CLI
- [x] Configure `.env.example`, Supabase client, protected routes
- [x] Basic layout shell (Dashboard / Classes / Checking / Results pages)
- [x] Git repo + GitHub remote

**Status:** ✅ DONE (Supabase connection verified, build + typecheck PASS)

**Deliverables:** Running app, `npm run dev`, Supabase connection verified.

## Phase 1 — Auth + Class/Student Management — ✅ DONE

- [x] Teacher signup/login (Supabase Auth) — Google OAuth
- [x] Protected routes + RLS policies (teacher sees only own data)
- [x] Create class/block (name, school year)
- [x] Import students via Excel (SheetJS) / CSV / paste names
- [x] Alphabetical sorting, student_number formatting (`01`, `02`, ...)
- [x] Edit/delete students, class list view

**Status:** ✅ DONE (Google login + class creation + RLS verified working)

## Phase 2 — Answer Key — ✅ DONE

- [x] Answer key paste (simplified, no upload/OCR)
- [x] Editable preview + Save draft
- [x] Confirm answer key → locked per session
- [ ] ~~Edge Function → OCR/vision extraction~~ (deferred: OCR costs credits)

**Status:** ✅ DONE (via text paste; migration 0002 run; confirm flow verified)

## Phase 3 — Student Identification — ✅ DONE (simplified)

- [x] Student selected from class dropdown (no OCR needed, no credits used)
- [x] Camera capture still available for reference photo
- [ ] ~~Name OCR via Edge Function~~ (removed — teacher selects student manually since papers are randomly arranged)
- [ ] ~~Roster matching: exact → fuzzy → possible matches~~

**Status:** ✅ DONE (manual selection; teacher controls who is being checked)

## Phase 4 — Paper Checking + Scoring — 🔵 CURRENT

- [ ] Capture/upload test paper image
- [ ] Edge Function: preprocessing → detect questions → read answers
- [ ] Answer types: multiple choice, T/F, identification, short answer
- [ ] Deterministic comparison vs answer key
- [ ] Centralized `calculateScore` → score, percentage

**Deliverables:** 43/50, 86% computed and stored as a submission.

## Phase 5 — Review + Correction

- [ ] Confidence scores per answer; flag uncertain
- [ ] Review screen: accept / edit answer / mark wrong
- [ ] Manual score adjustment by teacher
- [ ] Low-confidence AI interpretations never auto-accepted

**Deliverables:** Uncertain items routed to teacher; final teacher-approved score.

## Phase 6 — Results + Export

- [ ] Class results view (alphabetical, avg/highest/lowest, needs-review count)
- [ ] Per-student submission detail
- [ ] Checking session history
- [ ] Export Excel / CSV / PDF

**Deliverables:** Exportable grades matching the plan's format.

## Phase 7 — PWA + Polish

- [ ] vite-plugin-pwa: manifest, service worker, offline shell
- [ ] Installable on phone/tablet; camera-optimized checking UI
- [ ] Error handling, loading/empty states, responsive checks
- [ ] Final QA pass per AGENT_SKILLS.md §46 checklist

**Deliverables:** Installable PWA, polished UI, all QA checks passing.
