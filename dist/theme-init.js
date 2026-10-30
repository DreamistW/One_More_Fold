// Apply the saved/system theme before styles load to avoid a light first frame.
(() => {
  let preference='system';
  try {
    const saved=localStorage.getItem('one-more-fold-theme');
    if(['dark','light','system'].includes(saved)) preference=saved;
  } catch { /* Storage may be disabled. */ }
  const dark=preference==='dark' || (preference==='system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const resolved=dark?'dark':'light';
  document.documentElement.dataset.theme=resolved;
  document.documentElement.dataset.themePreference=preference;
  document.documentElement.style.colorScheme=resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#000000':'#eeece3');
})();
