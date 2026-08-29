const STORAGE_KEY='jlpt-n1-wrong-questions-v1';
const INTERVALS=[1,3,7,14,30];
let state={items:[],currentId:null,activeTab:'review'};

function isoToday(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function dateOnly(d){const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
function addDays(days){const d=isoToday();d.setDate(d.getDate()+days);return dateOnly(d)}
function cloneSeed(){return SEED.map(q=>({...q,reviewStep:0,nextReview:dateOnly(isoToday()),reviewCount:0,lastResult:null,mastered:false,createdAt:new Date().toISOString()}))}
function load(){try{const raw=localStorage.getItem(STORAGE_KEY);state.items=raw?JSON.parse(raw):cloneSeed()}catch(e){state.items=cloneSeed()} if(!state.items.length)state.items=cloneSeed();}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.items));renderAll()}
function due(q){return !q.mastered && (!q.nextReview || q.nextReview<=dateOnly(isoToday()))}
function categoryMatch(q){const c=document.getElementById('categoryFilter').value;return c==='all'||q.category===c}
function searchMatch(q){const s=document.getElementById('searchInput').value.trim().toLowerCase();if(!s)return true;return [q.number,q.category,q.subtype,q.stem,q.keyPoint,...q.options].join(' ').toLowerCase().includes(s)}
function filtered(){return state.items.filter(q=>categoryMatch(q)&&searchMatch(q))}
function dueQueue(){let arr=filtered().filter(due);if(!arr.length)arr=filtered().filter(q=>!q.mastered);return arr.sort((a,b)=>(a.nextReview||'').localeCompare(b.nextReview||'')||a.number-b.number)}
function esc(s=''){return String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function optLabel(n){return ['','①','②','③','④'][n]}
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}

function renderStats(){const total=state.items.length, mastered=state.items.filter(q=>q.mastered).length, dueN=state.items.filter(due).length;const cats={};state.items.forEach(q=>cats[q.category]=(cats[q.category]||0)+1);document.getElementById('stats').innerHTML=`
<div class="stat"><div class="num">${total}</div><div class="label">错题总数</div></div>
<div class="stat"><div class="num">${dueN}</div><div class="label">今天应复习</div></div>
<div class="stat"><div class="num">${mastered}</div><div class="label">已掌握</div></div>
<div class="stat"><div class="num">${cats['文法']||0}</div><div class="label">文法错题（当前重点）</div></div>`}

