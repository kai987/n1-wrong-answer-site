-- JLPT N1 Wrong Answer Site - Supabase schema
-- Run once in Supabase Dashboard > SQL Editor.

create table if not exists public.wrong_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Exam source is stored separately so Q3 in 2025-12 and Q3 in 2025-07 are distinct records.
  source_exam text not null default '2025-12',
  question_number integer not null,
  category text not null check (category in ('文字・語彙','文法','読解')),
  subtype text,
  page text,
  stem text not null,
  context text,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  user_answer integer not null check (user_answer between 1 and 4),
  correct_answer integer not null check (correct_answer between 1 and 4),
  explanation text not null,
  wrong_reason text not null,
  key_point text,
  source_note text,
  review_step integer not null default 0 check (review_step between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  last_result text check (last_result is null or last_result in ('known','again')),
  mastered boolean not null default false,
  last_reviewed_at timestamptz,
  next_review_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_exam, question_number)
);

create index if not exists wrong_answers_user_next_review_idx
  on public.wrong_answers (user_id, next_review_at);
create index if not exists wrong_answers_user_category_idx
  on public.wrong_answers (user_id, category);
create index if not exists wrong_answers_user_source_exam_idx
  on public.wrong_answers (user_id, source_exam);

alter table public.wrong_answers enable row level security;

drop policy if exists "Users can view own wrong answers" on public.wrong_answers;
create policy "Users can view own wrong answers"
  on public.wrong_answers for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own wrong answers" on public.wrong_answers;
create policy "Users can insert own wrong answers"
  on public.wrong_answers for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own wrong answers" on public.wrong_answers;
create policy "Users can update own wrong answers"
  on public.wrong_answers for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own wrong answers" on public.wrong_answers;
create policy "Users can delete own wrong answers"
  on public.wrong_answers for delete
  using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_wrong_answers_updated_at on public.wrong_answers;
create trigger set_wrong_answers_updated_at
before update on public.wrong_answers
for each row execute function public.set_updated_at();
