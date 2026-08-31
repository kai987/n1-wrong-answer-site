import test from 'node:test';
import assert from 'node:assert/strict';

import { applyReviewResult, buildDueQueue, filterQuestions, isDue } from '../js/review.js';
import { normalizeSource } from '../js/utils.js';

test('normalizeSource keeps YYYY-MM and upgrades legacy label', () => {
  assert.equal(normalizeSource('2025-07'), '2025-07');
  assert.equal(normalizeSource('JLPT N1 2025-12'), '2025-12');
});

test('known answers follow 1 -> 3 -> 7 -> 14 -> 30 day schedule', () => {
  let question = { reviewStep: 0, reviewCount: 0, mastered: false };
  const expectedDates = ['2026-09-02', '2026-09-04', '2026-09-08', '2026-09-15', '2026-10-01'];

  expectedDates.forEach((date, index) => {
    question = applyReviewResult(question, true, '2026-09-01');
    assert.equal(question.reviewStep, index + 1);
    assert.equal(question.nextReview, date);
  });
  assert.equal(question.mastered, true);
});

test('again resets review step and schedules next day', () => {
  const question = applyReviewResult({ reviewStep: 4, reviewCount: 9, mastered: true }, false, '2026-09-01');
  assert.equal(question.reviewStep, 0);
  assert.equal(question.reviewCount, 10);
  assert.equal(question.mastered, false);
  assert.equal(question.nextReview, '2026-09-02');
});

test('due state respects next review and mastered flag', () => {
  assert.equal(isDue({ mastered: false, nextReview: '2026-09-01' }, '2026-09-01'), true);
  assert.equal(isDue({ mastered: false, nextReview: '2026-09-02' }, '2026-09-01'), false);
  assert.equal(isDue({ mastered: true, nextReview: '2026-08-01' }, '2026-09-01'), false);
});

test('search includes per-option explanations', () => {
  const items = [{
    sourceExam: '2025-12',
    number: 27,
    category: '文法',
    subtype: '文法選択',
    stem: 'test',
    keyPoint: '',
    options: ['a', 'b', 'c', 'd'],
    optionExplanations: ['first', 'なくしては explanation', 'third', 'fourth'],
  }];

  const result = filterQuestions(items, { source: 'all', category: 'all', search: 'なくしては' }, '2026-09-01');
  assert.equal(result.length, 1);
});

test('due queue prefers due items and falls back to unmastered items', () => {
  const items = [
    { id: 'a', sourceExam: '2025-12', number: 1, category: '文法', options: [], optionExplanations: [], mastered: false, nextReview: '2026-09-02' },
    { id: 'b', sourceExam: '2025-12', number: 2, category: '文法', options: [], optionExplanations: [], mastered: false, nextReview: '2026-09-01' },
  ];
  const filters = { source: 'all', category: 'all', search: '' };

  assert.deepEqual(buildDueQueue(items, filters, '2026-09-01').map(item => item.id), ['b']);
  assert.deepEqual(buildDueQueue(items, filters, '2026-08-30').map(item => item.id), ['b', 'a']);
});
