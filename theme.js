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
      <circle cx="12" cy="12" r="4" fill="currentColor"></circle>
      <g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
        <path d="M12 2.5v2.2"></path>
        <path d="M12 19.3v2.2"></path>
        <path d="M2.5 12h2.2"></path>
        <path d="M19.3 12h2.2"></path>
        <path d="m5.28 5.28 1.56 1.56"></path>
        <path d="m17.16 17.16 1.56 1.56"></path>
        <path d="m18.72 5.28-1.56 1.56"></path>
        <path d="m6.84 17.16-1.56 1.56"></path>
      </g>
    </svg>`;
}

function moonIcon(){
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8a8.7 8.7 0 1 0 11.4 11.4Z" fill="currentColor"></path>
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
