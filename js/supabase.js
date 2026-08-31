const config = window.SUPABASE_CONFIG || {};

export const supabase = window.supabase?.createClient?.(config.url, config.key) || null;

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase 客户端未加载');
  return supabase;
}
