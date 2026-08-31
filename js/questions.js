import { SEED_QUESTIONS } from './data/seed-data.js';
import { dateOnly, isoToday, normalizeSource } from './utils.js';

export function getOptionExplanations(question) {
  const stored = question?.optionExplanations ?? question?.option_explanations;
  const result = Array.isArray(stored) && stored.length === 4
    ? stored.map(value => String(value ?? '').trim())
    : ['', '', '', ''];

  const correct = Number(question?.correctAnswer ?? question?.correct_answer);
  const user = Number(question?.userAnswer ?? question?.user_answer);
  const explanation = String(question?.explanation ?? '').trim();
  const wrongReason = String(question?.wrongReason ?? question?.wrong_reason ?? '').trim();

  if (correct >= 1 && correct <= 4 && !result[correct - 1] && explanation) {
    result[correct - 1] = explanation;
  }
  if (user >= 1 && user <= 4 && !result[user - 1] && wrongReason) {
    result[user - 1] = wrongReason;
  }

  return result;
}

export function seedQuestions() {
  return SEED_QUESTIONS.map(question => ({
    ...question,
    options: [...question.options],
    optionExplanations: [...question.optionExplanations],
  }));
}

export function rowToItem(row) {
  const item = {
    id: row.id,
    sourceExam: normalizeSource(row.source_exam),
    number: row.question_number,
    category: row.category,
    subtype: row.subtype || '',
    page: row.page || '—',
    stem: row.stem,
    context: row.context || '',
    options: row.options || [],
    optionExplanations: row.option_explanations || ['', '', '', ''],
    userAnswer: row.user_answer,
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    wrongReason: row.wrong_reason,
    keyPoint: row.key_point || '',
    sourceNote: row.source_note || '',
    reviewStep: row.review_step || 0,
    reviewCount: row.review_count || 0,
    lastResult: row.last_result || null,
    mastered: Boolean(row.mastered),
    nextReview: row.next_review_at || dateOnly(isoToday()),
    createdAt: row.created_at,
  };

  item.optionExplanations = getOptionExplanations(item);
  return item;
}

export function itemToRow(question) {
  return {
    source_exam: normalizeSource(question.sourceExam),
    question_number: question.number,
    category: question.category,
    subtype: question.subtype || null,
    page: String(question.page || ''),
    stem: question.stem,
    context: question.context || null,
    options: question.options,
    option_explanations: getOptionExplanations(question),
    user_answer: question.userAnswer,
    correct_answer: question.correctAnswer,
    explanation: question.explanation,
    wrong_reason: question.wrongReason,
    key_point: question.keyPoint || null,
    source_note: question.sourceNote || null,
    review_step: question.reviewStep || 0,
    review_count: question.reviewCount || 0,
    last_result: question.lastResult || null,
    mastered: Boolean(question.mastered),
    next_review_at: question.nextReview || dateOnly(isoToday()),
  };
}
