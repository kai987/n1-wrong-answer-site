import { esc, optLabel } from '../utils.js';
import { buildDueQueue, filterQuestions, isDue, todayString } from '../review.js';
import { getOptionExplanations } from '../questions.js';

export function readFilters() {
  return {
    source: document.getElementById('sourceFilter')?.value || 'all',
    category: document.getElementById('categoryFilter')?.value || 'all',
    search: document.getElementById('searchInput')?.value || '',
  };
}

export function refreshSourceFilter(items) {
  const select = document.getElementById('sourceFilter');
  if (!select) return;

  const previous = select.value || 'all';
  const sources = [...new Set(items.map(question => question.sourceExam))]
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  select.innerHTML = '<option value="all">全部来源</option>'
    + sources.map(source => `<option value="${esc(source)}">${esc(source)}</option>`).join('');
  select.value = sources.includes(previous) ? previous : 'all';
}

export function renderStats(items, filters) {
  const scoped = items.filter(question => filters.source === 'all' || question.sourceExam === filters.source);
  const today = todayString();
  const mastered = scoped.filter(question => question.mastered).length;
  const dueCount = scoped.filter(question => isDue(question, today)).length;
  const categoryCounts = {};
  scoped.forEach(question => {
    categoryCounts[question.category] = (categoryCounts[question.category] || 0) + 1;
  });

  document.getElementById('stats').innerHTML = `
    <div class="stat"><div class="num">${scoped.length}</div><div class="label">错题总数</div></div>
    <div class="stat"><div class="num">${dueCount}</div><div class="label">今天应复习</div></div>
    <div class="stat"><div class="num">${mastered}</div><div class="label">已掌握</div></div>
    <div class="stat"><div class="num">${categoryCounts['文法'] || 0}</div><div class="label">文法错题（当前重点）</div></div>`;
}

function optionAnalysisHtml(question) {
  const explanations = getOptionExplanations(question);
  return `
    <section class="option-analysis-section">
      <h3>四个选项逐项解析</h3>
      <div class="option-analysis-grid">
        ${question.options.map((option, index) => {
          const number = index + 1;
          const isCorrect = number === question.correctAnswer;
          const isUserWrong = number === question.userAnswer && !isCorrect;
          const classes = ['option-analysis-card', isCorrect ? 'correct' : '', isUserWrong ? 'user-wrong' : '']
            .filter(Boolean)
            .join(' ');
          const tags = [
            isCorrect ? '<span class="tag good">正确</span>' : '',
            isUserWrong ? '<span class="tag wrong">你当时选择</span>' : '',
          ].join(' ');

          return `<div class="${classes}">
            <div class="option-analysis-head">
              <strong><span class="option-analysis-number">${optLabel(number)}</span> ${esc(option)}</strong>
              <span>${tags}</span>
            </div>
            <p>${esc(explanations[index] || '暂未补充该选项的解释。')}</p>
          </div>`;
        }).join('')}
      </div>
    </section>`;
}

