(function(){
  'use strict';

  let editorSaveActive=false;

  function optionExplanationMap(sourceExam,number){
    const source=normalizeSource(sourceExam||DEFAULT_SOURCE_EXAM);
    const mapped=window.OPTION_EXPLANATIONS?.[source]?.[Number(number)];
    return Array.isArray(mapped)&&mapped.length===4?mapped.map(v=>String(v||'').trim()):['','','',''];
  }

  window.getOptionExplanations=function(q){
    const source=q?.sourceExam??q?.source_exam??DEFAULT_SOURCE_EXAM;
    const number=q?.number??q?.question_number;
    const result=optionExplanationMap(source,number);
    const raw=q?.optionExplanations??q?.option_explanations;

    if(Array.isArray(raw)&&raw.length===4){
      raw.forEach((value,index)=>{
        const text=String(value??'').trim();
        if(text)result[index]=text;
      });
    }

    const correct=Number(q?.correctAnswer??q?.correct_answer);
    const user=Number(q?.userAnswer??q?.user_answer);
    const explanation=String(q?.explanation??'').trim();
    const wrongReason=String(q?.wrongReason??q?.wrong_reason??'').trim();
    if(correct>=1&&correct<=4&&!result[correct-1]&&explanation)result[correct-1]=explanation;
    if(user>=1&&user<=4&&!result[user-1]&&wrongReason)result[user-1]=wrongReason;
    return result;
  };

  function readEditorExplanations(){
    return [1,2,3,4].map(n=>document.getElementById(`optEx${n}`)?.value.trim()||'');
  }

  const baseSeedToRow=seedToRow;
  seedToRow=function(q,userId){
    const row=baseSeedToRow(q,userId);
    row.option_explanations=window.getOptionExplanations(q);
    return row;
  };

  const baseRowToItem=rowToItem;
  rowToItem=function(r){
    const item=baseRowToItem(r);
    item.optionExplanations=window.getOptionExplanations(r);
    return item;
  };

  const baseItemToRow=itemToRow;
  itemToRow=function(q){
    const row=baseItemToRow(q);
    let explanations=window.getOptionExplanations(q);
    const editorValues=readEditorExplanations();
    const hasStored=Array.isArray(q?.optionExplanations)&&q.optionExplanations.some(v=>String(v||'').trim());

    if(editorSaveActive&&editorValues.every(Boolean)){
      explanations=editorValues;
    }else if(!hasStored&&editorValues.some(Boolean)){
      explanations=editorValues;
    }

    row.option_explanations=explanations;
    return row;
  };

  const baseSearchMatch=searchMatch;
  searchMatch=function(q){
    if(baseSearchMatch(q))return true;
    const term=document.getElementById('searchInput').value.trim().toLowerCase();
    if(!term)return true;
    return window.getOptionExplanations(q).join(' ').toLowerCase().includes(term);
  };

  function enhanceOptionEditor(){
    const editor=document.getElementById('optionEditor');
    if(!editor)return;
    const oldOptions=[1,2,3,4].map(n=>document.getElementById(`opt${n}`)?.value||'');
    editor.innerHTML=[1,2,3,4].map(n=>`
      <div class="option-edit option-edit-detailed">
        <strong>${optLabel(n)}</strong>
        <div class="option-edit-body">
          <input class="control" id="opt${n}" required placeholder="选项内容">
          <textarea class="control option-explanation-input" id="optEx${n}" required placeholder="解释这个选项为什么正确或错误"></textarea>
        </div>
      </div>`).join('');
    oldOptions.forEach((value,index)=>{document.getElementById(`opt${index+1}`).value=value;});
  }

  enhanceOptionEditor();

  document.getElementById('editorForm')?.addEventListener('submit',()=>{
    editorSaveActive=true;
    queueMicrotask(()=>{editorSaveActive=false;});
  },true);

  const baseOpenEditor=openEditor;
  openEditor=function(id){
    baseOpenEditor(id);
    const q=state.items.find(x=>x.id===id);
    if(!q)return;
    window.getOptionExplanations(q).forEach((text,index)=>{
      const input=document.getElementById(`optEx${index+1}`);
      if(input)input.value=text;
    });
  };

  const baseClearEditor=clearEditor;
  clearEditor=function(){
    baseClearEditor();
    [1,2,3,4].forEach(n=>{
      const input=document.getElementById(`optEx${n}`);
      if(input)input.value='';
    });
  };

  const baseRenderReview=renderReview;
  renderReview=function(){
    baseRenderReview();
    const qarr=dueQueue();
    if(!qarr.length)return;
    const q=state.items.find(x=>x.id===state.currentId)||qarr[0];
    const box=document.getElementById('explainBox');
    if(!box||box.querySelector('.option-analysis-section'))return;

    const explanations=window.getOptionExplanations(q);
    const section=document.createElement('section');
    section.className='option-analysis-section';
    section.innerHTML=`
      <h3>四个选项逐项解析</h3>
      <div class="option-analysis-grid">
        ${q.options.map((option,index)=>{
          const n=index+1;
          const isCorrect=n===q.correctAnswer;
          const isUser=n===q.userAnswer;
          const classes=['option-analysis-card',isCorrect?'correct':'',isUser&&!isCorrect?'user-wrong':''].filter(Boolean).join(' ');
          const tags=[isCorrect?'<span class="tag good">正确</span>':'',isUser&&!isCorrect?'<span class="tag wrong">你当时选择</span>':''].join(' ');
          return `<div class="${classes}">
            <div class="option-analysis-head"><strong>${optLabel(n)} ${esc(option)}</strong><span>${tags}</span></div>
            <p>${esc(explanations[index]||'暂未补充该选项的解释。')}</p>
          </div>`;
        }).join('')}
      </div>`;

    const actions=box.querySelector('.review-actions');
    if(actions)box.insertBefore(section,actions);else box.appendChild(section);
  };

  if(state.user)loadCloud();
})();
