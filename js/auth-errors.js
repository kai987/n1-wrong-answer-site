const ERROR_TEXT = Object.freeze({
  invalid_credentials: '邮箱或密码错误，请重新输入。',
  email_not_confirmed: '邮箱尚未验证，请先完成邮箱验证。',
  user_already_exists: '该邮箱已经注册，请直接登录。',
  over_request_rate_limit: '操作过于频繁，请稍后再试。',
  over_email_send_rate_limit: '邮件发送过于频繁，请稍后再试。',
  weak_password: '密码强度不足，请设置更长、更难猜的密码。',
});

export function friendlyAuthError(error, fallback = '操作失败，请稍后重试。') {
  const code = String(error?.code || '').trim().toLowerCase();
  if (ERROR_TEXT[code]) return ERROR_TEXT[code];

  const message = String(error?.message || '').trim().toLowerCase();
  if (message.includes('invalid login credentials')) return ERROR_TEXT.invalid_credentials;
  if (message.includes('email not confirmed')) return ERROR_TEXT.email_not_confirmed;
  if (message.includes('user already registered') || message.includes('already been registered')) return ERROR_TEXT.user_already_exists;
  if (message.includes('rate limit') || message.includes('too many requests')) return '操作过于频繁，请稍后再试。';
  if (message.includes('password should be at least') || message.includes('password is too short')) return '密码长度不足，请设置更长的密码。';
  if (message.includes('same password')) return '新密码不能与当前密码相同。';
  if (message.includes('auth session missing') || message.includes('session not found')) return '重置链接已失效，请重新发送密码重置邮件。';

  return fallback;
}