export function renderReview({ state, items, filters, onReviewResult, onEdit }) {
  const queue = buildDueQueue(items, filters);
  const main = document.getElementById('reviewMain');
  const queueElement = document.getElementById('queue');

  if (!queue.length) {
    main.innerHTML = '<div class="empty">当前筛选条件下没有需要复习的题。</div>';
    queueElement.innerHTML = '';
    state.currentId = null;
    return;
  }

  if (!state.currentId || !queue.some(question => question.id === state.currentId)) {
    state.currentId = queue[0].id;
  }

  const question = items.find(item => item.id === state.currentId) || queue[0];
  main.innerHTML = `<article class="card question-card">
    <div class="meta">
      <span class="pill warn">${esc(question.sourceExam)}</span>
      <span class="pill accent">${esc(question.category)}</span>
      <span class="pill">Q${question.number}</span>
      <span class="pill">${esc(question.subtype || '')}</span>
      ${question.sourceNote ? `<span class="pill warn">${esc(question.sourceNote)}</span>` : ''}
      <span class="pill">PDF p.${esc(question.page || '—')}</span>
    </div>
    <h2 class="question-title">先重新做一遍，再看解析</h2>
    ${question.context ? `<div class="context">${esc(question.context)}</div>` : ''}
    <p class="stem">${esc(question.stem)}</p>
    <div class="options">
      ${question.options.map((option, index) => `<button type="button" class="option" data-choice="${index + 1}">
        <span class="n">${optLabel(index + 1)}</span><span>${esc(option)}</span>
      </button>`).join('')}
    </div>
    <div class="reveal"><button type="button" class="btn primary" id="revealBtn">显示我的旧答案与解析</button></div>
    <div class="explain" id="explainBox">
      <div class="explain-grid">
        <div class="ex-block good"><h4>正确选项 <span class="answer-option-number">${optLabel(question.correctAnswer)}</span></h4><p>${esc(question.options[question.correctAnswer - 1])}</p></div>
        <div class="ex-block bad"><h4>你当时选了 <span class="answer-option-number">${optLabel(question.userAnswer)}</span></h4><p>${esc(question.options[question.userAnswer - 1])}</p></div>
        <div class="ex-block good"><h4>为什么正确</h4><p>${esc(question.explanation)}</p></div>
        <div class="ex-block bad"><h4>为什么你的选项不对</h4><p>${esc(question.wrongReason)}</p></div>
        <div class="ex-block"><h4>复习重点</h4><p>${esc(question.keyPoint || '')}</p></div>
      </div>
      ${optionAnalysisHtml(question)}
      <div class="review-actions">
        <button type="button" class="btn danger" id="againBtn">还需复习 · 明天再来</button>
        <button type="button" class="btn primary" id="knowBtn">已掌握 · 拉长间隔</button>
        <button type="button" class="btn" id="editThisBtn">编辑这道题</button>
      </div>
    </div>
  </article>`;

  main.querySelectorAll('.option').forEach(button => {
    button.addEventListener('click', () => {
      main.querySelectorAll('.option').forEach(item => item.classList.remove('is-selected'));
      button.classList.add('is-selected');
    });
  });

  document.getElementById('revealBtn').addEventListener('click', () => {
    document.getElementById('explainBox').classList.add('show');
    main.querySelectorAll('.option').forEach(button => {
      const number = Number(button.dataset.choice);
      if (number === question.userAnswer) button.classList.add('user-wrong');
      if (number === question.correctAnswer) button.classList.add('correct');
      const text = button.querySelector('span:last-child');
      if (number === question.userAnswer) {
        text.insertAdjacentHTML('beforeend', ' <span class="tag wrong">你当时的错误选项</span>');
      }
      if (number === question.correctAnswer) {
        text.insertAdjacentHTML('beforeend', ' <span class="tag good">正确</span>');
      }
    });
    document.getElementById('revealBtn').disabled = true;
  });

  document.getElementById('againBtn').addEventListener('click', () => onReviewResult(question, false));
  document.getElementById('knowBtn').addEventListener('click', () => onReviewResult(question, true));
  document.getElementById('editThisBtn').addEventListener('click', () => onEdit(question.id));

  queueElement.innerHTML = queue.slice(0, 12).map(item => `
    <button type="button" class="qitem" data-id="${item.id}">
      <span><strong>${esc(item.sourceExam)} · Q${item.number}</strong><br><span class="muted">${esc(item.category)}</span></span>
      <span class="muted">${item.nextReview || '今天'}</span>
    </button>`).join('');

  queueElement.querySelectorAll('.qitem').forEach(button => {
    button.addEventListener('click', () => {
      state.currentId = button.dataset.id;
      renderReview({ state, items, filters, onReviewResult, onEdit });
    });
  });
}

export function renderList({ items, filters, onReview, onEdit, onDelete }) {
  const list = document.getElementById('questionList');
  const today = todayString();
  const scoped = filterQuestions(items, filters, today)
    .sort((a, b) => b.sourceExam.localeCompare(a.sourceExam) || a.category.localeCompare(b.category, 'ja') || a.number - b.number);

  if (!scoped.length) {
    list.innerHTML = '<div class="empty">没有匹配的错题。</div>';
    return;
  }

  list.innerHTML = scoped.map(question => `<div class="row">
    <div><div class="qid">Q${question.number}</div><div class="mini">${esc(question.sourceExam)}</div><div class="mini">${esc(question.category)}</div></div>
    <div class="row-main">
      <div class="stem-mini">${esc(question.stem)}</div>
      <div class="mini"><span class="status-dot ${question.mastered ? 'good' : isDue(question, today) ? 'due' : ''}"></span>${question.mastered ? '已掌握' : isDue(question, today) ? '到期复习' : `下次 ${question.nextReview}`} · 你选 ${optLabel(question.userAnswer)} → 正确 ${optLabel(question.correctAnswer)}</div>
    </div>
    <div class="row-actions">
      <button class="iconbtn" data-review="${question.id}">复习</button>
      <button class="iconbtn" data-edit="${question.id}">编辑</button>
      <button class="iconbtn" data-delete="${question.id}">删除</button>
    </div>
  </div>`).join('');

  list.querySelectorAll('[data-review]').forEach(button => button.addEventListener('click', () => onReview(button.dataset.review)));
  list.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => onEdit(button.dataset.edit)));
  list.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => onDelete(button.dataset.delete)));
}

export function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(button => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });

  document.querySelectorAll('.panel').forEach(panel => {
    const active = panel.id === `panel-${tab}`;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
}