function renderReview(){const qarr=dueQueue();const main=document.getElementById('reviewMain');if(!qarr.length){main.innerHTML='<div class="empty">当前筛选条件下没有需要复习的题。</div>';document.getElementById('queue').innerHTML='';return}
if(!state.currentId||!qarr.some(q=>q.id===state.currentId))state.currentId=qarr[0].id;const q=state.items.find(x=>x.id===state.currentId)||qarr[0];
main.innerHTML=`<article class="card question-card">
<div class="meta"><span class="pill accent">${esc(q.category)}</span><span class="pill">Q${q.number}</span><span class="pill">${esc(q.subtype||'')}</span>${q.sourceNote?`<span class="pill warn">${esc(q.sourceNote)}</span>`:''}<span class="pill">PDF p.${q.page||'—'}</span></div>
<h2 class="question-title">先重新做一遍，再看解析</h2>
${q.context?`<div class="context">${esc(q.context)}</div>`:''}
<p class="stem">${esc(q.stem)}</p>
<div class="options">${q.options.map((o,i)=>`<button type="button" class="option" data-choice="${i+1}"><span class="n">${optLabel(i+1)}</span><span>${esc(o)}</span></button>`).join('')}</div>
<div class="reveal"><button type="button" class="btn primary" id="revealBtn">显示我的旧答案与解析</button></div>
<div class="explain" id="explainBox">
<div class="explain-grid">
  <div class="ex-block good"><h4>正确选项 ${optLabel(q.correctAnswer)}</h4><p>${esc(q.options[q.correctAnswer-1])}</p></div>
  <div class="ex-block bad"><h4>你当时选了 ${optLabel(q.userAnswer)}</h4><p>${esc(q.options[q.userAnswer-1])}</p></div>
  <div class="ex-block good"><h4>为什么正确</h4><p>${esc(q.explanation)}</p></div>
  <div class="ex-block bad"><h4>为什么你的选项不对</h4><p>${esc(q.wrongReason)}</p></div>
  <div class="ex-block"><h4>复习重点</h4><p>${esc(q.keyPoint||'')}</p></div>
</div>
<div class="review-actions"><button type="button" class="btn danger" id="againBtn">还需复习 · 明天再来</button><button type="button" class="btn primary" id="knowBtn">已掌握 · 拉长间隔</button><button type="button" class="btn" id="editThisBtn">编辑这道题</button></div>
</div></article>`;
let chosen=null;main.querySelectorAll('.option').forEach(btn=>btn.addEventListener('click',()=>{chosen=Number(btn.dataset.choice);main.querySelectorAll('.option').forEach(x=>x.style.outline='');btn.style.outline='2px solid var(--accent)'}));
document.getElementById('revealBtn').addEventListener('click',()=>{document.getElementById('explainBox').classList.add('show');main.querySelectorAll('.option').forEach(btn=>{const n=Number(btn.dataset.choice);if(n===q.userAnswer)btn.classList.add('user-wrong');if(n===q.correctAnswer)btn.classList.add('correct');const text=btn.querySelector('span:last-child');if(n===q.userAnswer)text.insertAdjacentHTML('beforeend',' <span class="tag wrong">你当时的错误选项</span>');if(n===q.correctAnswer)text.insertAdjacentHTML('beforeend',' <span class="tag good">正确</span>')});document.getElementById('revealBtn').disabled=true});
document.getElementById('againBtn').addEventListener('click',()=>reviewResult(q,false));
document.getElementById('knowBtn').addEventListener('click',()=>reviewResult(q,true));
document.getElementById('editThisBtn').addEventListener('click',()=>openEditor(q.id));
const queue=document.getElementById('queue');queue.innerHTML=qarr.slice(0,12).map(x=>`<button type="button" class="qitem" data-id="${x.id}" style="border:0;width:100%;text-align:left"><span><strong>Q${x.number}</strong> · ${esc(x.category)}</span><span class="muted">${x.nextReview||'今天'}</span></button>`).join('');queue.querySelectorAll('.qitem').forEach(b=>b.addEventListener('click',()=>{state.currentId=b.dataset.id;renderReview()}));}

function reviewResult(q,known){q.reviewCount=(q.reviewCount||0)+1;q.lastResult=known?'known':'again';if(known){q.reviewStep=Math.min((q.reviewStep||0)+1,INTERVALS.length);const days=INTERVALS[Math.min(q.reviewStep-1,INTERVALS.length-1)];q.nextReview=addDays(days);if(q.reviewStep>=INTERVALS.length)q.mastered=true;toast(`Q${q.number}：下次 ${q.nextReview}`)}else{q.reviewStep=0;q.nextReview=addDays(1);q.mastered=false;toast(`Q${q.number}：明天再次复习`)}state.currentId=null;save()}

