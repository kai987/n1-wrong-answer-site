import { AUTH_POLICY } from './constants.js';
import { friendlyAuthError } from './auth-errors.js';
import { supabase } from './supabase.js';
import { authMessage } from './utils.js';

function siteRootUrl() {
  return new URL('./', window.location.href).href.split('#')[0].split('?')[0];
}

function isRecoveryRedirect() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return search.get('type') === 'recovery' || hash.get('type') === 'recovery';
}

export async function signIn(email, password) {
  authMessage('正在登录…');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    authMessage(friendlyAuthError(error, '登录失败，请稍后重试。'), true);
    return false;
  }
  authMessage('登录成功');
  return true;
}

export async function signUp(email, password) {
  if (!AUTH_POLICY.registrationEnabled) {
    authMessage('当前不开放新账号注册。', true);
    return false;
  }

  if (password.length < AUTH_POLICY.registrationMinPasswordLength) {
    authMessage(`注册密码至少需要 ${AUTH_POLICY.registrationMinPasswordLength} 位；已有账号登录不受影响。`, true);
    return false;
  }

  authMessage('正在创建账号…');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: siteRootUrl() },
  });

  if (error) {
    authMessage(friendlyAuthError(error, '注册失败，请稍后重试。'), true);
    return false;
  }

  authMessage(data.session ? '注册并登录成功' : '注册成功，请检查邮箱并完成验证后再登录。');
  return true;
}

export async function requestPasswordReset(email) {
  if (!email) {
    authMessage('请先输入邮箱地址。', true);
    return false;
  }

  authMessage('正在发送密码重置邮件…');
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: siteRootUrl(),
  });

  if (error) {
    authMessage(friendlyAuthError(error, '重置邮件发送失败，请稍后重试。'), true);
    return false;
  }

  authMessage('如果该邮箱已注册，密码重置链接已发送。请检查收件箱和垃圾邮件。');
  return true;
}

export async function updateRecoveredPassword(password) {
  if (password.length < AUTH_POLICY.registrationMinPasswordLength) {
    return {
      ok: false,
      message: `新密码至少需要 ${AUTH_POLICY.registrationMinPasswordLength} 位。`,
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      ok: false,
      message: friendlyAuthError(error, '密码更新失败，请重新打开邮件中的重置链接后再试。'),
    };
  }

  return { ok: true, message: '密码已更新，请使用新密码重新登录。' };
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function initializeAuth({ onSession, onPasswordRecovery }) {
  let recoveryMode = isRecoveryRedirect();
  let recoveryNotified = false;
  let recoveryHasSession = false;

  const notifyRecovery = async session => {
    if (recoveryNotified && (!session || recoveryHasSession)) return;
    recoveryMode = true;
    recoveryNotified = true;
    recoveryHasSession = Boolean(session);
    await onPasswordRecovery(session);
  };

  const listener = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      void notifyRecovery(session);
      return;
    }

    if (recoveryMode && event === 'SIGNED_OUT') {
      recoveryMode = false;
      recoveryNotified = false;
      recoveryHasSession = false;
      void onSession(session);
      return;
    }

    if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
    if (!recoveryMode) void onSession(session);
  });

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  if (recoveryMode) await notifyRecovery(data.session);
  else await onSession(data.session);

  return listener;
}
