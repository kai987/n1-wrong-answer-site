import { DEFAULT_SOURCE_EXAM, SEED_VERSION } from './constants.js';
import { itemToRow, rowToItem, seedQuestions } from './questions.js';
import { requireSupabase } from './supabase.js';
import { dateOnly, isoToday } from './utils.js';

export async function ensureSeed() {
  const sb = requireSupabase();
  const rows = seedQuestions().map(itemToRow);
  const { data, error } = await sb.rpc('initialize_wrong_answers_exam', {
    p_source_exam: DEFAULT_SOURCE_EXAM,
    p_seed_version: SEED_VERSION,
    p_items: rows,
  });
  if (error) throw error;
  return data === true;
}

export async function loadQuestions(userId, { ensureDefault = true } = {}) {
  const sb = requireSupabase();
  if (ensureDefault) await ensureSeed();

  const { data, error } = await sb
    .from('wrong_answers')
    .select('*')
    .eq('user_id', userId)
    .order('source_exam', { ascending: false })
    .order('question_number', { ascending: true });

  if (error) throw error;
  return (data || []).map(rowToItem);
}

export async function saveReview(question, userId) {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('wrong_answers')
    .update({ ...itemToRow(question), last_reviewed_at: new Date().toISOString() })
    .eq('id', question.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return rowToItem(data);
}

export async function saveQuestion(question, userId) {
  const sb = requireSupabase();

  if (question.id) {
    const { data, error } = await sb
      .from('wrong_answers')
      .update(itemToRow(question))
      .eq('id', question.id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return rowToItem(data);
  }

  const { data, error } = await sb
    .from('wrong_answers')
    .insert({ ...itemToRow(question), user_id: userId })
    .select()
    .single();

  if (error) throw error;
  return rowToItem(data);
}

export async function deleteQuestion(id, userId) {
  const sb = requireSupabase();
  const { error } = await sb
    .from('wrong_answers')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function resetProgress(userId) {
  const sb = requireSupabase();
  const { error } = await sb
    .from('wrong_answers')
    .update({
      review_step: 0,
      next_review_at: dateOnly(isoToday()),
      review_count: 0,
      last_result: null,
      mastered: false,
      last_reviewed_at: null,
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function restoreDefaultExam() {
  const sb = requireSupabase();
  const rows = seedQuestions().map(itemToRow);
  const { data, error } = await sb.rpc('replace_wrong_answers_for_exam', {
    p_source_exam: DEFAULT_SOURCE_EXAM,
    p_items: rows,
    p_seed_version: SEED_VERSION,
  });
  if (error) throw error;
  return Number.isInteger(data) ? data : rows.length;
}

export async function replaceAllQuestions(items) {
  const sb = requireSupabase();
  const rows = items.map(itemToRow);
  const { data, error } = await sb.rpc('replace_wrong_answers', { p_items: rows });
  if (error) throw error;
  return Number.isInteger(data) ? data : items.length;
}
