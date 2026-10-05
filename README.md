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
| **PWA** | Installable on phone/tablet/desktop, offline app shell, update handling |

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

- Node.js 20+ and npm
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
| `npm run lint` | Run oxlint |
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

All development phases (0–7) are complete: foundation, auth + class management,
answer key, student selection, paper checking + scoring, review + correction,
results + export, and PWA polish.
