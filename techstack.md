# ExamCheck — Tech Stack

## 1. Frontend

| Technology       | Purpose                       |
|------------------|-------------------------------|
| React            | Build the application UI      |
| TypeScript       | Type-safe development         |
| Vite             | Development/build tool        |
| Tailwind CSS     | Styling                       |
| shadcn/ui        | UI components                 |
| React Router     | Application navigation        |
| TanStack Query   | Server-state/data management  |
| React Hook Form  | Forms                         |
| Zod              | Validation                    |

## 2. PWA

| Technology        | Purpose                              |
|-------------------|--------------------------------------|
| vite-plugin-pwa   | Convert the React application into a PWA |
| Service Worker    | Caching/offline functionality        |
| Web App Manifest  | Installable application              |
| Browser Camera API| Capture student names and test papers|

The teacher can install ExamCheck on:

- Windows
- Android
- iPhone/iPad
- Tablets

## 3. Backend

Supabase will be the main backend.

| Supabase Feature | Purpose                                  |
|------------------|------------------------------------------|
| PostgreSQL       | Database                                 |
| Supabase Auth    | Teacher accounts                         |
| Edge Functions   | Secure server-side processing            |
| Row Level Security | Protect teacher/class data             |
| Realtime         | Optional live processing/status updates  |

Architecture:

```text
React PWA
    │
    ▼
Supabase
 ├── Auth
 ├── PostgreSQL
 ├── Edge Functions
 └── RLS
```

## 4. Image Processing

The image should be treated as temporary data.

```text
Camera
   ↓
Temporary Image
   ↓
OCR / Vision
   ↓
Extracted Text / Answers
   ↓
Save Results
   ↓
Delete Image
```

Technology

- Browser Camera API

For capturing:

- Student name
- Test paper
- Answer key

The browser can capture the image and send it directly for processing.

You don't need to permanently save it in Supabase Storage.

## 5. OCR / Vision

This is one of the most important parts of ExamCheck.

You need two recognition processes.

Student Name:

```text
Photo
 ↓
OCR
 ↓
"GARCIA, JERICO B."
 ↓
Student Matching
```

Student Answers:

```text
Test Paper Photo
 ↓
Vision/OCR
 ↓
Answers
 ↓
Answer Key Comparison
 ↓
Score
```

For handwritten answers, use a vision-capable AI model, because traditional OCR may struggle with handwriting.

## 6. AI Layer

Use AI only where it provides value.

```text
Normal OCR
   ↓
Can read clearly?
   │
   ├── YES → Use result
   │
   └── NO
        ↓
   Vision AI
        ↓
   Interpretation
        ↓
   Confidence
        ↓
   Teacher Review if uncertain
```

This can reduce AI API usage and cost.

## 7. Supabase Edge Functions

The AI API key should never be placed in React.

Instead:

```text
React PWA
    │
    │ Image/Text
    ▼
Supabase Edge Function
    │
    │ Secure API request
    ▼
OCR / Vision / AI
    │
    ▼
Extracted result
    │
    ▼
Supabase PostgreSQL
```

This keeps your API credentials secure.

## 8. Database

PostgreSQL through Supabase

Main tables:

```text
profiles
    │
    └── classes
          │
          └── students

classes
    │
    └── checking_sessions
          │
          ├── answer_keys
          │
          └── submissions
                │
                └── answers
```

profiles

| Column     |
|------------|
| id         |
| full_name  |
| email      |
| created_at |

classes

| Column      |
|-------------|
| id          |
| teacher_id  |
| block_name  |
| school_year |
| created_at  |

students

| Column         |
|----------------|
| id             |
| class_id       |
| name           |
| sort_name      |
| student_number |
| created_at     |

checking_sessions

| Column       |
|--------------|
| id           |
| class_id     |
| session_name |
| session_date |
| status       |
| created_at   |

answer_keys

| Column               |
|----------------------|
| id                   |
| checking_session_id  |
| question_number      |
| correct_answer       |
| question_type        |
| created_at           |

submissions

