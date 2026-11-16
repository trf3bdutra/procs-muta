

(function(){
  window.__H0 = location.hash;
  try {
    var saved = JSON.parse(localStorage.getItem('trgms-vademecum-v5') || '{}');
    var currentThemeDefault = saved.ui && saved.ui.commandThemeDefaultVersion === 1;
    document.documentElement.dataset.theme = currentThemeDefault && saved.theme === 'dark' ? 'dark' : 'light';
  } catch (_) {
    document.documentElement.dataset.theme = 'light';
  }
})();

