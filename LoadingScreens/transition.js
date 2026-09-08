(function () {
  var STORAGE_KEY = 'pt-pending';

  var SVGS = {
    'about-me': 'about-me-transition-black.svg',
    'case-study': 'case-study-transition-black.svg',
    'home': 'home-transition-black.svg'
  };

  // Path from the current page down to /LoadingScreens/, based on this script's own src.
  var scriptEl = document.currentScript;
  var basePath = scriptEl ? scriptEl.src.replace(/transition\.js.*$/, '') : 'LoadingScreens/';

  var overlay, artHost;
  var svgCache = {};

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'pt-overlay';
    overlay.innerHTML = '<div class="pt-art"></div>';
    document.body.appendChild(overlay);
    artHost = overlay.querySelector('.pt-art');
  }

  var CSS = '#pt-overlay{position:fixed;inset:0;z-index:999999;background:#050505;display:flex;align-items:center;justify-content:center;pointer-events:none;visibility:hidden;opacity:0;}'
    + '#pt-overlay.pt-active{pointer-events:auto;visibility:visible;opacity:1;}'
    + '.pt-art{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}'
    + '.pt-art svg{width:85vw;max-width:1600px;height:auto;display:block;}'
    + '.pt-art #spark{opacity:0;transform-origin:center;transform-box:fill-box;}'
    + '.pt-art #door-leaf{transform:scaleX(0);}'
    + '#pt-overlay.pt-draw .pt-art #door-leaf{animation:pt-door-open 400ms ease-out forwards;}'
    + '#pt-overlay.pt-draw .pt-art #gold-thread{animation:pt-thread-draw 700ms ease-out var(--pt-thread-delay,0ms) forwards;}'
    + '#pt-overlay.pt-draw .pt-art #spark{animation:pt-spark-glow 700ms ease-out var(--pt-spark-delay,550ms) forwards;}'
    + '@keyframes pt-door-open{to{transform:scaleX(1);}}'
    + '@keyframes pt-thread-draw{from{stroke-dashoffset:var(--pt-len,220);}to{stroke-dashoffset:0;filter:drop-shadow(0 0 6px rgba(216,170,58,.85));}}'
    + '@keyframes pt-spark-glow{0%{opacity:0;transform:scale(.4);filter:drop-shadow(0 0 0 rgba(216,170,58,0));}'
    + '60%{opacity:1;transform:scale(1.35);filter:drop-shadow(0 0 10px rgba(216,170,58,.95));}'
    + '100%{opacity:1;transform:scale(1);filter:drop-shadow(0 0 5px rgba(216,170,58,.7));}}'
    + '.pt-compress{transform:scale(0.96);transition:transform 100ms ease-out;}'
    + 'html.pt-incoming{background:#050505;}'
    + 'html.pt-incoming body{transform:translateY(100%);}'
    + 'html.pt-incoming.pt-sliding body{transition:transform 700ms ease-out;transform:translateY(0);}'
    + '@media (prefers-reduced-motion: reduce){.pt-art #gold-thread,.pt-art #spark{animation-duration:1ms !important;animation-delay:0ms !important;}html.pt-incoming.pt-sliding body{transition-duration:1ms !important;}}';

  function ensureCss() {
    if (document.getElementById('pt-css')) return;
    var style = document.createElement('style');
    style.id = 'pt-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // Home has a door that swings open (400ms) before the thread draws; the others start at 0.
  var LEAD_IN = { 'about-me': 0, 'case-study': 0, 'home': 400 };

  function primeThread(svgEl, type) {
    var lead = LEAD_IN[type] || 0;
    var thread = svgEl.querySelector('#gold-thread');
    if (thread && typeof thread.getTotalLength === 'function') {
      var len = thread.getTotalLength();
      thread.style.setProperty('--pt-len', len);
      thread.style.strokeDasharray = len;
      thread.style.strokeDashoffset = len;
      thread.style.setProperty('--pt-thread-delay', lead + 'ms');
    }
    var spark = svgEl.querySelector('#spark');
    if (spark) spark.style.setProperty('--pt-spark-delay', (lead + 550) + 'ms');
  }

  function setArt(type, cb) {
    var url = basePath + SVGS[type];
    if (svgCache[url]) {
      artHost.innerHTML = svgCache[url];
      primeThread(artHost.querySelector('svg'), type);
      if (cb) cb();
      return;
    }
    fetch(url)
      .then(function (res) { return res.text(); })
      .then(function (text) {
        svgCache[url] = text;
        artHost.innerHTML = text;
        primeThread(artHost.querySelector('svg'), type);
        if (cb) cb();
      })
      .catch(function () { if (cb) cb(); });
  }

  // Click flow: black screen appears instantly, gold thread draws to the star,
  // then we navigate. The destination page itself slides up from the bottom.
  function playTransition(type, targetUrl) {
    ensureCss();
    if (!overlay) buildOverlay();

    overlay.classList.remove('pt-draw');
    var artReady = false;
    setArt(type, function () { artReady = true; });

    overlay.classList.add('pt-active');
    void overlay.offsetWidth; // force reflow

    var go = function () {
      overlay.classList.add('pt-draw'); // door (home only) -> thread draws -> spark glows
      sessionStorage.setItem(STORAGE_KEY, '1');
      var lead = LEAD_IN[type] || 0;
      var totalHold = lead + 550 + 700 + 1000; // ...+ spark delay + spark duration + 1s hold on star
      setTimeout(function () {
        window.location.href = targetUrl;
      }, totalHold);
    };

    if (artReady) {
      go();
    } else {
      var waited = 0;
      var poll = setInterval(function () {
        waited += 20;
        if (artReady || waited >= 400) {
          clearInterval(poll);
          go();
        }
      }, 20);
    }
  }

  // On arrival: the <head> snippet already hid the page (translateY(100%), black html bg)
  // before first paint. Here we just kick off the slide-up now that CSS/DOM are ready.
  function playIntroIfPending() {
    sessionStorage.removeItem(STORAGE_KEY);
    var root = document.documentElement;
    if (!root.classList.contains('pt-incoming')) return;

    var fallback;
    var cleanup = function () {
      clearTimeout(fallback);
      root.classList.remove('pt-incoming', 'pt-sliding');
      document.body.removeEventListener('transitionend', onEnd);
    };
    var onEnd = function (e) {
      if (e.target === document.body && e.propertyName === 'transform') cleanup();
    };
    document.body.addEventListener('transitionend', onEnd);
    // Fallback in case transitionend doesn't fire (e.g. tab backgrounded mid-animation).
    fallback = setTimeout(cleanup, 900);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.add('pt-sliding');
      });
    });
  }

  function findTransitionLink(el) {
    while (el && el !== document.body) {
      if (el.tagName === 'A' && el.getAttribute('data-transition')) return el;
      el = el.parentElement;
    }
    return null;
  }

  document.addEventListener('click', function (e) {
    var link = findTransitionLink(e.target);
    if (!link) return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    var type = link.getAttribute('data-transition');
    if (!SVGS[type]) return;

    e.preventDefault();
    link.classList.add('pt-compress');
    setTimeout(function () { link.classList.remove('pt-compress'); }, 120);

    playTransition(type, link.href);
  });

  ensureCss();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', playIntroIfPending);
  } else {
    playIntroIfPending();
  }
})();
