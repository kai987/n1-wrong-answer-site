import { signOut, updateRecoveredPassword } from './auth.js';
import { authMessage, setAppVisible } from './utils.js';
import {
  clearRecoveryForm,
  clearRecoveryLocation,
  recoveryMessage,
  showLoginMode,
  showRecoveryMode,
} from './ui/auth-view.js';

export function createPasswordRecoveryHandlers({ resetSessionState }) {
  async function onPasswordRecovery(session) {
    resetSessionState();
    setAppVisible(false);
    showRecoveryMode();
    recoveryMessage(session ? '重置链接已验证，请设置新密码。' : '正在验证密码重置链接…');
  }

  async function onRecoverySubmit({ password, confirmPassword }) {
    if (password !== confirmPassword) {
      recoveryMessage('两次输入的新密码不一致。', true);
      return;
    }

    recoveryMessage('正在更新密码…');
    const result = await updateRecoveredPassword(password);
    if (!result.ok) {
      recoveryMessage(result.message, true);
      return;
    }

    clearRecoveryLocation();
    clearRecoveryForm();
    showLoginMode();
    await signOut();
    const loginPassword = document.getElementById('authPassword');
    if (loginPassword) loginPassword.value = '';
    authMessage(result.message);
  }

  async function onCancelRecovery() {
    clearRecoveryLocation();
    clearRecoveryForm();
    showLoginMode();
    await signOut();
    authMessage('已返回登录。');
  }

  return { onPasswordRecovery, onRecoverySubmit, onCancelRecovery };
}
