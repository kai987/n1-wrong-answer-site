import test from 'node:test';
import assert from 'node:assert/strict';

import { friendlyAuthError } from '../js/auth-errors.js';

test('invalid login credentials are translated to a friendly Chinese message', () => {
  assert.equal(
    friendlyAuthError({ message: 'Invalid login credentials' }, 'fallback'),
    '邮箱或密码错误，请重新输入。',
  );
  assert.equal(
    friendlyAuthError({ code: 'invalid_credentials' }, 'fallback'),
    '邮箱或密码错误，请重新输入。',
  );
});

test('common auth failures do not expose raw provider messages', () => {
  assert.equal(
    friendlyAuthError({ code: 'email_not_confirmed' }, 'fallback'),
    '邮箱尚未验证，请先完成邮箱验证。',
  );
  assert.equal(
    friendlyAuthError({ message: 'Too many requests' }, 'fallback'),
    '操作过于频繁，请稍后再试。',
  );
});

test('unknown errors use the caller fallback', () => {
  assert.equal(friendlyAuthError({ message: 'Something unexpected' }, '登录失败'), '登录失败');
});
