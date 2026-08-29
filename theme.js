const THEME_STORAGE_KEY='n1-wrong-answer-theme';

function getPreferredTheme(){
  try{
    const saved=localStorage.getItem(THEME_STORAGE_KEY);
    if(saved==='light'||saved==='dark')return saved;
  }catch(_error){}
  return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}

function sunIcon(){
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="2"></circle>
      <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M12 2.5v2.1"></path>
        <path d="M12 19.4v2.1"></path>
        <path d="M2.5 12h2.1"></path>
        <path d="M19.4 12h2.1"></path>
        <path d="m5.28 5.28 1.49 1.49"></path>
        <path d="m17.23 17.23 1.49 1.49"></path>
        <path d="m18.72 5.28-1.49 1.49"></path>
        <path d="m6.77 17.23-1.49 1.49"></path>
      </g>
    </svg>`;
}

function moonIcon(){
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.1 15.25A8.45 8.45 0 0 1 8.75 3.9 8.65 8.65 0 1 0 20.1 15.25Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>`;
}

function updateThemeButton(theme){
  const button=document.getElementById('themeToggle');
  if(!button)return;
  const isDark=theme==='dark';
  const icon=button.querySelector('[data-theme-icon]');
  if(icon)icon.innerHTML=isDark?moonIcon():sunIcon();
  button.setAttribute('aria-label',isDark?'当前为夜间模式，点击切换到日间模式':'当前为日间模式，点击切换到夜间模式');
  button.setAttribute('title',isDark?'切换到日间模式':'切换到夜间模式');
  button.setAttribute('aria-pressed',String(isDark));
}

function applyTheme(theme,{persist=false}={}){
  const normalized=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=normalized;
  if(persist){
    try{localStorage.setItem(THEME_STORAGE_KEY,normalized)}catch(_error){}
  }
  updateThemeButton(normalized);
}

applyTheme(document.documentElement.dataset.theme||getPreferredTheme());

document.getElementById('themeToggle')?.addEventListener('click',()=>{
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  applyTheme(next,{persist:true});
});
