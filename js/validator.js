import { CATEGORIES, DEFAULT_SOURCE_EXAM, IMPORT_LIMITS, SOURCE_RE } from './constants.js';
import { dateOnly, isoToday, normalizeSource } from './utils.js';
import { getOptionExplanations } from './questions.js';

function text(value, name, { required = false, max = 10000 } = {}) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string') throw new Error(`${name} 必须是文本`);
  const result = value.trim();
  if (required && !result) throw new Error(`${name} 不能为空`);
  if (result.length > max) throw new Error(`${name} 过长（最多 ${max} 字符）`);
  return result;
}

function integer(value, name, min, max) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new Error(`${name} 必须是 ${min}～${max} 的整数`);
  }
  return result;
}

function booleanValue(value, name) {
  if (value === undefined || value === null) return false;
  if (typeof value !== 'boolean') throw new Error(`${name} 必须是布尔值`);
  return value;
}

function validDate(value, name) {
  const fallback = dateOnly(isoToday());
  const result = String(value || fallback).trim();
  const match = result.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`${name} 必须是 YYYY-MM-DD`);

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const normalized = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (Number.isNaN(date.getTime()) || normalized !== result) throw new Error(`${name} 不是有效日期`);
  return result;
}

export function normalizeImportItem(raw, index = 0) {
  const label = `第 ${index + 1} 条`;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${label}不是有效对象`);

  const sourceExam = normalizeSource(raw.sourceExam ?? raw.source_exam ?? DEFAULT_SOURCE_EXAM);
  if (!SOURCE_RE.test(sourceExam)) throw new Error(`${label}试卷来源应为 YYYY-MM，例如 2025-12`);

  const number = integer(raw.number ?? raw.question_number, `${label}题号`, 1, 999);
  const category = text(raw.category, `${label}分类`, { required: true, max: 20 });
  if (!CATEGORIES.has(category)) throw new Error(`${label}分类无效`);

  if (!Array.isArray(raw.options) || raw.options.length !== 4) {
    throw new Error(`${label}必须正好包含 4 个选项`);
  }
  const options = raw.options.map((value, optionIndex) =>
    text(value, `${label}选项 ${optionIndex + 1}`, { required: true, max: IMPORT_LIMITS.option })
  );

  const page = text(String(raw.page ?? ''), `${label}页码`, { max: IMPORT_LIMITS.page });
  if (/[<>]/.test(page)) throw new Error(`${label}页码包含非法字符`);

  const userAnswer = integer(raw.userAnswer ?? raw.user_answer, `${label}错误选项`, 1, 4);
  const correctAnswer = integer(raw.correctAnswer ?? raw.correct_answer, `${label}正确选项`, 1, 4);
  const explanation = text(raw.explanation, `${label}正确选项解说`, { required: true, max: IMPORT_LIMITS.explanation });
  const wrongReason = text(raw.wrongReason ?? raw.wrong_reason, `${label}错误选项解说`, { required: true, max: IMPORT_LIMITS.wrongReason });

  const rawOptionExplanations = raw.optionExplanations ?? raw.option_explanations;
  let optionExplanations;
  if (rawOptionExplanations === undefined || rawOptionExplanations === null) {
    optionExplanations = getOptionExplanations({
      ...raw,
      sourceExam,
      number,
      category,
      options,
      userAnswer,
      correctAnswer,
      explanation,
      wrongReason,
    });
  } else {
    if (!Array.isArray(rawOptionExplanations) || rawOptionExplanations.length !== 4) {
      throw new Error(`${label}逐项解释必须正好包含 4 项`);
    }
    optionExplanations = rawOptionExplanations.map((value, optionIndex) =>
      text(value, `${label}选项 ${optionIndex + 1} 解释`, { max: IMPORT_LIMITS.optionExplanation })
    );
  }

  const lastResult = raw.lastResult ?? raw.last_result ?? null;
  if (lastResult !== null && !['known', 'again'].includes(lastResult)) {
    throw new Error(`${label}复习结果无效`);
  }

  return {
    sourceExam,
    number,
    category,
    subtype: text(raw.subtype, `${label}题型`, { max: IMPORT_LIMITS.subtype }),
    page,
    stem: text(raw.stem, `${label}题目`, { required: true, max: IMPORT_LIMITS.stem }),
    context: text(raw.context, `${label}上下文`, { max: IMPORT_LIMITS.context }),
    options,
    optionExplanations,
    userAnswer,
    correctAnswer,
    explanation,
    wrongReason,
    keyPoint: text(raw.keyPoint ?? raw.key_point, `${label}复习重点`, { max: IMPORT_LIMITS.keyPoint }),
    sourceNote: text(raw.sourceNote ?? raw.source_note, `${label}来源备注`, { max: IMPORT_LIMITS.sourceNote }),
    reviewStep: integer(raw.reviewStep ?? raw.review_step ?? 0, `${label}复习阶段`, 0, 5),
    reviewCount: integer(raw.reviewCount ?? raw.review_count ?? 0, `${label}复习次数`, 0, 1000000),
    lastResult,
    mastered: booleanValue(raw.mastered, `${label}掌握状态`),
    nextReview: validDate(raw.nextReview ?? raw.next_review_at, `${label}下次复习日期`),
  };
}

export function normalizeImportItems(items) {
  if (!Array.isArray(items)) throw new Error('导入内容必须是错题数组');
  if (!items.length) throw new Error('导入文件中没有错题');
  if (items.length > IMPORT_LIMITS.items) throw new Error(`一次最多导入 ${IMPORT_LIMITS.items} 道错题`);

  const normalized = items.map(normalizeImportItem);
  const seen = new Set();
  normalized.forEach((item, index) => {
    const key = `${item.sourceExam}::${item.number}`;
    if (seen.has(key)) {
      throw new Error(`第 ${index + 1} 条与前面存在重复：${item.sourceExam} · Q${item.number}`);
    }
    seen.add(key);
  });
  return normalized;
}