| Column               |
|----------------------|
| id                   |
| checking_session_id  |
| student_id           |
| score                |
| total_items          |
| status               |
| created_at           |

answers

| Column          |
|-----------------|
| id              |
| submission_id   |
| question_number |
| student_answer  |
| correct_answer  |
| confidence      |
| is_correct      |
| review_status   |
| created_at      |

## 9. Excel Import

Because you already have class records, use:

SheetJS (xlsx)

Workflow:

```text
Teacher's Excel Class Record
          ↓
        Upload
          ↓
       SheetJS
          ↓
 Extract Student Names
          ↓
       Preview
          ↓
 Teacher Confirms
          ↓
       Supabase
```

Also support:

```text
Copy from Excel
      ↓
 Paste into ExamCheck
      ↓
  Parse names
      ↓
Alphabetically sort
```

## 10. Export

Excel

- SheetJS

CSV

- Native TypeScript/JavaScript generation.

PDF

- jsPDF or another browser PDF library.

Results:

```text
No. | Student | Score | Percentage
----------------------------------
1   | AQUINO  | 42/50 | 84%
2   | CRUZ    | 45/50 | 90%
3   | GARCIA  | 43/50 | 86%
```

## 11. UI

Use:

- Tailwind CSS
- shadcn/ui

Important components:

- Data Table
- Dialog
- Alert
- Button
- Input
- Select
- Tabs
- Progress
- Toast
- Dropdown
- Confirmation Dialog

The interface should be optimized for fast teacher workflow, not overloaded with features.

## 12. Development Tools

Recommended:

- VS Code
- Git
- GitHub
- Node.js
- npm / pnpm
- Supabase CLI

Since you're already using VS Code and GitHub, this fits your current setup.

## 13. Complete Stack

```text
┌────────────────────────────────────────────┐
│              EXAMCHECK PWA                 │
├────────────────────────────────────────────┤
│                                            │
│ React                                      │
│ TypeScript                                 │
│ Vite                                       │
│ Tailwind CSS                               │
│ shadcn/ui                                  │
│ React Router                               │
│ TanStack Query                             │
│ React Hook Form                            │
│ Zod                                        │
│ vite-plugin-pwa                            │
│                                            │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│                  SUPABASE                  │
├────────────────────────────────────────────┤
│                                            │
│ PostgreSQL                                 │
│ Supabase Auth                              │
│ Edge Functions                             │
│ Row Level Security                         │
│ Realtime                                   │
│                                            │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│             OCR / VISION / AI              │
├────────────────────────────────────────────┤
│                                            │
│ Student Name Recognition                   │
│ Answer Recognition                         │
│ Handwriting Interpretation                 │
│ Confidence Detection                       │
│                                            │
└────────────────────────────────────────────┘
```

## 14. Final Stack Summary

| Category                 | Technology                     |
|--------------------------|--------------------------------|
| Frontend                 | React + TypeScript             |
| Build Tool               | Vite                           |
| PWA                      | vite-plugin-pwa                |
| Styling                  | Tailwind CSS                   |
| UI                       | shadcn/ui                      |
| Routing                  | React Router                   |
| Data Fetching            | TanStack Query                 |
| Forms                    | React Hook Form                |
| Validation               | Zod                            |
| Backend                  | Supabase                       |
| Database                 | PostgreSQL                     |
| Authentication           | Supabase Auth                  |
| Server Functions         | Supabase Edge Functions        |
| Security                 | Supabase RLS                   |
| Camera                   | Browser Camera API             |
| OCR                      | OCR/Vision API                 |
| Handwriting              | Vision-capable AI              |
| Excel Import             | SheetJS                        |
| Excel Export             | SheetJS                        |
| CSV                      | JavaScript/TypeScript          |
| PDF                      | jsPDF                          |
| Permanent Image Storage  | Not required                   |
| Version Control          | Git + GitHub                   |
| IDE                      | VS Code                        |

The core architecture:

```text
React PWA → Supabase Edge Function → OCR/Vision/AI → Extracted Data → Supabase PostgreSQL
```

No Laravel, no separate traditional backend, and no need to permanently store the student's exam photos for the production workflow.
