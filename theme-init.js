(function(){
  try{
    const saved=localStorage.getItem('n1-wrong-answer-theme');
    const theme=(saved==='light'||saved==='dark')
      ? saved
      : (window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
    document.documentElement.dataset.theme=theme;
  }catch(_error){
    document.documentElement.dataset.theme='light';
  }
})();
