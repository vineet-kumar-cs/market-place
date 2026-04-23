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
