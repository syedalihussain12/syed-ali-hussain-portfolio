(function () {
  var html = document.documentElement, tb = document.getElementById('theme');
  function setTheme(t) {
    html.setAttribute('data-theme', t);
    tb.textContent = t === 'dark' ? 'Light' : 'Dark';
    tb.setAttribute('aria-label', 'Switch to ' + (t === 'dark' ? 'light' : 'dark') + ' mode');
  }
  setTheme(html.getAttribute('data-theme') || 'light');
  tb.addEventListener('click', function () {
    var t = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(t);
    try { localStorage.setItem('theme', t); } catch (e) {}
  });
  var btn = document.querySelector('.menu'), nav = document.getElementById('nav');
  btn.addEventListener('click', function () { btn.setAttribute('aria-expanded', String(nav.classList.toggle('open'))); });
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') { nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); } });
  var links = [].slice.call(nav.querySelectorAll('a'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id); }); });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });
  }
})();
