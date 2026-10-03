# ExamCheck — Final Project Plan

## 1. Project Overview

**ExamCheck** is a teacher-focused application for checking handwritten examination papers faster.

The teacher provides:

1. A Class/Block
2. The student list
3. The answer key
4. Student name photos
5. Student test-paper photos

The system uses OCR, computer vision, and AI-assisted recognition to identify the student, read answers, compare them with the answer key, calculate the score, and record the result.

The teacher remains responsible for reviewing and confirming uncertain results.

---

## 2. Teacher's Complete Workflow

```text
TEACHER
   |
   v
Create Class/Block
   |
   +-- Import Class Record
   +-- Paste Student Names
   |
   v
Student List Created
   |
   v
Teacher Selects Class/Block
   |
   v
Start Checking Session
   |
   v
Upload Answer Key
   |
   v
Verify Answer Key
   |
   v
Start Checking
   |
   v
Take Photo of Student Name
   |
   v
Identify Student
   |
   v
Take Photo of Test Paper
   |
   v
Read Student Answers
   |
   v
Compare With Answer Key
   |
   +-- Confident --> Automatically accepted
   |
   +-- Uncertain --> Teacher reviews
   |
   v
Final Score
   |
   v
Save Result
   |
   v
Next Student
   |
   v
Class Results
   |
   v
Export Results
```

## 3. Teacher Module

The application is primarily designed around the teacher.

The teacher can:

- Create classes/blocks
- Import student lists
- Paste student names
- Edit student records
- Start checking sessions
- Upload answer keys
- Verify answer keys
- Capture student names
- Capture test papers
- Review AI results
- Correct scores
- View class results
- Export grades
- View previous checking sessions

## 4. Class/Block Management

The teacher first creates a Class/Block.

Example:

```text
Class/Block Name:
21-ITEW-01

School Year:
2026–2027
```

### Add Students

The teacher has two choices:

- Import Class Record
- Paste Names

Supported:

- Excel .xlsx
- CSV .csv

Example:

```text
GARCIA, JERICO B.
CRUZ, JUAN D.
AQUINO, PAOLO R.
SANTOS, MARIA L.
```

The system automatically sorts them alphabetically:

```text
01  AQUINO, PAOLO R.
02  CRUZ, JUAN D.
03  GARCIA, JERICO B.
04  SANTOS, MARIA L.
```

The original name format is preserved.

## 5. Reusable Class/Block

A Class/Block is created once.

Example:

```text
MY CLASSES

21-ITEW-01
50 students

21-ITEW-02
48 students

21-ITEW-03
52 students

SIA-01
45 students

OOP-01
42 students
```

The same class can be reused for every checking session.

```text
21-ITEW-01
|
+-- Students
|
+-- Checking Sessions
|   +-- Quiz 1
|   +-- Midterm
|   +-- Final
|
+-- Results
```

There is no need to recreate the student list.

## 6. Checking Session

There is no need to create an exam with questions.

The teacher simply selects:

```text
21-ITEW-01

[ Start Checking ]
```

The teacher can optionally give the checking session a label, such as:

```text
Midterm Examination
```

This label is only for organizing records. It is not an exam-building module.

## 7. Answer Key

The teacher uploads the existing answer key.

Supported initially:

- JPG
- PNG
- PDF

Example:

```text
1. B
2. C
3. A
4. D
5. B
...
50. C
```

The system reads the answer key using OCR/vision.

Before checking students:

```text
ANSWER KEY REVIEW

Question     Answer

01           B
02           C
03           A
04           D
05           B
06           A
...

[ Edit ]     [ Confirm Answer Key ]
```

The teacher confirms it before grading begins.

## 8. Checking Mode

After the answer key is confirmed:

```text
21-ITEW-01
Midterm Examination

Papers Checked: 0

[ Start ]
```

The application enters continuous checking mode.

## 9. Identify Student Using Name Photo

The teacher takes a picture of the student's name.

Example:

```text
GARCIA, JERICO B.
```

The system uses OCR/vision to read it and searches the class roster.

```text
STUDENT FOUND

GARCIA, JERICO B.

Match Confidence: 96%

[ Confirm ]
```

### If the Name Is Unclear

The system shows possible matches:

