const menuButton = document.querySelector('[data-menu-button]');
const navigation = document.querySelector('[data-navigation]');
if (menuButton && navigation) {
  menuButton.hidden = false;
  navigation.dataset.collapsible = 'true';
  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    navigation.classList.remove('is-open');
  };
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    navigation.classList.toggle('is-open', open);
  });
  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menuButton.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
}

// Keep all requested placeholder hrefs as '#', with honest, accessible feedback.
const notice = document.querySelector('[data-store-notice]');
let noticeTimer;
document.querySelectorAll('a[data-amazon-placeholder]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    if (!notice) return;
    clearTimeout(noticeTimer);
    notice.hidden = false;
    notice.querySelector('[data-notice-text]').textContent =
      'The Amazon link for this title is coming soon.';
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 6000);
  });
});
document.querySelector('[data-dismiss-notice]')?.addEventListener('click', () => {
  notice.hidden = true;
  clearTimeout(noticeTimer);
});
