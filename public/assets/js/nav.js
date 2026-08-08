/* ── Mobile Navigation Drawer ────────────────────── */
(function () {
  var burger = document.getElementById('navBurger');
  var drawer = document.getElementById('mobileNav');
  var closeBtn = document.getElementById('navClose');
  var bg = drawer ? drawer.querySelector('.s-nav__drawer-bg') : null;

  if (!burger || !drawer) return;

  function openNav() {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeNav() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', openNav);
  if (closeBtn) closeBtn.addEventListener('click', closeNav);
  if (bg) bg.addEventListener('click', closeNav);

  /* Close drawer when any nav link is tapped */
  drawer.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeNav);
  });

  /* Close on Escape key */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });
})();
