import { supabase } from './supabase.js';
import { authMessage } from './utils.js';

export async function signIn(email, password) {
  authMessage('正在登录…');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    authMessage(error.message, true);
    return false;
  }
  authMessage('登录成功');
  return true;
}

export async function signUp(email, password) {
  if (password.length < 12) {
    authMessage('注册密码至少需要 12 位；已有账号登录不受影响。', true);
    return false;
  }

  authMessage('正在创建账号…');
  const emailRedirectTo = new URL('./', window.location.href).href.split('#')[0].split('?')[0];
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });

  if (error) {
    authMessage(error.message, true);
    return false;
  }

  authMessage(data.session ? '注册并登录成功' : '注册成功，请检查邮箱并完成验证后再登录。');
  return true;
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function initializeAuth(onSession) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  await onSession(data.session);

  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
    void onSession(session);
  });
}
