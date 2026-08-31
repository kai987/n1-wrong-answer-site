import { DEFAULT_SOURCE_EXAM } from './constants.js';
import { initializeAuth, signIn, signOut, signUp } from './auth.js';
import { downloadQuestions, readImportFile } from './io.js';
import {
  deleteQuestion,
  loadQuestions,
  replaceAllQuestions,
  resetProgress,
  restoreDefaultExam,
  saveQuestion,
  saveReview,
} from './repository.js';
import { applyReviewResult } from './review.js';
import { supabase } from './supabase.js';
import {
  authMessage,
  isDuplicateError,
  setAppVisible,
  setSync,
  toast,
} from './utils.js';
import { clearEditor, fillEditor, readEditor, setupOptionEditor } from './ui/editor.js';
import { bindStaticEvents } from './ui/events.js';
import {
  readFilters,
  refreshSourceFilter,
  renderList,
  renderReview,
  renderStats,
  switchTab,
} from './ui/render.js';

const state = {
  items: [],
  currentId: null,
  activeTab: 'review',
  user: null,
  loading: false,
};

const filters = () => readFilters();

function renderActivePanel() {
  const currentFilters = filters();
  if (state.activeTab === 'review') {
    renderReview({
      state,
      items: state.items,
      filters: currentFilters,
      onReviewResult: handleReviewResult,
      onEdit: openEditor,
    });
    return;
  }

  if (state.activeTab === 'all') {
    renderList({
      items: state.items,
      filters: currentFilters,
      onReview: openReview,
      onEdit: openEditor,
      onDelete: handleDelete,
    });
  }
}

function renderDashboard({ refreshSources = false } = {}) {
  if (refreshSources) refreshSourceFilter(state.items);
  renderStats(state.items, filters());
  renderActivePanel();
}

function activateTab(tab) {
  state.activeTab = tab;
  switchTab(tab);
  renderActivePanel();
}

function openReview(id) {
  state.currentId = id;
  activateTab('review');
}

function openEditor(id = null) {
  state.activeTab = 'edit';
  switchTab('edit');
  const question = id ? state.items.find(item => item.id === id) : null;
  question ? fillEditor(question) : clearEditor();
}

async function loadCloud({ ensureDefault = true } = {}) {
  if (!state.user || state.loading) return;
  state.loading = true;
  setSync('正在同步…');

  try {
    state.items = await loadQuestions(state.user.id, { ensureDefault });
    state.currentId = null;
    renderDashboard({ refreshSources: true });
    setSync(`云端已同步 · ${state.user.email || ''}`, 'ok');
  } catch (error) {
    console.error(error);
    setSync('云端连接失败', 'error');
    toast('Supabase 数据表尚未配置或连接失败');
  } finally {
    state.loading = false;
  }
}

async function handleReviewResult(question, known) {
  if (!state.user) return;
  setSync('正在保存复习结果…');

  try {
    const saved = await saveReview(applyReviewResult(question, known), state.user.id);
    state.items = state.items.map(item => item.id === saved.id ? saved : item);
    state.currentId = null;
    renderDashboard();
    setSync(`云端已同步 · ${state.user.email || ''}`, 'ok');
    toast(known
      ? `${saved.sourceExam} Q${saved.number}：下次 ${saved.nextReview}`
      : `${saved.sourceExam} Q${saved.number}：明天再次复习`);
  } catch (error) {
    console.error(error);
    setSync('同步失败', 'error');
    toast('保存失败');
  }
}

async function handleDelete(id) {
  if (!state.user || !window.confirm('确认删除这道错题？')) return;

  try {
    await deleteQuestion(id, state.user.id);
    state.items = state.items.filter(question => question.id !== id);
    if (state.currentId === id) state.currentId = null;
    renderDashboard({ refreshSources: true });
    toast('已从云端删除');
  } catch (error) {
    console.error(error);
    toast('删除失败');
  }
}

