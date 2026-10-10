# ExamCheck

A teacher-focused PWA for checking **handwritten exam papers faster**. Snap a
photo of a student's answer sheet, let an AI vision model read the answers, and
ExamCheck compares them against your answer key and computes the score — while
you stay in control of every uncertain result.

> ExamCheck is **not** an exam-creation platform or LMS. You already have the
> exam and the answer key; this app just makes grading them much quicker.

---

## How it works

```
Teacher
  │
  ├─ creates a Class / Block and imports the student roster
  │
  ├─ starts a Check session and pastes the answer key
  │
  └─ for each paper:
       select student → capture paper photo
            │
            ▼
       Supabase Edge Function (read-answers)
            │  secure call, API key stays server-side
            ▼
       Gemini vision model
            │  reads each answer using the expected type
            ▼
       Deterministic scoring (lib/scoring.ts)
            │  compare vs. answer key, per question
            ▼
       Teacher reviews uncertain / essay answers
            │
            ▼
       Save result → Class results → Export (Excel / CSV / PDF)
```

### Key ideas

- **Answer types drive the reading.** Every question in your key has a type —
  multiple choice, true/false, identification, coding/debugging, or essay — and
  the AI is told exactly what to expect. This stops a coding part from being
  read as multiple choice.
- **Order, not printed numbers.** Paste the key top-to-bottom in paper order;
  ExamCheck numbers it 1…N continuously. Parts that restart at 1 on paper are
  ignored, so multi-part exams "just work". Optional `# Heading` lines let you
  declare each part's type.
- **Deterministic scoring.** The AI only reads answers. Scoring, normalization,
  and pass/fail are plain code — never the AI.
- **The teacher decides.** Low-confidence readings, coding mismatches, essay
  scores, and rule violations (e.g. "erasure detected") are surfaced for review.
  Nothing uncertain is silently marked final.

---

## Features

| Area | What you get |
|------|--------------|
| **Auth** | Google sign-in (Supabase Auth) |
| **Classes** | Create blocks, import students from Excel/CSV or paste names, auto-sorted alphabetically with `01, 02…` numbering |
| **Answer key** | Paste a key, auto-detect or declare question types, edit, validate, confirm & lock |
| **Checking** | Pick a student, capture/upload the paper, AI reads answers, score computed instantly |
| **Review** | Confidence per answer, uncertain-answer review, essay rubric grading, teacher score override |
| **Rule checks** | Optional rules ("no erasures") flagged by the AI — advisory and dismissible, never auto-failed |
| **Results** | Full class roster (checked & unchecked), average/highest/lowest/pass rate, per-student breakdown |
| **Export** | Excel, CSV, and PDF (browser print) |
| **PWA** | Installable on phone/tablet/desktop, offline app shell, teacher-triggered updates |

---

## Tech stack

- **Frontend:** React 19 + TypeScript + Vite
- **Styling/UI:** Tailwind CSS v4 + shadcn/ui (Base UI)
- **Routing:** React Router
- **Server state:** TanStack Query
- **Forms/validation:** React Hook Form + Zod
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, RLS)
- **AI:** Google Gemini (vision) via a Supabase Edge Function
- **Spreadsheets:** SheetJS (Excel), native TS (CSV)
- **PWA:** vite-plugin-pwa

---

## Getting started

### 1. Prerequisites

- Node.js 24+ and npm
- A Supabase project
- A Gemini API key (Google AI Studio)

### 2. Install

```bash
npm install
```

### 3. Environment

Copy `.env.example` to `.env` and fill in your Supabase project values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

> Only the publishable (anon) key belongs in the frontend. The Gemini API key is
> a **server secret** and must never be exposed to the browser.

### 4. Database

Run the migrations in `supabase/migrations/` in order (via the Supabase SQL
Editor or `supabase db push`):

| Migration | Purpose |
|-----------|---------|
| `0001_init.sql` | Core schema (profiles, classes, students, sessions, answer_keys, submissions, answers) + RLS |
| `0002_answer_key.sql` | Answer-key confirmation flag + unique index |
| `0003_rules.sql` | Checking rules on the session |
| `0004_coding_essay.sql` | Coding/essay support (rubrics, points, review flags) |
| `0005_submission_unique.sql` | One submission per (session, student); removes duplicates |
| `0006_qa_integrity.sql` | Atomic saves, numeric grades, class integrity, confirmed-key locking |
| `0007_reader_limits.sql` | Authenticated per-user recognition request limits |
| `0008_class_archive.sql` | Reversible class archiving; prevents teacher class deletion |

> ⚠️ `0005` deletes existing duplicate submissions, keeping the most recent per
> student. Review it before running on a database with real data.

### 5. Edge Function secret

Set the Gemini key as a Supabase secret, then deploy the function:

```bash
supabase secrets set GEMINI_API_KEY=your-key
supabase functions deploy read-answers
```

### 6. Run

```bash
npm run dev
```

Then open the printed URL (HTTPS via the local SSL plugin, so camera access works).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build (best for testing PWA install) |
| `npm run lint` | Run oxlint; warnings fail verification |
| `npm test` | Run grading, import, export, validation, and local PostgreSQL tests |
| `npm run check:edge` | Type-check the Deno Edge Function |
| `npm run verify` | Run lint, tests, Edge Function checks, and production build |
| `npm run icons` | Regenerate the PWA icons |

