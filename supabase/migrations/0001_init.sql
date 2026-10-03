-- ExamCheck initial schema
-- Run in Supabase SQL Editor or via: supabase db push

create extension if not exists "pgcrypto";

-- profiles (teacher accounts)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  block_name text not null,
  school_year text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  name text not null,
  sort_name text not null,
  student_number text,
  created_at timestamptz not null default now()
);

create index if not exists students_class_id_idx on public.students (class_id);

create table if not exists public.checking_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  session_name text,
  session_date date not null default current_date,
  status text not null default 'in_progress',
  created_at timestamptz not null default now()
);

create table if not exists public.answer_keys (
  id uuid primary key default gen_random_uuid(),
  checking_session_id uuid not null references public.checking_sessions (id) on delete cascade,
  question_number int not null,
  correct_answer text not null,
  question_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  checking_session_id uuid not null references public.checking_sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  score int,
  total_items int,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  question_number int not null,
  student_answer text,
  correct_answer text,
  confidence numeric,
  is_correct boolean,
  review_status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.checking_sessions enable row level security;
alter table public.answer_keys enable row level security;
alter table public.submissions enable row level security;
alter table public.answers enable row level security;

create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "classes: own" on public.classes
  for all using (auth.uid() = teacher_id) with check (auth.uid() = teacher_id);

create policy "students: via class owner" on public.students
  for all using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));

create policy "sessions: via class owner" on public.checking_sessions
  for all using (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()))
  with check (exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid()));

create policy "answer_keys: via session owner" on public.answer_keys
  for all using (exists (
    select 1 from public.checking_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = checking_session_id and c.teacher_id = auth.uid()))
  with check (exists (
    select 1 from public.checking_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = checking_session_id and c.teacher_id = auth.uid()));

create policy "submissions: via session owner" on public.submissions
  for all using (exists (
    select 1 from public.checking_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = checking_session_id and c.teacher_id = auth.uid()))
  with check (exists (
    select 1 from public.checking_sessions s
    join public.classes c on c.id = s.class_id
    where s.id = checking_session_id and c.teacher_id = auth.uid()));

create policy "answers: via submission owner" on public.answers
  for all using (exists (
    select 1 from public.submissions sub
    join public.checking_sessions s on s.id = sub.checking_session_id
    join public.classes c on c.id = s.class_id
    where sub.id = submission_id and c.teacher_id = auth.uid()))
  with check (exists (
    select 1 from public.submissions sub
    join public.checking_sessions s on s.id = sub.checking_session_id
    join public.classes c on c.id = s.class_id
    where sub.id = submission_id and c.teacher_id = auth.uid()));
