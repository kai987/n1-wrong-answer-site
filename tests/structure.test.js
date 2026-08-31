import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const repository = readFileSync(new URL('../js/repository.js', import.meta.url), 'utf8');
const render = readFileSync(new URL('../js/ui/render.js', import.meta.url), 'utf8');
const auth = readFileSync(new URL('../js/auth.js', import.meta.url), 'utf8');
const constants = readFileSync(new URL('../js/constants.js', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

test('page loads one consolidated application stylesheet without manual version query strings', () => {
  const stylesheets = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(stylesheets, ['styles.css']);
  assert.equal(/(?:src|href)="[^"]+\?v=\d+/.test(html), false);
});

test('page uses only the modular application entry for business code', () => {
  assert.match(html, /<script type="module" src="js\/main\.js"><\/script>/);
  for (const legacy of ['data.js', 'seed-bridge.js', 'option-explanations.js', 'app.js', 'security.js', 'option-analysis.js']) {
    assert.equal(html.includes(`src="${legacy}`), false, `${legacy} must not be loaded by index.html`);
  }
});

test('CSP rejects inline styles and application code does not create them', () => {
  assert.match(html, /style-src 'self';/);
  assert.equal(html.includes("style-src 'self' 'unsafe-inline'"), false);
  assert.equal(/\sstyle=/.test(html), false, 'index.html must not contain style attributes');
  assert.equal(/\sstyle=/.test(render), false, 'rendered templates must not contain style attributes');
  assert.equal(/\.style\./.test(render), false, 'render code must not mutate inline style properties');
  assert.match(css, /\.option\.is-selected\{outline:2px solid var\(--accent\)\}/);
  assert.match(css, /\.form-section-spacer\{height:16px\}/);
});

test('select arrow stays single in light and dark themes', () => {
  assert.match(css, /select\.control\s*\{[\s\S]*?background-repeat:no-repeat;/);
  assert.match(css, /html\[data-theme="dark"\] \.control\s*\{background-color:#1c2127\}/);
  assert.match(css, /html\[data-theme="dark"\] select\.control\s*\{[\s\S]*?background-repeat:no-repeat;/);
  assert.equal(/html\[data-theme="dark"\] \.control\s*\{background:#1c2127\}/.test(css), false);
});

test('default exam initialization is one-time and transaction-backed', () => {
  assert.match(repository, /rpc\('initialize_wrong_answers_exam'/);
  assert.equal(repository.includes("select('id', { count: 'exact'"), false);
  assert.match(schema, /create table if not exists public\.user_seed_state/);
  assert.match(schema, /create or replace function public\.initialize_wrong_answers_exam\(/);
  assert.match(schema, /on conflict \(user_id, source_exam\) do nothing/);
  assert.match(schema, /where source_exam = '2025-12'/);
});

test('default exam restore uses a versioned transactional RPC instead of delete then seed', () => {
  assert.match(repository, /rpc\('replace_wrong_answers_for_exam'/);
  assert.match(repository, /p_seed_version: SEED_VERSION/);
  assert.match(schema, /create or replace function public\.replace_wrong_answers_for_exam\(/);
  assert.match(schema, /p_seed_version integer default 1/);
  const restoreBody = repository.match(/export async function restoreDefaultExam\(\)[\s\S]*?\n\}/)?.[0] || '';
  assert.equal(restoreBody.includes('.delete()'), false);
});

test('registration policy is centralized and client-side intent is explicit', () => {
  assert.match(constants, /registrationEnabled: true/);
  assert.match(constants, /registrationMinPasswordLength: 12/);
  assert.match(auth, /AUTH_POLICY\.registrationMinPasswordLength/);
  assert.equal(auth.includes('password.length < 12'), false);
});

test('main entry stays orchestration-focused after extracting IO and DOM bindings', () => {
  assert.equal(existsSync(new URL('../js/io.js', import.meta.url)), true);
  assert.equal(existsSync(new URL('../js/ui/events.js', import.meta.url)), true);
  assert.ok(statSync(new URL('../js/main.js', import.meta.url)).size < 8500, 'main.js should remain below 8.5 KB');
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
