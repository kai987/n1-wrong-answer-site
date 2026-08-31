import { DEFAULT_SOURCE_EXAM } from './constants.js';

export function isoToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dateOnly(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysFrom(dateString, days) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  return dateOnly(d);
}

export function addDays(days) {
  return addDaysFrom(dateOnly(isoToday()), days);
}

export function esc(value = '') {
  return String(value).replace(/[&<>\"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[char]);
}

export function optLabel(number) {
  return ['', '①', '②', '③', '④'][number] || '';
}

export function normalizeSource(value) {
  const normalized = String(value || '').trim();
  if (normalized === 'JLPT N1 2025-12') return DEFAULT_SOURCE_EXAM;
  return normalized || DEFAULT_SOURCE_EXAM;
}

export function toast(message) {
  const element = document.getElementById('toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  window.setTimeout(() => element.classList.remove('show'), 2000);
}

export function setSync(text, kind = '') {
  const element = document.getElementById('syncState');
  if (!element) return;
  element.textContent = text;
  element.dataset.kind = kind;
}

export function authMessage(text, isError = false) {
  const element = document.getElementById('authMessage');
  if (!element) return;
  element.textContent = text;
  element.classList.toggle('error-text', isError);
}

export function setAppVisible(loggedIn) {
  document.getElementById('authShell')?.classList.toggle('is-hidden', loggedIn);
  document.getElementById('app')?.classList.toggle('is-hidden', !loggedIn);
}

export function isDuplicateError(error) {
  return /duplicate|unique/i.test(error?.message || '');
}

export function debounce(fn, wait = 150) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}
