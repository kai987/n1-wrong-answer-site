import { IMPORT_LIMITS } from './constants.js';
import { normalizeImportItems } from './validator.js';
import { dateOnly, isoToday } from './utils.js';

export function downloadQuestions(items) {
  const blob = new Blob([
    JSON.stringify({
      version: 4,
      storage: 'supabase',
      exportedAt: new Date().toISOString(),
      items,
    }, null, 2),
  ], { type: 'application/json' });

  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `jlpt-n1-wrong-questions-${dateOnly(isoToday())}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
}

export async function readImportFile(file) {
  if (!(file instanceof File)) return [];
  if (file.size > IMPORT_LIMITS.fileBytes) {
    throw new Error(`JSON 文件不能超过 ${Math.round(IMPORT_LIMITS.fileBytes / 1024 / 1024)} MB`);
  }

  const parsed = JSON.parse(await file.text());
  const items = Array.isArray(parsed) ? parsed : parsed?.items;
  return normalizeImportItems(items);
}
