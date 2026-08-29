const THEME_STORAGE_KEY='n1-wrong-answer-theme';

function getPreferredTheme(){
  try{
    const saved=localStorage.getItem(THEME_STORAGE_KEY);
    if(saved==='light'||saved==='dark')return saved;
  }catch(_error){}
  return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}

function updateThemeButton(theme){
  const button=document.getElementById('themeToggle');
  if(!button)return;
  const isDark=theme==='dark';
  const icon=button.querySelector('[data-theme-icon]');
  const label=button.querySelector('[data-theme-label]');

  // The button displays the CURRENT theme, while its accessible label
  // describes the action that will happen when it is pressed.
  if(icon)icon.textContent=isDark?'☾':'☀';
  if(label)label.textContent=isDark?'夜间':'日间';
  button.setAttribute('aria-label',isDark?'当前为夜间模式，点击切换到日间模式':'当前为日间模式，点击切换到夜间模式');
  button.setAttribute('title',isDark?'当前：夜间模式 · 点击切换到日间':'当前：日间模式 · 点击切换到夜间');
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
