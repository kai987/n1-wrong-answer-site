import { DEFAULT_SOURCE_EXAM } from '../constants.js';
import { dateOnly, isoToday, normalizeSource, optLabel } from '../utils.js';
import { getOptionExplanations } from '../questions.js';

export function setupOptionEditor() {
  const editor = document.getElementById('optionEditor');
  if (!editor) return;

  editor.innerHTML = [1, 2, 3, 4].map(number => `
    <div class="option-edit option-edit-detailed">
      <strong>${optLabel(number)}</strong>
      <div class="option-edit-body">
        <input class="control" id="opt${number}" required placeholder="选项内容">
        <textarea class="control option-explanation-input" id="optEx${number}" required placeholder="解释这个选项为什么正确或错误"></textarea>
      </div>
    </div>`).join('');
}

export function clearEditor() {
  document.getElementById('editorTitle').textContent = '添加错题';
  document.getElementById('editId').value = '';
  document.getElementById('editorForm').reset();
  document.getElementById('qSourceExam').value = DEFAULT_SOURCE_EXAM;
  document.getElementById('qUserAnswer').value = '1';
  document.getElementById('qCorrectAnswer').value = '1';
  [1, 2, 3, 4].forEach(number => {
    const input = document.getElementById(`optEx${number}`);
    if (input) input.value = '';
  });
}

export function fillEditor(question) {
  document.getElementById('editorTitle').textContent = `编辑 ${question.sourceExam} · Q${question.number}`;
  document.getElementById('editId').value = question.id;
  document.getElementById('qSourceExam').value = question.sourceExam;
  document.getElementById('qNumber').value = question.number;
  document.getElementById('qCategory').value = question.category;
  document.getElementById('qSubtype').value = question.subtype || '';
  document.getElementById('qStem').value = question.stem;
  document.getElementById('qContext').value = question.context || '';
  question.options.forEach((option, index) => {
    document.getElementById(`opt${index + 1}`).value = option;
  });
  getOptionExplanations(question).forEach((explanation, index) => {
    document.getElementById(`optEx${index + 1}`).value = explanation;
  });
  document.getElementById('qUserAnswer').value = question.userAnswer;
  document.getElementById('qCorrectAnswer').value = question.correctAnswer;
  document.getElementById('qExplanation').value = question.explanation;
  document.getElementById('qWrongReason').value = question.wrongReason;
  document.getElementById('qKeyPoint').value = question.keyPoint || '';
}

export function readEditor(existingQuestion = null) {
  return {
    ...(existingQuestion || {}),
    id: existingQuestion?.id || null,
    sourceExam: normalizeSource(document.getElementById('qSourceExam').value),
    number: Number(document.getElementById('qNumber').value),
    category: document.getElementById('qCategory').value,
    subtype: document.getElementById('qSubtype').value.trim(),
    stem: document.getElementById('qStem').value.trim(),
    context: document.getElementById('qContext').value.trim(),
    options: [1, 2, 3, 4].map(number => document.getElementById(`opt${number}`).value.trim()),
    optionExplanations: [1, 2, 3, 4].map(number => document.getElementById(`optEx${number}`).value.trim()),
    userAnswer: Number(document.getElementById('qUserAnswer').value),
    correctAnswer: Number(document.getElementById('qCorrectAnswer').value),
    explanation: document.getElementById('qExplanation').value.trim(),
    wrongReason: document.getElementById('qWrongReason').value.trim(),
    keyPoint: document.getElementById('qKeyPoint').value.trim(),
    page: existingQuestion?.page || '—',
    reviewStep: existingQuestion?.reviewStep || 0,
    nextReview: existingQuestion?.nextReview || dateOnly(isoToday()),
    reviewCount: existingQuestion?.reviewCount || 0,
    lastResult: existingQuestion?.lastResult || null,
    mastered: existingQuestion?.mastered || false,
  };
}