```text
Name detected:
"GARCIA JERICO B"

Possible students:

* GARCIA, JERICO B.
  GARCIA, JERICO A.
  GARCIA, JERICHO B.

[ Confirm Student ]
```

The teacher selects the correct student.

This prevents a wrong student from receiving another student's score.

## 10. Capture Student Paper

After the student is identified:

```text
Student:

GARCIA, JERICO B.

[ Take Test Paper Photo ]

[ Upload Existing Photo ]
```

The system processes the paper.

There is no need to identify the student again.

## 11. System Processes the Paper

The system automatically performs:

```text
Image
  |
  v
Image Preprocessing
  |
  v
Detect Questions
  |
  v
Read Answers
  |
  v
Compare With Answer Key
  |
  v
Calculate Score
```

## 12. Answer Recognition

Example:

```text
Question     Detected Answer

01           B
02           C
03           A
04           D
05           Encapsulation
```

The initial system should support:

- Multiple choice
- True/False
- Identification
- Short answers

## 13. Automatic Checking

The system compares the detected answers with the answer key.

Example:

```text
QUESTION     KEY             STUDENT          RESULT

1            B               B                Correct
2            C               C                Correct
3            A               D                Wrong
4            D               D                Correct
5            Encapsulation   Encapsulation    Correct
```

The system then calculates:

```text
GARCIA, JERICO B.

43 / 50

86%
```

## 14. AI-Assisted Handwriting Recognition

AI is primarily useful when the answer is handwritten or difficult to interpret.

Example:

```text
Student writing:

"Encapsulaton"

AI interpretation:

"Encapsulation"

Confidence: 94%
```

The system should not silently change the student's answer.

Uncertain interpretations are presented to the teacher for review.

## 15. Confidence and Review

The system identifies answers that need teacher attention.

Example:

```text
CHECK RESULT

43 answers confidently checked
3 answers require review

Review screen:

Question 37

Student Answer:
[ Image ]

AI Interpretation:
"Polymorphism"

Confidence:
74%

[ Accept ]
[ Edit Answer ]
[ Mark Wrong ]
```

The teacher makes the final decision.

## 16. Save and Next

After reviewing:

```text
GARCIA, JERICO B.

43 / 50
86%

[ Save & Next Student ]
```

The result is saved and the system returns to the next checking cycle.

The workflow is:

```text
PHOTO NAME
    |
    v
IDENTIFY
    |
    v
PHOTO PAPER
    |
    v
CHECK
    |
    v
REVIEW IF NEEDED
    |
    v
SAVE
    |
    v
NEXT
```

## 17. Papers Can Be Checked in Any Order

The teacher does not need to arrange the physical papers alphabetically.

Example:

```text
Paper 1 -> SANTOS
Paper 2 -> GARCIA
Paper 3 -> AQUINO
Paper 4 -> REYES
```

The system identifies each student and stores the result correctly.

The final result is automatically organized:

```text
01  AQUINO, PAOLO R.       42/50
02  CRUZ, JUAN D.          45/50
03  GARCIA, JERICO B.      43/50
04  REYES, CARLO M.        47/50
05  SANTOS, MARIA L.       41/50
```

## 18. Class Results

After checking:

```text
21-ITEW-01
Midterm Examination

Students:          50
Checked:           50
Needs Review:       2

Average:          84.32%
Highest:          98%
Lowest:           61%
```

The teacher can click a student to inspect their paper, answers, and score.

## 19. Manual Correction

If the system makes a mistake, the teacher can change the result.

```text
GARCIA, JERICO B.

System Score:
43 / 50

Teacher Final Score:
[ 45 ] / 50

[ Save Correction ]
```

The teacher's final score is recorded.

## 20. Results Export

The system should support:

- Excel
- CSV
- PDF

Example:

```text
CLASS: 21-ITEW-01

No.    Student              Score
------------------------------------
1      AQUINO, PAOLO R.     42
2      CRUZ, JUAN D.        45
3      GARCIA, JERICO B.    43
4      REYES, CARLO M.      47
5      SANTOS, MARIA L.     41
```

## 21. Main Application Screens

Keep the first version simple.

### Dashboard

```text
ExamCheck

[ Classes ]
[ Checking Sessions ]
[ Results ]
```

### Classes

Manage Class/Block and students.

### Checking

