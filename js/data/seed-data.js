import { DEFAULT_SOURCE_EXAM } from '../constants.js';
import { normalizeSource } from '../utils.js';
import { BASE_QUESTIONS } from './base-questions.js';
import { OPTION_EXPLANATIONS } from './option-explanations.js';

function explanationsFor(question) {
  const sourceExam = normalizeSource(question.sourceExam || DEFAULT_SOURCE_EXAM);
  const explanations = OPTION_EXPLANATIONS[sourceExam]?.[Number(question.number)];
  return Array.isArray(explanations) && explanations.length === 4
    ? explanations.map(value => String(value || '').trim())
    : ['', '', '', ''];
}

export const SEED_QUESTIONS = BASE_QUESTIONS.map(question => ({
  ...question,
  sourceExam: normalizeSource(question.sourceExam || DEFAULT_SOURCE_EXAM),
  options: [...question.options],
  optionExplanations: explanationsFor(question),
}));
