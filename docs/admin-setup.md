# Admin setup

Apply `supabase/migrations/0009_admin.sql` after migrations 0001–0008, then deploy the updated `read-answers` Edge Function and frontend together. The frontend requires this migration. No live changes are made by creating these files.

Sign in once with the Google account that will be the administrator. In the Supabase SQL Editor, find the account by email, verify its UUID, then provision it using that UUID:

```sql
select id, email from public.profiles where email = 'YOUR_ADMIN_EMAIL';

insert into public.account_controls(user_id, is_admin)
values ('VERIFIED_ACCOUNT_UUID', true)
on conflict (user_id) do update set is_admin = true, suspended = false;
```

Refresh the app. Open **Admin** in the navigation or `/admin`. Ordinary users cannot assign roles. Admins can search accounts, suspend/restore teachers, view aggregate totals and a 30-day UTC reader chart, and pause/resume the app. Suspension preserves existing records and blocks app data access even for existing sessions; Google sign-in remains available so users can see the suspension notice.

Pause blocks teacher data access, atomic saves, and new AI calls. Admin controls remain available. The UI polls status every 15 seconds; database enforcement does not depend on polling. Provider calls already dispatched may finish and consume credits, and a concurrent pause cannot recall a dispatched request. Every retry/fallback rechecks access. Reader counts measure admitted recognition requests, including failed reads, rather than tokens, retries, money or remaining credits.

Account changes and pause/resume actions are recorded in the protected `admin_events` table. Teachers' classes, students, answers and grades remain protected by existing ownership rules. Account management does not include deletion, invitations or role editing.

Rollback: first resume the app and restore accounts, then roll back the frontend/reader if needed. Keep migration 0009 to preserve controls and audit history; removing protections requires a separately reviewed migration. Do not restore older save RPC definitions while relying on suspension enforcement.
