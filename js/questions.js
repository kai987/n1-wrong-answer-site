import { DEFAULT_SOURCE_EXAM } from './constants.js';
import { dateOnly, isoToday, normalizeSource } from './utils.js';

function optionExplanationMap(sourceExam, number) {
  const source = normalizeSource(sourceExam || DEFAULT_SOURCE_EXAM);
  const mapped = window.OPTION_EXPLANATIONS?.[source]?.[Number(number)];
  return Array.isArray(mapped) && mapped.length === 4
    ? mapped.map(value => String(value || '').trim())
    : ['', '', '', ''];
}

export function getOptionExplanations(question) {
  const source = question?.sourceExam ?? question?.source_exam ?? DEFAULT_SOURCE_EXAM;
  const number = question?.number ?? question?.question_number;
  const result = optionExplanationMap(source, number);
  const stored = question?.optionExplanations ?? question?.option_explanations;

  if (Array.isArray(stored) && stored.length === 4) {
    stored.forEach((value, index) => {
      const text = String(value ?? '').trim();
      if (text) result[index] = text;
    });
  }

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
  const seed = Array.isArray(window.SEED) ? window.SEED : [];
  return seed.map(question => ({
    ...question,
    sourceExam: normalizeSource(question.sourceExam || DEFAULT_SOURCE_EXAM),
    optionExplanations: getOptionExplanations(question),
  }));
}

export function seedToRow(question, userId) {
  return {
    user_id: userId,
    source_exam: normalizeSource(question.sourceExam || DEFAULT_SOURCE_EXAM),
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
    review_step: 0,
    review_count: 0,
    last_result: null,
    mastered: false,
    next_review_at: dateOnly(isoToday()),
  };
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
