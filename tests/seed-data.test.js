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

test('every reading seed question includes the full article passage', () => {
  const expectedReadingQuestions = [46, 53, 57, 59, 61, 62, 64];
  const reading = SEED_QUESTIONS.filter(question => question.category === '読解');
  assert.deepEqual(reading.map(question => question.number), expectedReadingQuestions);
  for (const question of reading) {
    assert.ok(question.passage.length > 100, `Q${question.number} passage is missing or too short`);
  }
  assert.equal(SEED_QUESTIONS.find(question => question.number === 57).passage, SEED_QUESTIONS.find(question => question.number === 59).passage);
  assert.equal(SEED_QUESTIONS.find(question => question.number === 62).passage, SEED_QUESTIONS.find(question => question.number === 64).passage);
});

test('seed question numbers are unique within the exam source', () => {
  const keys = SEED_QUESTIONS.map(question => `${question.sourceExam}:${question.number}`);
  assert.equal(new Set(keys).size, keys.length);
});

test('problem 7 restored answers remain fixed', () => {
  const answers = new Map(SEED_QUESTIONS.filter(question => [41, 42, 43].includes(question.number)).map(question => [question.number, question.correctAnswer]));
  assert.deepEqual([...answers.entries()], [[41, 4], [42, 1], [43, 2]]);
});