The main grading workspace:

```text
Select Class
      |
      v
Upload Answer Key
      |
      v
Start Checking
      |
      v
Photo Name
      |
      v
Photo Paper
      |
      v
Check
      |
      v
Review
      |
      v
Save & Next
```

### Results

View previous checking sessions and export grades.

## 22. Recommended Technology

Since the project is a web application (see `techstack.md`):

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **PWA:** vite-plugin-pwa
- **Routing/Data/Forms:** React Router, TanStack Query, React Hook Form, Zod
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions, RLS)
- **Image Processing:** Browser Camera API
- **OCR / Vision:** OCR engine / vision-capable AI model
- **AI:** Handwriting interpretation, difficult answer recognition, short-answer assistance, confidence estimation
- **Storage:** Temporary images only — no permanent exam-photo storage in production
- **Import/Export:** SheetJS (Excel), native TypeScript (CSV), jsPDF (PDF)

## 23. System Architecture

```text
                 TEACHER
                    |
                    v
              React PWA (Vite)
                    |
                    v
                Supabase
        +-----------+-----------+
        |           |           |
        v           v           v
   PostgreSQL    Supabase    Edge Functions
     (RLS)        Auth            |
                                  v
                             AI/Vision
                             |       |
                           OCR     Image Analysis
                             |       |
                             +---+---+
                                 |
                                 v
                          Answer Results
                                 |
                                 v
                        Supabase PostgreSQL
                                 |
                                 v
                          Teacher Review
```

## 24. Database Structure

```text
profiles
 |
 +-- classes
      |
      +-- students

classes
 |
 +-- checking_sessions
      |
      +-- answer_keys
      |
      +-- submissions
            |
            +-- student
            +-- answers
            +-- score
```

### Main Tables

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

## 25. Development Roadmap

### Phase 1 — Foundation

Build:

- Teacher login
- Dashboard
- Class/Block creation
- Import Excel/CSV
- Paste names
- Alphabetical sorting
- Student management

### Phase 2 — Answer Key

Build:

- Upload answer key
- OCR/vision extraction
- Answer-key preview
- Manual editing
- Confirm answer key

### Phase 3 — Student Identification

Build:

- Camera/photo upload
- Name OCR
- Roster matching
- Similar-name detection
- Teacher confirmation

### Phase 4 — Paper Checking

Build:

- Paper photo upload
- Image preprocessing
- Answer extraction
- Answer comparison
- Score calculation

### Phase 5 — Teacher Review

Build:

- Confidence scores
- Uncertain answer detection
- Accept/edit/reject
- Manual score correction

### Phase 6 — Results

Build:

- Alphabetical class results
- Student result view
- Statistics
- Excel export
- CSV export
- PDF export
- Checking history

## 26. MVP

The first working version should focus only on the essential workflow:

```text
CREATE CLASS/BLOCK
       |
       v
IMPORT / PASTE STUDENTS
       |
       v
ALPHABETICAL ROSTER
       |
       v
START CHECKING
       |
       v
UPLOAD ANSWER KEY
       |
       v
VERIFY KEY
       |
       v
PHOTO STUDENT NAME
       |
       v
IDENTIFY STUDENT
       |
       v
PHOTO TEST PAPER
       |
       v
READ ANSWERS
       |
       v
COMPARE WITH KEY
       |
       v
CALCULATE SCORE
       |
       v
SAVE
       |
       v
NEXT STUDENT
       |
       v
ALPHABETICAL RESULTS
```

## 27. Real-World Teacher Experience

### Before checking

The teacher:

Imports or pastes the class list, selects the block, and uploads the answer key.

### For each paper

The teacher:

Takes a picture of the student's name, confirms the student, takes a picture of the test paper, reviews the score if necessary, and saves.

### After checking

The teacher:

Views the alphabetical results, corrects anything necessary, and exports the grades.

## 28. Core Project Principle

ExamCheck should automate the repetitive work without removing teacher control.

Teacher provides:

- Class/Block
- Student roster
- Answer key
- Student papers

ExamCheck handles:

- Student identification
- Answer recognition
- Answer comparison
- Score calculation
- Result organization
- Export

Teacher controls:

- Student confirmation
- Answer-key correction
- Uncertain answer decisions
- Score corrections
- Final results
