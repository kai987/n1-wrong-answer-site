export function showLoginMode() {
  document.getElementById('authForm')?.classList.remove('is-hidden');
  document.getElementById('recoveryForm')?.classList.add('is-hidden');
}

export function showRecoveryMode() {
  document.getElementById('authForm')?.classList.add('is-hidden');
  document.getElementById('recoveryForm')?.classList.remove('is-hidden');
  document.getElementById('recoveryPassword')?.focus();
}

export function recoveryMessage(message, isError = false) {
  const element = document.getElementById('recoveryMessage');
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('error-text', Boolean(isError));
}

export function clearRecoveryForm() {
  const password = document.getElementById('recoveryPassword');
  const confirmPassword = document.getElementById('recoveryPasswordConfirm');
  if (password) password.value = '';
  if (confirmPassword) confirmPassword.value = '';
}

export function clearRecoveryLocation() {
  const url = new URL(window.location.href);
  url.searchParams.delete('type');
  url.searchParams.delete('code');
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}
