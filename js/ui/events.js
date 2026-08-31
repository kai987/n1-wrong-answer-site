import { debounce } from '../utils.js';

export function bindStaticEvents({
  onSignIn,
  onSignUp,
  onSignOut,
  onTab,
  onSourceFilter,
  onCategoryFilter,
  onSearch,
  onAdd,
  onCancelEdit,
  onEditorSubmit,
  onExport,
  onImport,
  onResetProgress,
  onRestoreDefault,
}) {
  document.getElementById('authForm').addEventListener('submit', event => {
    event.preventDefault();
    onSignIn({
      email: document.getElementById('authEmail').value.trim(),
      password: document.getElementById('authPassword').value,
    });
  });

  document.getElementById('signUpBtn').addEventListener('click', () => {
    onSignUp({
      email: document.getElementById('authEmail').value.trim(),
      password: document.getElementById('authPassword').value,
    });
  });

  document.getElementById('signOutBtn').addEventListener('click', onSignOut);

  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => onTab(button.dataset.tab));
  });

  document.getElementById('sourceFilter').addEventListener('change', onSourceFilter);
  document.getElementById('categoryFilter').addEventListener('change', onCategoryFilter);
  document.getElementById('searchInput').addEventListener('input', debounce(onSearch, 120));
  document.getElementById('addBtn').addEventListener('click', onAdd);
  document.getElementById('cancelEditBtn').addEventListener('click', onCancelEdit);
  document.getElementById('editorForm').addEventListener('submit', onEditorSubmit);
  document.getElementById('exportBtn').addEventListener('click', onExport);

  document.getElementById('importFile').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    try {
      if (file) await onImport(file);
    } finally {
      event.target.value = '';
    }
  });

  document.getElementById('resetProgressBtn').addEventListener('click', onResetProgress);
  document.getElementById('resetAllBtn').addEventListener('click', onRestoreDefault);
}
