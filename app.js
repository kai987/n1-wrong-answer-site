const INTERVALS=[1,3,7,14,30];
const SOURCE_EXAM='JLPT N1 2025-12';
const cfg=window.SUPABASE_CONFIG||{};
const sb=window.supabase?.createClient?.(cfg.url,cfg.key);
let state={items:[],currentId:null,activeTab:'review',user:null,loading:false};

function isoToday(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate());}
function dateOnly(d){const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`}
function addDays(days){const d=isoToday();d.setDate(d.getDate()+days);return dateOnly(d)}
function esc(s=''){return String(s).replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
function optLabel(n){return ['','①','②','③','④'][n]}
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2000)}
function setSync(text,kind=''){const el=document.getElementById('syncState');if(!el)return;el.textContent=text;el.dataset.kind=kind;}
function authMessage(text,isError=false){const el=document.getElementById('authMessage');el.textContent=text;el.classList.toggle('error-text',isError);}
function setAppVisible(loggedIn){document.getElementById('authShell').classList.toggle('is-hidden',loggedIn);document.getElementById('app').classList.toggle('is-hidden',!loggedIn);}

function seedToRow(q,userId){return {
  user_id:userId,source_exam:SOURCE_EXAM,question_number:q.number,category:q.category,subtype:q.subtype||null,page:String(q.page||''),
  stem:q.stem,context:q.context||null,options:q.options,user_answer:q.userAnswer,correct_answer:q.correctAnswer,
  explanation:q.explanation,wrong_reason:q.wrongReason,key_point:q.keyPoint||null,source_note:q.sourceNote||null,
  review_step:0,review_count:0,last_result:null,mastered:false,next_review_at:dateOnly(isoToday())
};}
function rowToItem(r){return {id:r.id,number:r.question_number,category:r.category,subtype:r.subtype||'',page:r.page||'—',stem:r.stem,context:r.context||'',options:r.options||[],userAnswer:r.user_answer,correctAnswer:r.correct_answer,explanation:r.explanation,wrongReason:r.wrong_reason,keyPoint:r.key_point||'',sourceNote:r.source_note||'',reviewStep:r.review_step||0,reviewCount:r.review_count||0,lastResult:r.last_result||null,mastered:!!r.mastered,nextReview:r.next_review_at||dateOnly(isoToday()),createdAt:r.created_at};}
function itemToRow(q){return {source_exam:SOURCE_EXAM,question_number:q.number,category:q.category,subtype:q.subtype||null,page:String(q.page||''),stem:q.stem,context:q.context||null,options:q.options,user_answer:q.userAnswer,correct_answer:q.correctAnswer,explanation:q.explanation,wrong_reason:q.wrongReason,key_point:q.keyPoint||null,source_note:q.sourceNote||null,review_step:q.reviewStep||0,review_count:q.reviewCount||0,last_result:q.lastResult||null,mastered:!!q.mastered,next_review_at:q.nextReview||dateOnly(isoToday())};}

async function ensureSeed(){
  const {count,error}=await sb.from('wrong_answers').select('id',{count:'exact',head:true}).eq('user_id',state.user.id);
  if(error)throw error;
  if((count||0)>0)return;
  setSync('首次使用：正在导入35题…');
  const rows=SEED.map(q=>seedToRow(q,state.user.id));
  const {error:insertError}=await sb.from('wrong_answers').insert(rows);
  if(insertError)throw insertError;
}
async function loadCloud(){
  if(!state.user)return;
  state.loading=true;setSync('正在同步…');
  try{
    await ensureSeed();
    const {data,error}=await sb.from('wrong_answers').select('*').eq('user_id',state.user.id).order('question_number',{ascending:true});
    if(error)throw error;
    state.items=(data||[]).map(rowToItem);state.currentId=null;renderAll();setSync(`云端已同步 · ${state.user.email||''}`,'ok');
  }catch(err){console.error(err);setSync('云端连接失败','error');toast('Supabase 数据表尚未配置或连接失败');}
  finally{state.loading=false;}
}

function due(q){return !q.mastered&&(!q.nextReview||q.nextReview<=dateOnly(isoToday()))}
function categoryMatch(q){const c=document.getElementById('categoryFilter').value;return c==='all'||q.category===c}
function searchMatch(q){const s=document.getElementById('searchInput').value.trim().toLowerCase();if(!s)return true;return [q.number,q.category,q.subtype,q.stem,q.keyPoint,...q.options].join(' ').toLowerCase().includes(s)}
function filtered(){return state.items.filter(q=>categoryMatch(q)&&searchMatch(q))}
function dueQueue(){let arr=filtered().filter(due);if(!arr.length)arr=filtered().filter(q=>!q.mastered);return arr.sort((a,b)=>(a.nextReview||'').localeCompare(b.nextReview||'')||a.number-b.number)}

function renderStats(){const total=state.items.length,mastered=state.items.filter(q=>q.mastered).length,dueN=state.items.filter(due).length;const cats={};state.items.forEach(q=>cats[q.category]=(cats[q.category]||0)+1);document.getElementById('stats').innerHTML=`<div class="stat"><div class="num">${total}</div><div class="label">错题总数</div></div><div class="stat"><div class="num">${dueN}</div><div class="label">今天应复习</div></div><div class="stat"><div class="num">${mastered}</div><div class="label">已掌握</div></div><div class="stat"><div class="num">${cats['文法']||0}</div><div class="label">文法错题（当前重点）</div></div>`}

function renderReview(){const qarr=dueQueue();const main=document.getElementById('reviewMain');if(!qarr.length){main.innerHTML='<div class="empty">当前筛选条件下没有需要复习的题。</div>';document.getElementById('queue').innerHTML='';return}if(!state.currentId||!qarr.some(q=>q.id===state.currentId))state.currentId=qarr[0].id;const q=state.items.find(x=>x.id===state.currentId)||qarr[0];main.innerHTML=`<article class="card question-card"><div class="meta"><span class="pill accent">${esc(q.category)}</span><span class="pill">Q${q.number}</span><span class="pill">${esc(q.subtype||'')}</span>${q.sourceNote?`<span class="pill warn">${esc(q.sourceNote)}</span>`:''}<span class="pill">PDF p.${q.page||'—'}</span></div><h2 class="question-title">先重新做一遍，再看解析</h2>${q.context?`<div class="context">${esc(q.context)}</div>`:''}<p class="stem">${esc(q.stem)}</p><div class="options">${q.options.map((o,i)=>`<button type="button" class="option" data-choice="${i+1}"><span class="n">${optLabel(i+1)}</span><span>${esc(o)}</span></button>`).join('')}</div><div class="reveal"><button type="button" class="btn primary" id="revealBtn">显示我的旧答案与解析</button></div><div class="explain" id="explainBox"><div class="explain-grid"><div class="ex-block good"><h4>正确选项 ${optLabel(q.correctAnswer)}</h4><p>${esc(q.options[q.correctAnswer-1])}</p></div><div class="ex-block bad"><h4>你当时选了 ${optLabel(q.userAnswer)}</h4><p>${esc(q.options[q.userAnswer-1])}</p></div><div class="ex-block good"><h4>为什么正确</h4><p>${esc(q.explanation)}</p></div><div class="ex-block bad"><h4>为什么你的选项不对</h4><p>${esc(q.wrongReason)}</p></div><div class="ex-block"><h4>复习重点</h4><p>${esc(q.keyPoint||'')}</p></div></div><div class="review-actions"><button type="button" class="btn danger" id="againBtn">还需复习 · 明天再来</button><button type="button" class="btn primary" id="knowBtn">已掌握 · 拉长间隔</button><button type="button" class="btn" id="editThisBtn">编辑这道题</button></div></div></article>`;
  main.querySelectorAll('.option').forEach(btn=>btn.addEventListener('click',()=>{main.querySelectorAll('.option').forEach(x=>x.style.outline='');btn.style.outline='2px solid var(--accent)'}));
  document.getElementById('revealBtn').addEventListener('click',()=>{document.getElementById('explainBox').classList.add('show');main.querySelectorAll('.option').forEach(btn=>{const n=Number(btn.dataset.choice);if(n===q.userAnswer)btn.classList.add('user-wrong');if(n===q.correctAnswer)btn.classList.add('correct');const text=btn.querySelector('span:last-child');if(n===q.userAnswer)text.insertAdjacentHTML('beforeend',' <span class="tag wrong">你当时的错误选项</span>');if(n===q.correctAnswer)text.insertAdjacentHTML('beforeend',' <span class="tag good">正确</span>')});document.getElementById('revealBtn').disabled=true});
  document.getElementById('againBtn').addEventListener('click',()=>reviewResult(q,false));document.getElementById('knowBtn').addEventListener('click',()=>reviewResult(q,true));document.getElementById('editThisBtn').addEventListener('click',()=>openEditor(q.id));
  const queue=document.getElementById('queue');queue.innerHTML=qarr.slice(0,12).map(x=>`<button type="button" class="qitem" data-id="${x.id}" style="border:0;width:100%;text-align:left"><span><strong>Q${x.number}</strong> · ${esc(x.category)}</span><span class="muted">${x.nextReview||'今天'}</span></button>`).join('');queue.querySelectorAll('.qitem').forEach(b=>b.addEventListener('click',()=>{state.currentId=b.dataset.id;renderReview()}));}

async function reviewResult(q,known){const old={...q};q.reviewCount=(q.reviewCount||0)+1;q.lastResult=known?'known':'again';if(known){q.reviewStep=Math.min((q.reviewStep||0)+1,INTERVALS.length);const days=INTERVALS[Math.min(q.reviewStep-1,INTERVALS.length-1)];q.nextReview=addDays(days);if(q.reviewStep>=INTERVALS.length)q.mastered=true}else{q.reviewStep=0;q.nextReview=addDays(1);q.mastered=false}setSync('正在保存复习结果…');const {error}=await sb.from('wrong_answers').update({...itemToRow(q),last_reviewed_at:new Date().toISOString()}).eq('id',q.id).eq('user_id',state.user.id);if(error){Object.assign(q,old);toast('保存失败');setSync('同步失败','error');return}state.currentId=null;renderAll();setSync(`云端已同步 · ${state.user.email||''}`,'ok');toast(known?`Q${q.number}：下次 ${q.nextReview}`:`Q${q.number}：明天再次复习`)}

function renderList(){const list=document.getElementById('questionList');const arr=filtered().sort((a,b)=>a.category.localeCompare(b.category,'ja')||a.number-b.number);if(!arr.length){list.innerHTML='<div class="empty">没有匹配的错题。</div>';return}list.innerHTML=arr.map(q=>`<div class="row"><div><div class="qid">Q${q.number}</div><div class="mini">${esc(q.category)}</div></div><div style="min-width:0"><div class="stem-mini">${esc(q.stem)}</div><div class="mini"><span class="status-dot ${q.mastered?'good':due(q)?'due':''}"></span>${q.mastered?'已掌握':due(q)?'到期复习':`下次 ${q.nextReview}`} · 你选 ${optLabel(q.userAnswer)} → 正确 ${optLabel(q.correctAnswer)}</div></div><div class="row-actions"><button class="iconbtn" data-review="${q.id}">复习</button><button class="iconbtn" data-edit="${q.id}">编辑</button><button class="iconbtn" data-delete="${q.id}">删除</button></div></div>`).join('');list.querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',()=>{state.currentId=b.dataset.review;switchTab('review')}));list.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(b.dataset.edit)));list.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('确认删除这道错题？'))return;const id=b.dataset.delete;const {error}=await sb.from('wrong_answers').delete().eq('id',id).eq('user_id',state.user.id);if(error){toast('删除失败');return}state.items=state.items.filter(q=>q.id!==id);renderAll();toast('已从云端删除')}));}

function setupOptionEditor(){document.getElementById('optionEditor').innerHTML=[1,2,3,4].map(n=>`<div class="option-edit"><strong>${optLabel(n)}</strong><input class="control" id="opt${n}" required></div>`).join('')}
function clearEditor(){document.getElementById('editorTitle').textContent='添加错题';document.getElementById('editId').value='';document.getElementById('editorForm').reset();document.getElementById('qUserAnswer').value='1';document.getElementById('qCorrectAnswer').value='1'}
function openEditor(id){const q=state.items.find(x=>x.id===id);switchTab('edit');if(!q){clearEditor();return}document.getElementById('editorTitle').textContent=`编辑 Q${q.number}`;document.getElementById('editId').value=q.id;document.getElementById('qNumber').value=q.number;document.getElementById('qCategory').value=q.category;document.getElementById('qSubtype').value=q.subtype||'';document.getElementById('qStem').value=q.stem;document.getElementById('qContext').value=q.context||'';q.options.forEach((o,i)=>document.getElementById(`opt${i+1}`).value=o);document.getElementById('qUserAnswer').value=q.userAnswer;document.getElementById('qCorrectAnswer').value=q.correctAnswer;document.getElementById('qExplanation').value=q.explanation;document.getElementById('qWrongReason').value=q.wrongReason;document.getElementById('qKeyPoint').value=q.keyPoint||''}

async function saveEditor(e){e.preventDefault();const id=document.getElementById('editId').value;const old=state.items.find(q=>q.id===id);const item={...(old||{}),number:Number(document.getElementById('qNumber').value),category:document.getElementById('qCategory').value,subtype:document.getElementById('qSubtype').value.trim(),stem:document.getElementById('qStem').value.trim(),context:document.getElementById('qContext').value.trim(),options:[1,2,3,4].map(n=>document.getElementById(`opt${n}`).value.trim()),userAnswer:Number(document.getElementById('qUserAnswer').value),correctAnswer:Number(document.getElementById('qCorrectAnswer').value),explanation:document.getElementById('qExplanation').value.trim(),wrongReason:document.getElementById('qWrongReason').value.trim(),keyPoint:document.getElementById('qKeyPoint').value.trim(),page:old?.page||'—',reviewStep:old?.reviewStep||0,nextReview:old?.nextReview||dateOnly(isoToday()),reviewCount:old?.reviewCount||0,lastResult:old?.lastResult||null,mastered:old?.mastered||false};setSync('正在保存…');if(old){const {data,error}=await sb.from('wrong_answers').update(itemToRow(item)).eq('id',old.id).eq('user_id',state.user.id).select().single();if(error){toast(error.message.includes('duplicate')?'同一套试卷中题号不能重复':'保存失败');setSync('同步失败','error');return}Object.assign(old,rowToItem(data));toast('已更新错题')}else{const payload={...itemToRow(item),user_id:state.user.id};const {data,error}=await sb.from('wrong_answers').insert(payload).select().single();if(error){toast(error.message.includes('duplicate')?'同一套试卷中题号不能重复':'添加失败');setSync('同步失败','error');return}state.items.push(rowToItem(data));toast('已添加错题')}clearEditor();renderAll();switchTab('all');setSync(`云端已同步 · ${state.user.email||''}`,'ok')}

function switchTab(tab){state.activeTab=tab;document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));document.getElementById(`panel-${tab}`).classList.add('active');if(tab==='review')renderReview();if(tab==='all')renderList()}
function renderAll(){renderStats();renderReview();renderList()}
function exportData(){const blob=new Blob([JSON.stringify({version:2,storage:'supabase',exportedAt:new Date().toISOString(),items:state.items},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`jlpt-n1-wrong-questions-${dateOnly(isoToday())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function importItems(arr){if(!Array.isArray(arr))throw new Error('invalid');const rows=arr.map(q=>({...itemToRow(q),user_id:state.user.id}));setSync('正在导入云端…');const {error:delError}=await sb.from('wrong_answers').delete().eq('user_id',state.user.id);if(delError)throw delError;const {error}=await sb.from('wrong_answers').insert(rows);if(error)throw error;await loadCloud();toast(`已导入 ${arr.length} 道错题`)}
function importData(file){const r=new FileReader();r.onload=async()=>{try{const data=JSON.parse(r.result);const arr=Array.isArray(data)?data:data.items;await importItems(arr)}catch(e){console.error(e);alert('JSON格式无法识别或云端导入失败。')}};r.readAsText(file)}

async function resetProgress(){if(!confirm('只重置复习进度，保留所有题目与编辑内容？'))return;const {error}=await sb.from('wrong_answers').update({review_step:0,next_review_at:dateOnly(isoToday()),review_count:0,last_result:null,mastered:false,last_reviewed_at:null}).eq('user_id',state.user.id);if(error){toast('重置失败');return}await loadCloud();toast('复习进度已重置')}
async function resetAll(){if(!confirm('将恢复为初始35道错题，你后来添加或修改的内容会丢失。建议先导出JSON备份。继续吗？'))return;const {error}=await sb.from('wrong_answers').delete().eq('user_id',state.user.id);if(error){toast('恢复失败');return}await ensureSeed();await loadCloud();clearEditor();toast('已恢复初始35题')}

async function signIn(email,password){authMessage('正在登录…');const {error}=await sb.auth.signInWithPassword({email,password});if(error){authMessage(error.message,true);return}authMessage('登录成功')}
async function signUp(email,password){authMessage('正在创建账号…');const {data,error}=await sb.auth.signUp({email,password});if(error){authMessage(error.message,true);return}if(data.session)authMessage('注册并登录成功');else authMessage('注册成功，请检查邮箱并完成验证后再登录。')}
async function handleSession(session){state.user=session?.user||null;setAppVisible(!!state.user);if(state.user)await loadCloud();else{state.items=[];state.currentId=null;authMessage('首次使用请注册；已有账号可直接登录。')}}

setupOptionEditor();
if(!sb){authMessage('Supabase 客户端未加载，请检查网络或 config.js。',true)}else{
  document.getElementById('authForm').addEventListener('submit',e=>{e.preventDefault();signIn(document.getElementById('authEmail').value.trim(),document.getElementById('authPassword').value)});
  document.getElementById('signUpBtn').addEventListener('click',()=>signUp(document.getElementById('authEmail').value.trim(),document.getElementById('authPassword').value));
  document.getElementById('signOutBtn').addEventListener('click',()=>sb.auth.signOut());
  sb.auth.onAuthStateChange((_event,session)=>handleSession(session));
  sb.auth.getSession().then(({data})=>handleSession(data.session));
}

document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
document.getElementById('categoryFilter').addEventListener('change',renderAll);document.getElementById('searchInput').addEventListener('input',renderAll);
document.getElementById('addBtn').addEventListener('click',()=>{clearEditor();switchTab('edit')});document.getElementById('cancelEditBtn').addEventListener('click',clearEditor);document.getElementById('editorForm').addEventListener('submit',saveEditor);
document.getElementById('exportBtn').addEventListener('click',exportData);document.getElementById('importFile').addEventListener('change',e=>{if(e.target.files[0])importData(e.target.files[0]);e.target.value=''});
document.getElementById('resetProgressBtn').addEventListener('click',resetProgress);document.getElementById('resetAllBtn').addEventListener('click',resetAll);
