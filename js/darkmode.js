// <<<<<<< HEAD
(function () {
  function getPreferredTheme() {
    var stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    updateToggleButtons(theme);
  }

  function updateToggleButtons(theme) {
    var icon = theme === 'dark' ? '☀️' : '🌙';
    var title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.textContent = icon;
      btn.setAttribute('title', title);
    });
  }

  function toggleDarkMode() {
    document.documentElement.classList.add('theme-transitioning');

    var isDark = document.documentElement.classList.contains('dark');
    var newTheme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);

    setTimeout(function () {
      document.documentElement.classList.remove('theme-transitioning');
    }, 350);

    return newTheme === 'dark';
  }

  applyTheme(getPreferredTheme());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      updateToggleButtons(getPreferredTheme());
    });
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem('theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  window.toggleDarkMode = toggleDarkMode;
  window.updateToggleButtons = updateToggleButtons;
  window.getPreferredTheme = getPreferredTheme;
})();
// ============================================================
// Dark Mode Toggle
// ============================================================

function initDarkMode() {
  // Check if user has a saved preference
  const savedMode = localStorage.getItem('theme-mode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Apply saved preference or system preference
  if (savedMode === 'dark' || (savedMode === null && prefersDark)) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  
  // Save preference
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme-mode', isDark ? 'dark' : 'light');
  
  return isDark;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDarkMode);

// Also initialize immediately if DOM is already loaded
if (document.readyState !== 'loading') {
  initDarkMode();
}
// >>>>>>> 2860d2281a18bc97a7d9f4a7991dbbe2a671dbfc
