(function () {
  var STORAGE_KEY = 'pt-pending';

  // Inline copies of LoadingScreens/*-transition-black.svg. Embedded directly (rather than
  // fetched) so the transition still works when the site is opened via file:// — fetch() for
  // local files is blocked by the browser's CORS policy and would otherwise fail silently,
  // leaving just the black overlay with no artwork.
  var SVG_MARKUP = {
    'home': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-hidden="true">'
      + '<rect width="1600" height="900" fill="#050505"/>'
      + '<g id="message" fill="#F4F1E8" text-anchor="middle" font-family="\'Courier New\', monospace" letter-spacing="6">'
      + '<text x="800" y="340" font-size="20">BACK TO THE BEGINNING.</text>'
      + '<text x="800" y="560" font-size="15" letter-spacing="5">RETURNING HOME...</text>'
      + '</g>'
      + '<g id="illustration" fill="none" stroke="#F4F1E8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<g id="doorway">'
      + '<path d="M752 505V380H824V505M752 380H824"/>'
      + '<g id="door-leaf" style="transform-box:fill-box;transform-origin:0% 50%;">'
      + '<path d="M824 380L846 392V493L824 505V380Z"/>'
      + '<circle cx="838" cy="445" r="2.5" fill="#F4F1E8" stroke="none"/>'
      + '</g>'
      + '<path d="M728 505H870" opacity=".55"/>'
      + '</g>'
      + '<path id="gold-thread" d="M734 445C758 437 765 468 797 466C826 464 840 439 868 437" stroke="#D8AA3A" stroke-width="2.25"/>'
      + '<g id="spark" transform="translate(879 433)" fill="#D8AA3A" stroke="none">'
      + '<path d="M0-12C2-4 4-2 12 0C4 2 2 4 0 12C-2 4-4 2-12 0C-4-2-2-4 0-12Z"/>'
      + '</g>'
      + '</g>'
      + '</svg>',
    'case-study': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-hidden="true">'
      + '<rect width="1600" height="900" fill="#050505"/>'
      + '<g id="message" fill="#F4F1E8" text-anchor="middle" font-family="\'Courier New\', monospace" letter-spacing="6">'
      + '<text x="800" y="365" font-size="20">LET’S LOOK CLOSER.</text>'
      + '<text x="800" y="535" font-size="15" letter-spacing="5">OPENING THE CASE STUDY...</text>'
      + '</g>'
      + '<g id="illustration" fill="none" stroke="#F4F1E8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<g id="magnifier" style="transform-box:fill-box;transform-origin:center;">'
      + '<g transform="rotate(-43 714 444)">'
      + '<circle cx="714" cy="426" r="17"/>'
      + '<circle cx="714" cy="426" r="12" opacity=".55"/>'
      + '<path d="M714 443v30"/>'
      + '</g>'
      + '</g>'
      + '<path id="gold-thread" d="M742 449C781 429 815 437 838 454C854 466 850 480 838 480C823 480 823 461 842 453C866 443 886 442 908 423" stroke="#D8AA3A" stroke-width="2.25"/>'
      + '<g id="spark" transform="translate(920 414)" fill="#D8AA3A" stroke="none">'
      + '<path d="M0-12C2-4 4-2 12 0C4 2 2 4 0 12C-2 4-4 2-12 0C-4-2-2-4 0-12Z"/>'
      + '</g>'
      + '</g>'
      + '</svg>',
    'about-me': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-hidden="true">'
      + '<rect width="1600" height="900" fill="#050505"/>'
      + '<g id="message" fill="#F4F1E8" text-anchor="middle" font-family="\'Courier New\', monospace" letter-spacing="6">'
      + '<text x="800" y="365" font-size="20">LET’S FOLLOW THE THREAD.</text>'
      + '<text x="800" y="535" font-size="15" letter-spacing="5">CONNECTING THE STORY...</text>'
      + '</g>'
      + '<g id="illustration" transform="translate(0 2)" fill="none" stroke="#F4F1E8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<g id="spool" style="transform-box:fill-box;transform-origin:center;">'
      + '<ellipse cx="722" cy="410" rx="22" ry="6"/>'
      + '<ellipse cx="722" cy="468" rx="22" ry="6"/>'
      + '<path d="M704 413v52M740 413v52M708 419h28M707 426h30M707 433h30M707 440h30M707 447h30M707 454h30M708 461h28"/>'
      + '<path d="M700 410h44M700 468h44" opacity=".55"/>'
      + '</g>'
      + '<path id="gold-thread" d="M740 430C780 426 796 468 842 463C874 460 891 438 913 436" stroke="#D8AA3A" stroke-width="2.25"/>'
      + '<g id="spark" transform="translate(923 435)" fill="#D8AA3A" stroke="none">'
      + '<path d="M0-12C2-4 4-2 12 0C4 2 2 4 0 12C-2 4-4 2-12 0C-4-2-2-4 0-12Z"/>'
      + '</g>'
      + '</g>'
      + '</svg>'
  };

  // Path from the current page down to /LoadingScreens/, based on this script's own src.
  var scriptEl = document.currentScript;
  var basePath = scriptEl ? scriptEl.src.replace(/transition\.js.*$/, '') : 'LoadingScreens/';

  var overlay, artHost;

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'pt-overlay';
    overlay.innerHTML = '<div class="pt-art"></div>';
    document.body.appendChild(overlay);
    artHost = overlay.querySelector('.pt-art');
  }

  function ensureCss() {
    if (document.getElementById('pt-css')) return;
    var link = document.createElement('link');
    link.id = 'pt-css';
    link.rel = 'stylesheet';
    link.href = basePath + 'transition.css';
    document.head.appendChild(link);
  }

  // Each type has its own icon animation (door opens / magnifier twists / spool rotates)
  // that plays first, then the thread draws toward the spark. All share the same 250ms lead-in.
  // Tuned so the whole outgoing+incoming sequence lands around 2s total.
  var LEAD_IN = { 'about-me': 250, 'case-study': 250, 'home': 250 };
  var SPARK_OFFSET = 300; // spark starts this long after the icon animation ends
  var SPARK_DURATION = 450;
  var HOLD_AFTER_SPARK = 300;

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
    if (spark) spark.style.setProperty('--pt-spark-delay', (lead + SPARK_OFFSET) + 'ms');
  }

  function setArt(type) {
    artHost.innerHTML = SVG_MARKUP[type] || '';
    primeThread(artHost.querySelector('svg'), type);
  }

  // Click flow: black screen appears instantly, gold thread draws to the star,
  // then we navigate. The destination page itself slides up from the bottom.
  function playTransition(type, targetUrl) {
    ensureCss();
    if (!overlay) buildOverlay();

    overlay.classList.remove('pt-draw');
    setArt(type);

    overlay.classList.add('pt-active');
    void overlay.offsetWidth; // force reflow

    overlay.classList.add('pt-draw'); // door/magnifier/spool -> thread draws -> spark glows
    sessionStorage.setItem(STORAGE_KEY, '1');
    var lead = LEAD_IN[type] || 0;
    // icon animation -> thread draws (overlapping) -> spark glows -> brief hold -> navigate.
    // Plus the ~500ms incoming slide-up on the destination page, the whole thing is ~2s.
    var totalHold = lead + SPARK_OFFSET + SPARK_DURATION + HOLD_AFTER_SPARK;
    setTimeout(function () {
      window.location.href = targetUrl;
    }, totalHold);
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
    if (!SVG_MARKUP[type]) return;

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