function renderList(){const list=document.getElementById('questionList');const arr=filtered().sort((a,b)=>a.category.localeCompare(b.category,'ja')||a.number-b.number);if(!arr.length){list.innerHTML='<div class="empty">没有匹配的错题。</div>';return}list.innerHTML=arr.map(q=>`<div class="row"><div><div class="qid">Q${q.number}</div><div class="mini">${esc(q.category)}</div></div><div style="min-width:0"><div class="stem-mini">${esc(q.stem)}</div><div class="mini"><span class="status-dot ${q.mastered?'good':due(q)?'due':''}"></span>${q.mastered?'已掌握':due(q)?'到期复习':`下次 ${q.nextReview}`} · 你选 ${optLabel(q.userAnswer)} → 正确 ${optLabel(q.correctAnswer)}</div></div><div class="row-actions"><button class="iconbtn" data-review="${q.id}">复习</button><button class="iconbtn" data-edit="${q.id}">编辑</button><button class="iconbtn" data-delete="${q.id}">删除</button></div></div>`).join('');list.querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',()=>{state.currentId=b.dataset.review;switchTab('review')}));list.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(b.dataset.edit)));list.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>{if(confirm('确认删除这道错题？')){state.items=state.items.filter(q=>q.id!==b.dataset.delete);save()}}));}

function setupOptionEditor(){const el=document.getElementById('optionEditor');el.innerHTML=[1,2,3,4].map(n=>`<div class="option-edit"><strong>${optLabel(n)}</strong><input class="control" id="opt${n}" required></div>`).join('')}
function clearEditor(){document.getElementById('editorTitle').textContent='添加错题';document.getElementById('editId').value='';document.getElementById('editorForm').reset();document.getElementById('qUserAnswer').value='1';document.getElementById('qCorrectAnswer').value='1';}
function openEditor(id){const q=state.items.find(x=>x.id===id);switchTab('edit');if(!q){clearEditor();return}document.getElementById('editorTitle').textContent=`编辑 Q${q.number}`;document.getElementById('editId').value=q.id;document.getElementById('qNumber').value=q.number;document.getElementById('qCategory').value=q.category;document.getElementById('qSubtype').value=q.subtype||'';document.getElementById('qStem').value=q.stem;document.getElementById('qContext').value=q.context||'';q.options.forEach((o,i)=>document.getElementById(`opt${i+1}`).value=o);document.getElementById('qUserAnswer').value=q.userAnswer;document.getElementById('qCorrectAnswer').value=q.correctAnswer;document.getElementById('qExplanation').value=q.explanation;document.getElementById('qWrongReason').value=q.wrongReason;document.getElementById('qKeyPoint').value=q.keyPoint||'';}

function saveEditor(e){e.preventDefault();const id=document.getElementById('editId').value||`custom-${Date.now()}`;const old=state.items.find(q=>q.id===id);const item={...(old||{}),id,number:Number(document.getElementById('qNumber').value),category:document.getElementById('qCategory').value,subtype:document.getElementById('qSubtype').value.trim(),stem:document.getElementById('qStem').value.trim(),context:document.getElementById('qContext').value.trim(),options:[1,2,3,4].map(n=>document.getElementById(`opt${n}`).value.trim()),userAnswer:Number(document.getElementById('qUserAnswer').value),correctAnswer:Number(document.getElementById('qCorrectAnswer').value),explanation:document.getElementById('qExplanation').value.trim(),wrongReason:document.getElementById('qWrongReason').value.trim(),keyPoint:document.getElementById('qKeyPoint').value.trim(),page:old?.page||'—',reviewStep:old?.reviewStep||0,nextReview:old?.nextReview||dateOnly(isoToday()),reviewCount:old?.reviewCount||0,lastResult:old?.lastResult||null,mastered:old?.mastered||false,createdAt:old?.createdAt||new Date().toISOString()};if(old)Object.assign(old,item);else state.items.push(item);save();toast(old?'已更新错题':'已添加错题');clearEditor();switchTab('all')}

function switchTab(tab){state.activeTab=tab;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.getElementById(`panel-${tab}`).classList.add('active');if(tab==='review')renderReview();if(tab==='all')renderList()}
function renderAll(){renderStats();renderReview();renderList()}
function exportData(){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),items:state.items},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`jlpt-n1-wrong-questions-${dateOnly(isoToday())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function importData(file){const r=new FileReader();r.onload=()=>{try{const data=JSON.parse(r.result);const arr=Array.isArray(data)?data:data.items;if(!Array.isArray(arr))throw new Error('invalid');state.items=arr;save();toast(`已导入 ${arr.length} 道错题`)}catch(e){alert('JSON格式无法识别。请导入由本网站导出的备份文件。')}};r.readAsText(file)}

load();setupOptionEditor();renderAll();
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
document.getElementById('categoryFilter').addEventListener('change',renderAll);document.getElementById('searchInput').addEventListener('input',renderAll);
document.getElementById('addBtn').addEventListener('click',()=>{clearEditor();switchTab('edit')});document.getElementById('cancelEditBtn').addEventListener('click',clearEditor);document.getElementById('editorForm').addEventListener('submit',saveEditor);
document.getElementById('exportBtn').addEventListener('click',exportData);document.getElementById('importFile').addEventListener('change',e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=''})
document.getElementById('resetProgressBtn').addEventListener('click',()=>{if(confirm('只重置复习进度，保留所有题目与编辑内容？')){state.items.forEach(q=>{q.reviewStep=0;q.nextReview=dateOnly(isoToday());q.reviewCount=0;q.lastResult=null;q.mastered=false});save();toast('复习进度已重置')}})
document.getElementById('resetAllBtn').addEventListener('click',()=>{if(confirm('将恢复为初始35道错题，你后来添加或修改的内容会丢失。建议先导出JSON备份。继续吗？')){state.items=cloneSeed();save();clearEditor();toast('已恢复初始35题')}})
