// Enhance the existing controls without replacing their quiz event handlers.
(() => {
  const panel = document.querySelector('.sticky-panel');
  if (!panel) return;

  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'ribbon-tab';
  tab.id = 'quizToolsToggle';
  tab.setAttribute('aria-controls', 'quizToolsRibbon');
  tab.innerHTML = 'Quiz tools <span aria-hidden="true">⌄</span>';
  panel.id = 'quizToolsRibbon';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Quiz tools');
  panel.classList.add('quiz-ribbon');

  const heading = document.createElement('div');
  heading.className = 'ribbon-heading';
  heading.innerHTML = '<strong>Quiz tools</strong><label class="ribbon-auto-hide"><input type="checkbox" checked> Auto-hide on scroll</label><button type="button" class="btn btn-ghost small" aria-label="Close quiz tools">Close ↑</button>';
  panel.prepend(heading);
  const autoHide = heading.querySelector('input');
  const closeButton = heading.querySelector('button');
  try { autoHide.checked = localStorage.getItem('mcq-ribbon-auto-hide') !== 'false'; } catch {}
  autoHide.addEventListener('change', () => {
    try { localStorage.setItem('mcq-ribbon-auto-hide', String(autoHide.checked)); } catch {}
  });

  // Keep the fixed ribbon outside .wrap's stacking context, below existing dialogs.
  document.body.append(tab, panel);
  document.body.classList.add('has-quiz-ribbon');
  let isOpen = false;
  let openedAtScroll = window.scrollY;
  function setOpen(open, focusTools = false) {
    const focusWasInside = panel.contains(document.activeElement);
    isOpen = open;
    if (open) openedAtScroll = window.scrollY;
    tab.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
    panel.classList.toggle('is-open', open);
    if (open && focusTools) closeButton.focus({ preventScroll: true });
    if (!open && focusWasInside) tab.focus({ preventScroll: true });
  }
  tab.addEventListener('click', event => setOpen(!isOpen, event.detail === 0));
  closeButton.addEventListener('click', () => setOpen(false));
  document.addEventListener('click', event => {
    if (isOpen && !panel.contains(event.target) && !tab.contains(event.target)) setOpen(false);
  });
  document.addEventListener('focusin', event => {
    if (isOpen && !panel.contains(event.target) && event.target !== tab) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen) {
      setOpen(false);
      tab.focus({ preventScroll: true });
    }
  });
  window.addEventListener('scroll', () => {
    // Never dismiss a keyboard user's controls while they are editing them.
    if (isOpen && autoHide.checked && !panel.contains(document.activeElement) &&
        Math.abs(window.scrollY - openedAtScroll) > 24) setOpen(false);
  }, { passive: true });
  setOpen(false);
})();
