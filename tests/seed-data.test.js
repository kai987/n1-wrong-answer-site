import test from 'node:test';
import assert from 'node:assert/strict';

import { SEED_QUESTIONS } from '../js/data/seed-data.js';

test('seed contains the expected 35 questions', () => {
  assert.equal(SEED_QUESTIONS.length, 35);
});

test('every seed question has one source and four options with four explanations', () => {
  for (const question of SEED_QUESTIONS) {
    assert.equal(question.sourceExam, '2025-12');
    assert.equal(question.options.length, 4, `Q${question.number} options`);
    assert.equal(question.optionExplanations.length, 4, `Q${question.number} explanations`);
    assert.ok(question.optionExplanations.every(Boolean), `Q${question.number} has an empty option explanation`);
  }
});

test('seed question numbers are unique within the exam source', () => {
  const keys = SEED_QUESTIONS.map(question => `${question.sourceExam}:${question.number}`);
  assert.equal(new Set(keys).size, keys.length);
});

test('problem 7 restored answers remain fixed', () => {
  const answers = new Map(SEED_QUESTIONS.filter(question => [41, 42, 43].includes(question.number)).map(question => [question.number, question.correctAnswer]));
  assert.deepEqual([...answers.entries()], [[41, 4], [42, 1], [43, 2]]);
});
