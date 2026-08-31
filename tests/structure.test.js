import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('page loads one consolidated application stylesheet', () => {
  const stylesheets = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(stylesheets, ['styles.css?v=3']);
});

test('page uses only the modular application entry for business code', () => {
  assert.match(html, /<script type="module" src="js\/main\.js\?v=2"><\/script>/);
  for (const legacy of ['data.js', 'seed-bridge.js', 'option-explanations.js', 'app.js', 'security.js', 'option-analysis.js']) {
    assert.equal(html.includes(`src="${legacy}`), false, `${legacy} must not be loaded by index.html`);
  }
});

test('legacy override and bridge files are removed from the repository', () => {
  for (const path of [
    '../data.js',
    '../seed-bridge.js',
    '../option-explanations.js',
    '../header.css',
    '../theme-button.css',
    '../option-analysis.css',
    '../auth.css',
  ]) {
    assert.equal(existsSync(new URL(path, import.meta.url)), false, `${path} should not exist`);
  }
});
