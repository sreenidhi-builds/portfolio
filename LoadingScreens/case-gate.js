(function () {
  var STORAGE_KEY = 'cg-unlocked';
  // SHA-256 of the shared case-study passphrase. Not real security (anyone can read this
  // script or brute-force offline) — this only raises the bar above "content visible instantly
  // to any visitor or crawler that reaches the page."
  var PASS_HASH = 'f6de4a0c726e75ccfb53fd1206459a1cfa41a537b8e2dfe9f7130311ccc9387a';

  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') return; // already unlocked this session
  } catch (e) {}

  // Stop the browser from restoring a previous scroll position (e.g. back/forward nav)
  // while the gate is up, and make sure we start pinned to the top underneath it.
  if ('scrollRestoration' in history) {
    try { history.scrollRestoration = 'manual'; } catch (e) {}
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

  var docEl = document.documentElement;
  docEl.classList.add('cg-locked');

  function sha256Hex(text) {
    var enc = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', enc).then(function (buf) {
      var bytes = Array.from(new Uint8Array(buf));
      return bytes.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function buildOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'cg-overlay';
    overlay.innerHTML =
      '<div class="cg-box">' +
        '<p class="cg-label">This case study is password-protected.</p>' +
        '<form id="cg-form" autocomplete="off">' +
          '<input id="cg-input" type="password" placeholder="Enter password" autocomplete="off" />' +
          '<button type="submit">Unlock</button>' +
        '</form>' +
        '<p class="cg-error" id="cg-error" hidden>Incorrect password.</p>' +
      '</div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  function unlock() {
    try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
    docEl.classList.remove('cg-locked');
    var overlay = document.getElementById('cg-overlay');
    if (overlay) overlay.remove();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  function init() {
    var overlay = buildOverlay();
    var form = overlay.querySelector('#cg-form');
    var input = overlay.querySelector('#cg-input');
    var error = overlay.querySelector('#cg-error');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      sha256Hex(input.value).then(function (hex) {
        if (hex === PASS_HASH) {
          unlock();
        } else {
          error.hidden = false;
          input.value = '';
          input.focus();
        }
      });
    });

    setTimeout(function () { input.focus(); }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
