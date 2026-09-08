alter table public.wrong_answers
  add column if not exists passage text;

alter table public.wrong_answers
  drop constraint if exists wrong_answers_text_lengths;

alter table public.wrong_answers
  add constraint wrong_answers_text_lengths
    check (
      char_length(coalesce(subtype,'')) <= 120
      and char_length(coalesce(page,'')) <= 50
      and char_length(stem) between 1 and 10000
      and char_length(coalesce(context,'')) <= 50000
      and char_length(coalesce(passage,'')) <= 100000
      and char_length(explanation) between 1 and 20000
      and char_length(wrong_reason) between 1 and 20000
      and char_length(coalesce(key_point,'')) <= 5000
      and char_length(coalesce(source_note,'')) <= 1000
    );

create or replace function public.replace_wrong_answers(p_items jsonb)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer := 0;
begin
  if v_user_id is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'import payload must be an array'; end if;
  if jsonb_array_length(p_items) < 1 then raise exception 'import payload cannot be empty'; end if;
  if jsonb_array_length(p_items) > 2000 then raise exception 'too many imported questions'; end if;

  if exists (select 1 from jsonb_array_elements(p_items) as e where jsonb_typeof(e) <> 'object') then
    raise exception 'every imported item must be an object';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e
    where coalesce(e->>'source_exam','') !~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
       or coalesce(e->>'question_number','') !~ '^[0-9]{1,3}$'
       or (e->>'category') not in ('文字・語彙','文法','読解')
       or length(coalesce(e->>'subtype','')) > 120
       or length(coalesce(e->>'page','')) > 50
       or coalesce(e->>'page','') ~ '[<>]'
       or length(coalesce(e->>'stem','')) < 1
       or length(coalesce(e->>'stem','')) > 10000
       or length(coalesce(e->>'context','')) > 50000
       or length(coalesce(e->>'passage','')) > 100000
       or coalesce(e->>'user_answer','') !~ '^[1-4]$'
       or coalesce(e->>'correct_answer','') !~ '^[1-4]$'
       or length(coalesce(e->>'explanation','')) < 1
       or length(coalesce(e->>'explanation','')) > 20000
       or length(coalesce(e->>'wrong_reason','')) < 1
       or length(coalesce(e->>'wrong_reason','')) > 20000
       or length(coalesce(e->>'key_point','')) > 5000
       or length(coalesce(e->>'source_note','')) > 1000
  ) then raise exception 'one or more imported fields are invalid'; end if;

  if exists (select 1 from jsonb_array_elements(p_items) as e where jsonb_typeof(e->'options') <> 'array' or jsonb_array_length(e->'options') <> 4) then
    raise exception 'each item must contain exactly four options';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e, jsonb_array_elements(e->'options') as opt
    where jsonb_typeof(opt) <> 'string' or length(opt #>> '{}') < 1 or length(opt #>> '{}') > 2000
  ) then raise exception 'one or more options are invalid'; end if;
  if exists (select 1 from jsonb_array_elements(p_items) as e where jsonb_typeof(e->'option_explanations') <> 'array' or jsonb_array_length(e->'option_explanations') <> 4) then
    raise exception 'each item must contain exactly four option explanations';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as e, jsonb_array_elements(e->'option_explanations') as x
    where jsonb_typeof(x) <> 'string' or length(x #>> '{}') > 10000
  ) then raise exception 'one or more option explanations are invalid'; end if;

  delete from public.wrong_answers where user_id = v_user_id;

  insert into public.wrong_answers (
    user_id, source_exam, question_number, category, subtype, page,
    stem, context, passage, options, option_explanations, user_answer, correct_answer,
    explanation, wrong_reason, key_point, source_note,
    review_step, review_count, last_result, mastered, next_review_at
  )
  select
    v_user_id, x.source_exam, x.question_number, x.category,
    nullif(x.subtype,''), nullif(x.page,''), x.stem, nullif(x.context,''), nullif(x.passage,''),
    x.options, x.option_explanations, x.user_answer, x.correct_answer,
    x.explanation, x.wrong_reason, nullif(x.key_point,''), nullif(x.source_note,''),
    coalesce(x.review_step,0), coalesce(x.review_count,0), x.last_result,
    coalesce(x.mastered,false), coalesce(x.next_review_at,current_date)
  from jsonb_to_recordset(p_items) as x(
    source_exam text, question_number integer, category text, subtype text, page text,
    stem text, context text, passage text, options jsonb, option_explanations jsonb,
    user_answer integer, correct_answer integer,
    explanation text, wrong_reason text, key_point text, source_note text,
    review_step integer, review_count integer, last_result text, mastered boolean,
    next_review_at date
  );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.replace_wrong_answers(jsonb) from public;
revoke execute on function public.replace_wrong_answers(jsonb) from anon;
grant execute on function public.replace_wrong_answers(jsonb) to authenticated;