async function handleEditorSubmit(event) {
  event.preventDefault();
  if (!state.user) return;

  const id = document.getElementById('editId').value;
  const existing = state.items.find(question => question.id === id) || null;
  setSync('正在保存…');

  try {
    const saved = await saveQuestion(readEditor(existing), state.user.id);
    if (existing) {
      state.items = state.items.map(item => item.id === saved.id ? saved : item);
      toast('已更新错题');
    } else {
      state.items.push(saved);
      toast('已添加错题');
    }

    clearEditor();
    state.activeTab = 'all';
    switchTab('all');
    renderDashboard({ refreshSources: true });
    setSync(`云端已同步 · ${state.user.email || ''}`, 'ok');
  } catch (error) {
    console.error(error);
    toast(isDuplicateError(error) ? '同一来源中题号不能重复' : '保存失败');
    setSync('同步失败', 'error');
  }
}

async function handleImport(file) {
  try {
    const normalized = await readImportFile(file);
    if (!window.confirm(`导入将用 ${normalized.length} 道题替换当前账号的全部云端错题。导入为事务操作，失败时原数据不会变化。继续吗？`)) return;

    setSync('正在安全导入云端…');
    const count = await replaceAllQuestions(normalized);
    await loadCloud({ ensureDefault: false });
    toast(`已安全导入 ${count} 道错题`);
  } catch (error) {
    console.error(error);
    setSync('导入失败，原数据未更改', 'error');
    window.alert(`导入失败：${error?.message || '无法识别该 JSON 文件'}`);
  }
}

async function handleResetProgress() {
  if (!state.user || !window.confirm('只重置复习进度，保留所有来源的题目与编辑内容？')) return;

  try {
    await resetProgress(state.user.id);
    await loadCloud();
    toast('复习进度已重置');
  } catch (error) {
    console.error(error);
    toast('重置失败');
  }
}

async function handleRestoreDefault() {
  if (!state.user || !window.confirm(`只恢复 ${DEFAULT_SOURCE_EXAM} 的初始35道错题。其他来源的错题不会删除。继续吗？`)) return;

  try {
    const count = await restoreDefaultExam();
    await loadCloud({ ensureDefault: false });
    clearEditor();
    toast(`已事务恢复 ${DEFAULT_SOURCE_EXAM} 初始 ${count} 题`);
  } catch (error) {
    console.error(error);
    toast('恢复失败，原题库未更改');
  }
}

async function handleSession(session) {
  state.user = session?.user || null;
  setAppVisible(Boolean(state.user));

  if (state.user) {
    await loadCloud();
    return;
  }

  state.items = [];
  state.currentId = null;
  refreshSourceFilter([]);
  authMessage('首次使用请注册；已有账号可直接登录。');
}

function bindEvents() {
  bindStaticEvents({
    onSignIn: ({ email, password }) => void signIn(email, password),
    onSignUp: ({ email, password }) => void signUp(email, password),
    onSignOut: () => void signOut(),
    onTab: activateTab,
    onSourceFilter: () => {
      renderStats(state.items, filters());
      renderActivePanel();
    },
    onCategoryFilter: renderActivePanel,
    onSearch: renderActivePanel,
    onAdd: () => openEditor(),
    onCancelEdit: clearEditor,
    onEditorSubmit: handleEditorSubmit,
    onExport: () => downloadQuestions(state.items),
    onImport: handleImport,
    onResetProgress: () => void handleResetProgress(),
    onRestoreDefault: () => void handleRestoreDefault(),
  });
}

async function bootstrap() {
  setupOptionEditor();
  clearEditor();
  switchTab('review');
  bindEvents();

  if (!supabase) {
    authMessage('Supabase 客户端未加载，请检查网络或 config.js。', true);
    return;
  }

  try {
    await initializeAuth(handleSession);
  } catch (error) {
    console.error(error);
    authMessage('无法读取登录状态，请刷新页面后重试。', true);
  }
}

void bootstrap();
