(function(){
  'use strict';

  const LIMITS={
    fileBytes:2*1024*1024,
    items:2000,
    subtype:120,
    page:50,
    stem:10000,
    context:50000,
    option:2000,
    explanation:20000,
    wrongReason:20000,
    keyPoint:5000,
    sourceNote:1000
  };
  const SOURCE_RE=/^\d{4}-(0[1-9]|1[0-2])$/;
  const CATEGORIES=new Set(['文字・語彙','文法','読解']);

  function text(value,name,{required=false,max=10000}={}){
    if(value===undefined||value===null)value='';
    if(typeof value!=='string')throw new Error(`${name} 必须是文本`);
    const result=value.trim();
    if(required&&!result)throw new Error(`${name} 不能为空`);
    if(result.length>max)throw new Error(`${name} 过长（最多 ${max} 字符）`);
    return result;
  }

  function integer(value,name,min,max){
    const result=Number(value);
    if(!Number.isInteger(result)||result<min||result>max){
      throw new Error(`${name} 必须是 ${min}～${max} 的整数`);
    }
    return result;
  }

  function booleanValue(value,name){
    if(value===undefined||value===null)return false;
    if(typeof value!=='boolean')throw new Error(`${name} 必须是布尔值`);
    return value;
  }

  function validDate(value,name){
    const fallback=typeof dateOnly==='function'&&typeof isoToday==='function'?dateOnly(isoToday()):new Date().toISOString().slice(0,10);
    const result=String(value||fallback).trim();
    const match=result.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match)throw new Error(`${name} 必须是 YYYY-MM-DD`);
    const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
    const normalized=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    if(Number.isNaN(date.getTime())||normalized!==result)throw new Error(`${name} 不是有效日期`);
    return result;
  }

  function normalizeItem(raw,index){
    const label=`第 ${index+1} 条`;
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error(`${label}不是有效对象`);

    const sourceExam=normalizeSource(raw.sourceExam??raw.source_exam??'2025-12');
    if(!SOURCE_RE.test(sourceExam))throw new Error(`${label}试卷来源应为 YYYY-MM，例如 2025-12`);

    const category=text(raw.category,`${label}分类`,{required:true,max:20});
    if(!CATEGORIES.has(category))throw new Error(`${label}分类无效`);

    if(!Array.isArray(raw.options)||raw.options.length!==4)throw new Error(`${label}必须正好包含 4 个选项`);
    const options=raw.options.map((value,i)=>text(value,`${label}选项 ${i+1}`,{required:true,max:LIMITS.option}));

    const page=text(raw.page,`${label}页码`,{max:LIMITS.page});
    if(/[<>]/.test(page))throw new Error(`${label}页码包含非法字符`);

    const lastResult=raw.lastResult??raw.last_result??null;
    if(lastResult!==null&&!['known','again'].includes(lastResult))throw new Error(`${label}复习结果无效`);

    return {
      sourceExam,
      number:integer(raw.number??raw.question_number,`${label}题号`,1,999),
      category,
      subtype:text(raw.subtype,`${label}题型`,{max:LIMITS.subtype}),
      page,
      stem:text(raw.stem,`${label}题目`,{required:true,max:LIMITS.stem}),
      context:text(raw.context,`${label}上下文`,{max:LIMITS.context}),
      options,
      userAnswer:integer(raw.userAnswer??raw.user_answer,`${label}错误选项`,1,4),
      correctAnswer:integer(raw.correctAnswer??raw.correct_answer,`${label}正确选项`,1,4),
      explanation:text(raw.explanation,`${label}正确选项解说`,{required:true,max:LIMITS.explanation}),
      wrongReason:text(raw.wrongReason??raw.wrong_reason,`${label}错误选项解说`,{required:true,max:LIMITS.wrongReason}),
      keyPoint:text(raw.keyPoint??raw.key_point,`${label}复习重点`,{max:LIMITS.keyPoint}),
      sourceNote:text(raw.sourceNote??raw.source_note,`${label}来源备注`,{max:LIMITS.sourceNote}),
      reviewStep:integer(raw.reviewStep??raw.review_step??0,`${label}复习阶段`,0,5),
      reviewCount:integer(raw.reviewCount??raw.review_count??0,`${label}复习次数`,0,1000000),
      lastResult,
      mastered:booleanValue(raw.mastered,`${label}掌握状态`),
      nextReview:validDate(raw.nextReview??raw.next_review_at,`${label}下次复习日期`)
    };
  }

  function validateItems(items){
    if(!Array.isArray(items))throw new Error('导入内容必须是错题数组');
    if(items.length<1)throw new Error('导入文件中没有错题');
    if(items.length>LIMITS.items)throw new Error(`一次最多导入 ${LIMITS.items} 道错题`);
    const normalized=items.map(normalizeItem);
    const seen=new Set();
    normalized.forEach((item,index)=>{
      const key=`${item.sourceExam}::${item.number}`;
      if(seen.has(key))throw new Error(`第 ${index+1} 条与前面存在重复：${item.sourceExam} · Q${item.number}`);
      seen.add(key);
    });
    return normalized;
  }

  async function secureImport(file){
    if(!(file instanceof File))return;
    if(file.size>LIMITS.fileBytes)throw new Error('JSON 文件不能超过 2 MB');
    const raw=await file.text();
    const parsed=JSON.parse(raw);
    const items=Array.isArray(parsed)?parsed:parsed?.items;
    const normalized=validateItems(items);
    if(!confirm(`导入将用 ${normalized.length} 道题替换当前账号的全部云端错题。导入为事务操作，失败时原数据不会变化。继续吗？`))return;

    const rows=normalized.map(itemToRow);
    setSync('正在安全导入云端…');
    const {data,error}=await sb.rpc('replace_wrong_answers',{p_items:rows});
    if(error)throw error;
    await loadCloud();
    const count=Number.isInteger(data)?data:normalized.length;
    toast(`已安全导入 ${count} 道错题`);
  }

  const oldImport=document.getElementById('importFile');
  if(oldImport){
    const secureInput=oldImport.cloneNode(true);
    oldImport.replaceWith(secureInput);
    secureInput.addEventListener('change',async event=>{
      const file=event.target.files?.[0];
      try{
        if(file)await secureImport(file);
      }catch(error){
        console.error(error);
        setSync('导入失败，原数据未更改','error');
        alert(`导入失败：${error?.message||'无法识别该 JSON 文件'}`);
      }finally{
        event.target.value='';
      }
    });
  }

  const oldSignUp=document.getElementById('signUpBtn');
  if(oldSignUp){
    const secureSignUp=oldSignUp.cloneNode(true);
    oldSignUp.replaceWith(secureSignUp);
    secureSignUp.addEventListener('click',()=>{
      const email=document.getElementById('authEmail').value.trim();
      const password=document.getElementById('authPassword').value;
      if(password.length<12){
        authMessage('注册密码至少需要 12 位；已有账号登录不受影响。',true);
        return;
      }
      signUp(email,password);
    });
  }
})();
