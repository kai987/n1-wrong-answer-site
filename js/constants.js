export const INTERVALS = [1, 3, 7, 14, 30];
export const DEFAULT_SOURCE_EXAM = '2025-12';
export const CATEGORIES = new Set(['文字・語彙', '文法', '読解']);
export const SOURCE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const IMPORT_LIMITS = Object.freeze({
  fileBytes: 2 * 1024 * 1024,
  items: 2000,
  subtype: 120,
  page: 50,
  stem: 10000,
  context: 50000,
  option: 2000,
  optionExplanation: 10000,
  explanation: 20000,
  wrongReason: 20000,
  keyPoint: 5000,
  sourceNote: 1000,
});
