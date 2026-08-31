import { INTERVALS } from './constants.js';
import { addDaysFrom, dateOnly, isoToday } from './utils.js';

export function todayString() {
  return dateOnly(isoToday());
}

export function isDue(question, today = todayString()) {
  return !question.mastered && (!question.nextReview || question.nextReview <= today);
}

export function applyReviewResult(question, known, today = todayString()) {
  const next = {
    ...question,
    reviewCount: (question.reviewCount || 0) + 1,
    lastResult: known ? 'known' : 'again',
  };

  if (!known) {
    next.reviewStep = 0;
    next.nextReview = addDaysFrom(today, 1);
    next.mastered = false;
    return next;
  }

  next.reviewStep = Math.min((question.reviewStep || 0) + 1, INTERVALS.length);
  const interval = INTERVALS[Math.min(next.reviewStep - 1, INTERVALS.length - 1)];
  next.nextReview = addDaysFrom(today, interval);
  next.mastered = next.reviewStep >= INTERVALS.length;
  return next;
}

export function filterQuestions(items, filters, today = todayString()) {
  const search = String(filters.search || '').trim().toLowerCase();
  return items.filter(question => {
    if (filters.source !== 'all' && question.sourceExam !== filters.source) return false;
    if (filters.category !== 'all' && question.category !== filters.category) return false;
    if (!search) return true;

    const searchable = [
      question.sourceExam,
      question.number,
      question.category,
      question.subtype,
      question.stem,
      question.keyPoint,
      ...(question.options || []),
      ...(question.optionExplanations || []),
    ].join(' ').toLowerCase();

    return searchable.includes(search);
  });
}

export function buildDueQueue(items, filters, today = todayString()) {
  const scoped = filterQuestions(items, filters, today);
  let queue = scoped.filter(question => isDue(question, today));
  if (!queue.length) queue = scoped.filter(question => !question.mastered);

  return queue.sort((a, b) =>
    b.sourceExam.localeCompare(a.sourceExam)
    || String(a.nextReview || '').localeCompare(String(b.nextReview || ''))
    || a.number - b.number
  );
}
