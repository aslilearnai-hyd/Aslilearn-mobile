/**
 * AI tool WebView text selection:
 * - Block selection on normal taps (Android often starts it too easily).
 * - Arm selection only after a ~3s stationary long-press, then select the word under the finger.
 */

export const AI_TOOL_SELECTION_GUARD_CSS = `
html,body,body *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
html.ai-select-on,html.ai-select-on body,html.ai-select-on body *{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}
html.ai-select-on .quest-summary,html.ai-select-on .quest-summary *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
`;

/** Injected / inline JS — keep ES5-friendly for Android WebView. */
export const AI_TOOL_SELECTION_GUARD_JS = `
(function(){
  if (window.__aiToolSelectGuard) return;
  window.__aiToolSelectGuard = true;
  var LONG_MS = 3000;
  var MOVE_PX = 12;
  var timer = null;
  var startX = 0;
  var startY = 0;
  var armed = false;
  var longFired = false;

  function clearSel(){
    try {
      var s = window.getSelection && window.getSelection();
      if (s) s.removeAllRanges();
    } catch (e) {}
  }

  function disarm(){
    armed = false;
    longFired = false;
    try { document.documentElement.classList.remove('ai-select-on'); } catch (e) {}
    clearSel();
  }

  function arm(){
    armed = true;
    try { document.documentElement.classList.add('ai-select-on'); } catch (e) {}
  }

  function selectWordAt(x, y){
    try {
      var range = null;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
      } else if (document.caretPositionFromPoint) {
        var pos = document.caretPositionFromPoint(x, y);
        if (pos && pos.offsetNode) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }
      if (!range) return;
      var sel = window.getSelection();
      if (!sel) return;
      sel.removeAllRanges();
      sel.addRange(range);
      try {
        sel.modify('move', 'backward', 'word');
        sel.modify('extend', 'forward', 'word');
      } catch (e2) {}
    } catch (e) {}
  }

  function isInteractive(el){
    while (el && el !== document.body) {
      if (!el.tagName) { el = el.parentNode; continue; }
      var tag = String(el.tagName).toLowerCase();
      if (tag === 'summary' || tag === 'button' || tag === 'a' || tag === 'input' || tag === 'textarea') return true;
      if (el.classList && (el.classList.contains('quest-summary') || el.classList.contains('quest-orbit-btn'))) return true;
      el = el.parentNode;
    }
    return false;
  }

  document.addEventListener('selectstart', function(e){
    if (!armed) {
      e.preventDefault();
      return false;
    }
  }, true);

  document.addEventListener('touchstart', function(e){
    if (!e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    var target = e.target;
    longFired = false;
    if (timer) { clearTimeout(timer); timer = null; }
    if (isInteractive(target)) {
      if (!armed) clearSel();
      return;
    }
    startX = t.clientX;
    startY = t.clientY;
    timer = setTimeout(function(){
      timer = null;
      longFired = true;
      arm();
      selectWordAt(startX, startY);
    }, LONG_MS);
  }, { passive: true, capture: true });

  document.addEventListener('touchmove', function(e){
    if (!timer || !e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    if (Math.abs(t.clientX - startX) > MOVE_PX || Math.abs(t.clientY - startY) > MOVE_PX) {
      clearTimeout(timer);
      timer = null;
    }
  }, { passive: true, capture: true });

  document.addEventListener('touchend', function(){
    if (timer) {
      clearTimeout(timer);
      timer = null;
      // Short tap — never leave a selection behind.
      if (!longFired) {
        if (!armed) clearSel();
        else {
          // Armed from a previous long-press: a short tap dismisses selection mode.
          disarm();
        }
      }
    }
  }, { passive: true, capture: true });

  document.addEventListener('touchcancel', function(){
    if (timer) { clearTimeout(timer); timer = null; }
    if (!longFired && !armed) clearSel();
  }, { passive: true, capture: true });

  // Belt-and-suspenders: clear ghost selection after a quick click.
  document.addEventListener('click', function(){
    if (!armed) clearSel();
  }, true);
})();
true;
`;
