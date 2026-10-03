# ExamCheck — Phase-by-Phase Development Breakdown

Develop slowly but surely: finish and test one phase before starting the next. Every phase has clear deliverables.

## Phase 0 — Project Setup (Foundation before features)

- [ ] Init Vite + React + TypeScript project
- [ ] Install & configure Tailwind CSS + shadcn/ui
- [ ] Set up Supabase project + Supabase CLI
- [ ] Configure `.env.example`, Supabase client, protected routes
- [ ] Basic layout shell (Dashboard / Classes / Checking / Results pages)
- [ ] Git repo + GitHub remote

**Deliverables:** Running app, `npm run dev`, Supabase connection verified.

## Phase 1 — Auth + Class/Student Management

- [ ] Teacher signup/login (Supabase Auth)
- [ ] Protected routes + RLS policies (teacher sees only own data)
- [ ] Create class/block (name, school year)
- [ ] Import students via Excel (SheetJS) / CSV / paste names
- [ ] Alphabetical sorting, student_number formatting (`01`, `02`, ...)
- [ ] Edit/delete students, class list view

**Deliverables:** Teacher can log in, create 21-ITEW-01 with 50 imported students.

## Phase 2 — Answer Key

- [ ] Upload answer key (JPG/PNG/PDF)
- [ ] Edge Function → OCR/vision extraction of answers
- [ ] Answer key review table (editable)
- [ ] Confirm answer key → locked per session

**Deliverables:** Confirmed answer key stored in DB, editable before confirm.

## Phase 3 — Student Identification

- [ ] Camera capture (Browser Camera API) / photo upload
- [ ] Name OCR via Edge Function
- [ ] Roster matching: exact → fuzzy → possible matches
- [ ] Teacher confirmation / manual selection fallback

**Deliverables:** `GARCIA, JERICO B.` detected → matched to roster with confidence.

## Phase 4 — Paper Checking + Scoring

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