---

## Project structure

```
src/
  components/
    ui/                 shadcn/ui primitives
    session/            checking-flow components (answer key, student picker, result card, review)
    AppLayout.tsx       app shell (header, nav, offline/install banners)
    CameraCapture.tsx   camera capture (imperative handle for retake)
    ErrorBoundary.tsx   render-error safety net
    InstallPrompt.tsx   PWA install banner
  hooks/                useAnswerReview, useOnlineStatus, useInstallPrompt
  lib/
    scoring.ts          answer normalization + deterministic scoring
    answerKey.ts        answer-key parsing (headings, type detection)
    readPaper.ts        Edge Function call + answer scoring
    export.ts           CSV / Excel / PDF export
    grading.ts          pass/fail threshold + remarks
    confidence.ts       display confidence fallback
    supabase.ts         Supabase client
  pages/                Dashboard, Classes, ClassDetail, Session, Checking, Results, SessionResults, Login
  services/             class / student / session / submission / results data access
supabase/
  functions/read-answers/   Gemini vision Edge Function
  migrations/               SQL migrations
```

---

## Data model

```
profiles (teachers)
  └── classes
        └── students
        └── checking_sessions
              ├── answer_keys        (per-question type, rubric, points)
              └── submissions        (one per student per session)
                    └── answers      (per-question result + confidence + points)
```

Row Level Security ensures every teacher can only access their **own** classes,
students, sessions, and results.

---

## Privacy

Exam paper photos are **temporary**. They are captured in the browser, sent to
the Edge Function for reading, and never stored permanently — matching the
project's privacy rules. Only the extracted answers and scores are saved.

---

## Status

Feature phases 0–7 are implemented. QA fixes are covered by automated regression
checks; live deployment and authenticated mobile/browser acceptance testing remain
pending. See [QA_REPORT.md](QA_REPORT.md) for evidence and remaining limits.

## Deploying the QA fixes

1. Use a coordinated maintenance window. Existing installed clients use the old
   write API and must reload after this rollout.
2. Apply only the new migrations, `0006_qa_integrity.sql` and
   `0007_reader_limits.sql`, after confirming migrations 0001–0005 are already applied.
   These new migrations do not delete existing grades. Do not rerun 0005 against
   real data as part of this rollout.
3. Deploy `read-answers` with the configuration in `supabase/config.toml`;
   JWT verification stays enabled and the handler validates the signed-in user.
4. Deploy the new frontend and reload installed clients. Verify a synthetic class
   workflow before grading real papers.

The frontend now requires the transactional RPCs. The reader requires a session
ID, loads the owner's confirmed key through RLS, and enforces 120 requests per
hour and 500 across the current and preceding 23 hourly buckets per user. Failed
provider requests count toward the limit. Adjust these documented limits in a
reviewed migration if the workload needs a different budget.

Final saves require all uncertain answers to be accepted or edited by the teacher.
Original AI confidence remains visible after review. Fractional final scores are
supported, and the database also records the sum of the answer points separately
from a teacher-adjusted final score.

Existing grades are not automatically recalculated. Review legacy sessions whose
keys had numeric answers, restarted numbering, or coding normalization errors;
create a new checking session when a confirmed key needs correction.

The local database suite uses isolated PGlite PostgreSQL with synthetic identities;
it does not connect to the live Supabase project. Browser OAuth, hardware camera,
mobile layout, offline/install, and update acceptance still require live testing.

SheetJS is pinned to its official 0.20.3 distribution (see
[official installation instructions](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)).
The component-generation CLI is a development dependency. Production dependency
audit is clear; its development-only braces dependency still has an upstream
advisory with no patched version, so a forced CLI downgrade was not applied.

### Deploy through the Supabase dashboard editor

The editor upload must include every imported file. Pasting the CLI entry alone
can fail because `../_shared/validation.ts` is not in the editor bundle.

Run `npm run bundle:reader`, then copy the entire generated
[dashboard.ts](supabase/functions/read-answers/dashboard.ts) into the dashboard's
`index.ts` editor for `read-answers` and deploy. This file contains the validated
handler and all validation code, with no external file imports. Keep JWT verification
enabled. The normal `index.ts` remains the entry point for CLI deployment.

Edit the original handler or shared validator and regenerate; do not manually edit
`dashboard.ts`. `npm run verify` checks that the generated file is current.

### PWA launch appearance

The native launch screen uses the manifest background and generated icons; the HTML startup screen and authentication/loading fallback share ExamCheck branding without an artificial delay. Run `npm run icons` after changing the icon generator. Redeploy the frontend and accept the PWA update. Installed icon/launch metadata may require removing the home-screen app and installing it again. Verify cold launches on Android and iOS; platform-native splash layouts vary.

Future AI provider work is tracked in [future-plan.md](future-plan.md).

### Class archive rollout

Apply `supabase/migrations/0008_class_archive.sql` in the Supabase SQL Editor (or via the linked CLI) before deploying this frontend. It adds a nullable archive timestamp without changing existing class data and revokes permanent class deletion from client roles. Owner RLS still applies to archive and restore. Classes → Archive moves a class out of Active, Checking, and Results lists; Classes → Archived → Restore brings it back with its students, sessions, keys, and grades intact. Archived class history remains accessible.
