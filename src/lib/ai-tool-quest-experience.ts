/**
 * Unexpected "Study Portal" experience for AI tool WebView output —
 * holographic quest nodes, orbit rail, aurora field, interactive unlocks.
 */

import { AI_TOOL_SELECTION_GUARD_JS } from './ai-tool-selection-guard';

export const AI_TOOL_QUEST_STYLES = `
@keyframes quest-aurora{
  0%{transform:translate3d(-6%,-4%,0) scale(1);opacity:.55}
  50%{transform:translate3d(8%,6%,0) scale(1.18);opacity:.85}
  100%{transform:translate3d(-6%,-4%,0) scale(1);opacity:.55}
}
@keyframes quest-shimmer{
  0%{background-position:0% 50%}
  100%{background-position:200% 50%}
}
@keyframes quest-pulse{
  0%,100%{transform:scale(1)}
  50%{transform:scale(1.04)}
}
@keyframes quest-float{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-4px)}
}
@keyframes quest-stamp{
  0%{transform:scale(1.4) rotate(-12deg);opacity:0}
  60%{transform:scale(.92) rotate(-8deg);opacity:1}
  100%{transform:scale(1) rotate(-8deg);opacity:1}
}
.quest-field{position:relative;isolation:isolate;padding:0;margin:0}
.quest-field::before,.quest-field::after{display:none}
/* Orbit tabs render natively in RN for smooth horizontal scroll — hide any leftover DOM rail. */
.quest-orbit{display:none!important}
.quest-orbit-btn{display:none!important}
.quest-stamp{display:none!important}
.quest-node{
  --quest:#0ea5e9;--quest-deep:#0f766e;--quest-pastel:#f8fafc;--quest-pastel-border:#e2e8f0;
  position:relative;z-index:1;margin:0 0 10px;border-radius:16px;overflow:hidden;
  border:1.5px solid var(--quest-pastel-border);
  background:var(--quest-pastel);
  box-shadow:0 4px 14px rgba(15,23,42,.05);
  transition:none
}
.quest-node:last-child{margin-bottom:0}
.quest-node[open]{transform:none;box-shadow:0 6px 18px rgba(15,23,42,.06)}
.quest-node::before{
  content:"";position:absolute;inset:0 auto 0 0;width:4px;
  background:linear-gradient(180deg,var(--quest),var(--quest-deep));
}
.quest-node::after{display:none}
.quest-summary{
  list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;
  padding:10px 12px 10px 14px;user-select:none;-webkit-user-select:none;
  -webkit-tap-highlight-color:rgba(14,165,233,.12);
  touch-action:manipulation;background:#ffffff
}
.quest-summary::-webkit-details-marker{display:none}
.quest-orb{
  width:36px;height:36px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  color:#fff;font-weight:800;font-size:13px;letter-spacing:-.02em;
  background:linear-gradient(145deg,var(--quest),var(--quest-deep));
  box-shadow:0 4px 10px rgba(15,23,42,.12);animation:none
}
.quest-orb svg{width:19px;height:19px;stroke:#fff;flex-shrink:0}
.quest-orb span{font-size:18px;line-height:1}
.quest-copy{min-width:0;flex:1}
.quest-kicker{
  display:flex;align-items:center;gap:6px;font-size:10px;font-weight:800;letter-spacing:.09em;
  text-transform:uppercase;color:var(--quest-deep)
}
.quest-kicker span.dot{width:5px;height:5px;border-radius:99px;background:var(--quest);animation:none}
.quest-title{margin-top:2px;font-size:15.5px;line-height:1.3;font-weight:800;letter-spacing:-.01em;color:#0f172a}
.quest-hint{font-size:11px;font-weight:700;color:var(--quest-deep);white-space:nowrap}
.quest-node[open] .quest-hint{color:var(--quest-deep)}
.quest-body{
  padding:2px 14px 12px 16px;color:#334155;position:relative;z-index:1;
  border-top:1px solid var(--quest-pastel-border);
  background:#ffffff
}
.quest-body>*:first-child{margin-top:8px}
.ai-tool-q-card{
  position:relative;overflow:hidden;border-radius:18px!important;
  background:
    radial-gradient(120px 80px at 0% 0%,rgba(14,165,233,.18),transparent 70%),
    linear-gradient(160deg,rgba(255,255,255,.82),rgba(255,255,255,.42))!important;
  box-shadow:0 12px 28px rgba(15,23,42,.08)!important
}
.ai-tool-q-card::before{
  content:"";position:absolute;right:-18px;top:-18px;width:70px;height:70px;border-radius:24px;transform:rotate(18deg);
  background:linear-gradient(135deg,rgba(255,255,255,.7),transparent);opacity:.8
}
.ai-tool-hero-card{
  border-radius:26px!important;overflow:hidden!important;
  border:1px solid rgba(255,255,255,.7)!important;
  background:
    radial-gradient(circle at 12% 18%,rgba(14,165,233,.22),transparent 42%),
    radial-gradient(circle at 88% 0%,rgba(14,165,233,.18),transparent 40%),
    linear-gradient(145deg,rgba(255,255,255,.86),rgba(255,255,255,.42))!important;
  box-shadow:0 24px 50px rgba(15,23,42,.12)!important
}

/* —— Inner quest content (opened bodies) —— */
.quest-body{font-size:15px;line-height:1.55}
.quest-body p{margin:.45rem 0;color:#334155}
.quest-body .prose p{margin:.5rem 0}
.quest-bullets,.quest-checks,.quest-steps,.quest-materials{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.quest-bullet{
  display:flex;gap:10px;align-items:flex-start;
  padding:10px 12px;border-radius:14px;
  background:linear-gradient(135deg,rgba(255,255,255,.78),rgba(255,255,255,.42));
  border:1px solid rgba(255,255,255,.75);box-shadow:0 6px 16px rgba(15,23,42,.04)
}
.quest-bullet-orb{
  width:10px;height:10px;margin-top:6px;border-radius:99px;flex-shrink:0;
  background:var(--quest,#0ea5e9);box-shadow:0 0 0 4px rgba(14,165,233,.12)
}
.quest-bullet-text{flex:1;min-width:0;color:#1e293b;font-weight:500;white-space:pre-wrap}
.quest-check{
  display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border-radius:14px;
  background:linear-gradient(135deg,rgba(255,255,255,.82),rgba(255,255,255,.45));
  border:1px solid rgba(255,255,255,.8);border-left:4px solid var(--quest,#0ea5e9)
}
.quest-check-mark{
  width:22px;height:22px;border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,var(--quest,#0ea5e9),var(--quest-deep,#0f766e));color:#fff;font-size:12px;font-weight:900
}
.quest-step{display:flex;gap:12px;align-items:flex-start;position:relative;padding:4px 0 10px 2px}
.quest-step:not(:last-child)::before{
  content:"";position:absolute;left:15px;top:34px;bottom:0;width:2px;
  background:linear-gradient(180deg,var(--quest,#0ea5e9),rgba(148,163,184,.25))
}
.quest-step-num{
  width:30px;height:30px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,var(--quest,#0ea5e9),var(--quest-deep,#0f766e));
  color:#fff;font-size:12px;font-weight:900;z-index:1;box-shadow:0 8px 16px rgba(15,23,42,.12)
}
.quest-step-text{flex:1;padding-top:5px;color:#334155;font-weight:500}
.quest-material{
  display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;
  background:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.8);border-left:4px solid var(--quest,#f59e0b)
}
.quest-material-num{
  width:26px;height:26px;border-radius:9px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,var(--quest,#f59e0b),var(--quest-deep,#b45309));color:#fff;font-size:11px;font-weight:900
}
.quest-term-grid{display:grid;gap:10px}
.quest-term{
  border-radius:16px;padding:12px 14px;position:relative;overflow:hidden;
  background:linear-gradient(160deg,rgba(255,255,255,.88),rgba(255,255,255,.48));
  border:1px solid rgba(255,255,255,.8);box-shadow:0 10px 22px rgba(15,23,42,.06)
}
.quest-term::before{
  content:"";position:absolute;left:0;top:0;bottom:0;width:5px;
  background:linear-gradient(180deg,var(--quest,#0ea5e9),var(--quest-deep,#0f766e))
}
.quest-term-title{margin:0;padding-left:8px;font-size:14px;font-weight:800;color:#0f172a}
.quest-term-body{margin:6px 0 0;padding-left:8px;font-size:13px;line-height:1.5;color:#475569}
.quest-q{
  --quest:#0ea5e9;--quest-deep:#0f766e;
  position:relative;overflow:hidden;border-radius:18px;margin:0 0 12px;padding:14px;
  background:
    radial-gradient(120px 70px at 0% 0%,rgba(14,165,233,.16),transparent 70%),
    linear-gradient(160deg,rgba(255,255,255,.9),rgba(255,255,255,.5));
  border:1px solid rgba(255,255,255,.85);border-left:5px solid var(--quest);
  box-shadow:0 12px 28px rgba(15,23,42,.07)
}
.quest-q-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:8px}
.quest-q-badge{
  display:inline-flex;align-items:center;justify-content:center;min-width:2rem;height:26px;padding:0 10px;
  border-radius:999px;background:linear-gradient(135deg,var(--quest),var(--quest-deep));
  color:#fff;font-size:11px;font-weight:900;letter-spacing:.02em
}
.quest-q-meta{display:flex;flex-wrap:wrap;gap:6px}
.quest-pill{
  display:inline-flex;align-items:center;border-radius:999px;padding:4px 9px;
  font-size:10px;font-weight:800;background:rgba(241,245,249,.95);color:#475569;border:1px solid rgba(226,232,240,.9)
}
.quest-pill-amber{background:#fffbeb;color:#92400e;border-color:#fde68a}
.quest-pill-violet{background:#f0f9ff;color:#0369a1;border-color:#bae6fd}
.quest-q-prompt,.quest-q-text{margin:0;font-size:15px;line-height:1.45;font-weight:700;color:#0f172a}
.quest-options{display:grid;gap:8px;margin-top:12px}
@media (min-width:640px){.quest-options{grid-template-columns:1fr 1fr}}
.quest-option{
  display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:14px;
  background:rgba(255,255,255,.82);border:1px solid rgba(226,232,240,.95);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.9)
}
.quest-option-letter{
  width:26px;height:26px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,var(--quest,#0ea5e9),var(--quest-deep,#0f766e));
  color:#fff;font-size:11px;font-weight:900
}
.quest-option-text{flex:1;min-width:0;padding-top:3px;font-size:13px;line-height:1.4;color:#334155;font-weight:500}
.quest-answer{
  margin-top:12px;padding:10px 12px;border-radius:14px;
  background:linear-gradient(135deg,rgba(255,255,255,.55),rgba(255,255,255,.85));
  border:1px solid rgba(255,255,255,.9);border-left:4px solid var(--quest)
}
.quest-answer-label,.quest-explain-label{
  display:inline-block;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;
  color:var(--quest-deep,#0f766e);margin-bottom:4px
}
.quest-answer p,.quest-explain p{margin:0;font-size:13px;line-height:1.45;color:#1e293b;font-weight:600}
.quest-explain{
  margin-top:8px;padding:10px 12px;border-radius:14px;
  background:rgba(248,250,252,.9);border:1px dashed rgba(148,163,184,.45)
}
.quest-explain-label{color:#64748b}
.quest-story-q{
  display:flex;gap:12px;align-items:flex-start;margin:0 0 10px;padding:12px;
  border-radius:16px;background:rgba(255,255,255,.78);border:1px solid rgba(255,255,255,.85);
  border-left:4px solid var(--quest)
}
.quest-story-num{
  width:28px;height:28px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(145deg,var(--quest),var(--quest-deep));color:#fff;font-size:12px;font-weight:900
}
.quest-story-q p{margin:0;padding-top:3px;font-size:14px;line-height:1.45;color:#1e293b;font-weight:500}

/* —— Tap-to-reveal (answers/solutions) and tap-to-check (checklists/materials) —— */
.quest-reveal-btn{
  display:inline-flex;align-items:center;gap:6px;margin:6px 0 2px;
  padding:9px 16px;border-radius:999px;border:1.5px solid var(--quest,#0ea5e9);
  background:#fff;color:var(--quest-deep,#0f766e);font-size:12px;font-weight:800;
  cursor:pointer;-webkit-tap-highlight-color:transparent
}
.quest-reveal-hidden{display:none!important}
.quest-reveal-btn:active{transform:scale(.96)}
@keyframes quest-reveal-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.quest-revealed-anim{animation:quest-reveal-in .32s cubic-bezier(.16,1,.3,1) both}
.quest-check{cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;transition:border-color .15s,transform .1s}
.quest-check:active{transform:scale(.98)}
.quest-check-mark{transition:background .15s,color .15s}
.quest-check:not(.quest-checked) .quest-check-mark{background:#e2e8f0!important;color:transparent!important}
.quest-check.quest-checked{border-left-color:#16a34a!important}
.quest-check.quest-checked .quest-check-mark{background:linear-gradient(145deg,#16a34a,#15803d)!important;color:#fff!important;animation:quest-pop .3s ease}
.quest-material{cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;transition:opacity .15s,transform .1s}
.quest-material:active{transform:scale(.98)}
.quest-material.quest-checked{opacity:.55}
.quest-material.quest-checked>span:last-child{text-decoration:line-through}
@keyframes quest-pop{0%{transform:scale(.55)}60%{transform:scale(1.2)}100%{transform:scale(1)}}
@keyframes quest-node-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.quest-entrance{animation:quest-node-in .38s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i,0) * 55ms)}
`;

export const AI_TOOL_QUEST_BOOTSTRAP = `
${AI_TOOL_SELECTION_GUARD_JS}
(function(){
  try{
    var palette = ['#0ea5e9','#14b8a6','#f59e0b','#f43f5e','#0284c7','#06b6d4','#f97316','#0891b2','#3b82f6','#0d9488'];
    var deep = ['#0369a1','#0f766e','#b45309','#be123c','#075985','#0e7490','#c2410c','#155e75','#1d4ed8','#115e59'];
    var pastel = ['#f0f9ff','#f0fdfa','#fffbeb','#fff1f2','#eef2ff','#ecfeff','#fff7ed','#fdf4ff','#eff6ff','#f0fdfa'];
    var pastelBorder = ['#bae6fd','#99f6e4','#fde68a','#fecdd3','#c7d2fe','#a5f3fc','#fed7aa','#f5d0fe','#bfdbfe','#99f6e4'];

    function syncHint(n){
      var h = n.querySelector('.quest-hint');
      if (h) h.textContent = n.open ? 'Close' : 'Open';
    }

    function wireQuestNode(n, i){
      n.setAttribute('data-quest-idx', String(i));
      n.open = true;
      syncHint(n);
      if (n.getAttribute('data-quest-wired') === '1') return;
      n.setAttribute('data-quest-wired', '1');
      var summary = n.querySelector('.quest-summary');
      if (!summary) return;
      // Android WebView often ignores native <details> toggles — drive open state ourselves.
      summary.addEventListener('click', function(e){
        try { e.preventDefault(); } catch (err) {}
        try { e.stopPropagation(); } catch (err2) {}
        n.open = !n.open;
        syncHint(n);
        if (window.__aiToolSendHeight) setTimeout(window.__aiToolSendHeight, 40);
        if (window.__aiToolUnlockScroll) setTimeout(window.__aiToolUnlockScroll, 40);
        if (n.open && window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'orbit-active', index: i }));
        }
      }, true);
    }

    var nodes = Array.prototype.slice.call(document.querySelectorAll('.quest-node'));
    if(!nodes.length){
      var legacy = Array.prototype.slice.call(document.querySelectorAll('section.ai-tool-section-card'));
      legacy.forEach(function(sec, i){
        var header = sec.querySelector('header');
        if(!header) return;
        var titleEl = header.querySelector('h4,h3');
        var labelEl = header.querySelector('p');
        var details = document.createElement('details');
        details.className = 'quest-node';
        details.style.setProperty('--quest', palette[i%10]);
        details.style.setProperty('--quest-deep', deep[i%10]);
        details.style.setProperty('--quest-pastel', pastel[i%10]);
        details.style.setProperty('--quest-pastel-border', pastelBorder[i%10]);
        details.open = true;
        var summary = document.createElement('summary');
        summary.className = 'quest-summary';
        summary.innerHTML = '<div class="quest-orb">'+(i+1)+'</div><div class="quest-copy"><div class="quest-kicker"><span class="dot"></span>'+(labelEl?labelEl.textContent:'Quest')+'</div><div class="quest-title">'+(titleEl?titleEl.textContent:'Section')+'</div></div><div class="quest-hint">Close</div>';
        var bodyWrap = document.createElement('div');
        bodyWrap.className = 'quest-body';
        var kids = sec.children;
        for (var k = 0; k < kids.length; k++) {
          if (kids[k] !== header) bodyWrap.appendChild(kids[k].cloneNode(true));
        }
        details.appendChild(summary);
        details.appendChild(bodyWrap);
        sec.parentNode.insertBefore(details, sec);
        sec.remove();
      });
      nodes = Array.prototype.slice.call(document.querySelectorAll('.quest-node'));
    }
    if(!nodes.length) return;

    var field = document.createElement('div');
    field.className = 'quest-field';
    var first = nodes[0];
    var parent = first.parentNode;
    // Pull hero / shell headers that sit above the first section into the same
    // measured box — exam papers & mock tests always have a title card above.
    var prelude = [];
    var cursor = parent.firstChild;
    while (cursor && cursor !== first) {
      var next = cursor.nextSibling;
      if (cursor.nodeType === 1 && !cursor.classList.contains('quest-node')) {
        prelude.push(cursor);
      }
      cursor = next;
    }
    parent.insertBefore(field, first);
    prelude.forEach(function(el){ field.appendChild(el); });
    nodes.forEach(function(n){ field.appendChild(n); });

    nodes.forEach(function(n, i){ wireQuestNode(n, i); });

    // Hand orbit tabs to React Native for a native horizontal ScrollView (no WebView lag/clip).
    var tabs = nodes.map(function(n, i){
      var title = (n.querySelector('.quest-title') || {}).textContent || ('Section '+(i+1));
      return String(title).trim().slice(0, 28);
    });
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'orbit', tabs: tabs }));
    }
    applyQuestRevealGates();
  }catch(e){}
})();

/**
 * Tap-to-reveal for answers/solutions, tap-to-check for checklists/materials.
 * Gates only the INNER content of a section (never the <details> element itself —
 * that must stay force-open, see the comment above about WebView height sizing).
 */
function applyQuestRevealGates(){
  try {
    // Per-question answer + explanation (Practice Q&A inline cards).
    var answers = document.querySelectorAll('.quest-answer:not([data-quest-gated])');
    for (var i = 0; i < answers.length; i++) {
      (function(ansEl){
        ansEl.setAttribute('data-quest-gated', '1');
        var explainEl = ansEl.nextElementSibling;
        if (!explainEl || !explainEl.classList || !explainEl.classList.contains('quest-explain')) explainEl = null;
        ansEl.classList.add('quest-reveal-hidden');
        if (explainEl) explainEl.classList.add('quest-reveal-hidden');
        var accent = ansEl.style.getPropertyValue('--quest') || '#0ea5e9';
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quest-reveal-btn';
        btn.textContent = 'Reveal answer';
        btn.style.setProperty('--quest', accent);
        ansEl.parentNode.insertBefore(btn, ansEl);
        btn.addEventListener('click', function(){
          ansEl.classList.remove('quest-reveal-hidden');
          ansEl.classList.add('quest-revealed-anim');
          if (explainEl) {
            explainEl.classList.remove('quest-reveal-hidden');
            explainEl.classList.add('quest-revealed-anim');
          }
          btn.remove();
          if (window.__aiToolSendHeight) setTimeout(window.__aiToolSendHeight, 30);
        });
      })(answers[i]);
    }

    // Whole-section answer key / solutions bodies — gate the inner payload only,
    // the <details> stays open so the height-measurement pass is unaffected.
    var spoilerTitleRe = /(answer\s*key|answer\s*hints|step-by-step\s*solutions)/i;
    var sectionNodes = document.querySelectorAll('.quest-node:not([data-quest-section-gated])');
    for (var s = 0; s < sectionNodes.length; s++) {
      (function(node){
        node.setAttribute('data-quest-section-gated', '1');
        var titleEl = node.querySelector('.quest-title');
        var title = titleEl ? (titleEl.textContent || '') : '';
        if (!spoilerTitleRe.test(title)) return;
        var bodyEl = node.querySelector('.quest-body');
        if (!bodyEl || !bodyEl.children.length) return;
        // Already handled per-item above — don't double-gate.
        if (bodyEl.querySelector('.quest-answer')) return;
        var accent = node.style.getPropertyValue('--quest') || '#0ea5e9';
        var inner = document.createElement('div');
        inner.className = 'quest-reveal-hidden';
        while (bodyEl.firstChild) inner.appendChild(bodyEl.firstChild);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quest-reveal-btn';
        btn.textContent = 'Reveal answers';
        btn.style.setProperty('--quest', accent);
        bodyEl.appendChild(btn);
        bodyEl.appendChild(inner);
        btn.addEventListener('click', function(){
          inner.classList.remove('quest-reveal-hidden');
          inner.classList.add('quest-revealed-anim');
          btn.remove();
          if (window.__aiToolSendHeight) setTimeout(window.__aiToolSendHeight, 30);
        });
      })(sectionNodes[s]);
    }
  } catch (e) {}
}

if (!document.__questTapBound) {
  document.__questTapBound = true;
  document.addEventListener('click', function(e){
    var t = e.target;
    var check = t && t.closest ? t.closest('.quest-check') : null;
    if (check) { check.classList.toggle('quest-checked'); return; }
    var mat = t && t.closest ? t.closest('.quest-material') : null;
    if (mat) { mat.classList.toggle('quest-checked'); return; }
  }, true);
}
`;

export function wrapQuestExperience(bodyHtml: string): string {
  return `${bodyHtml}
<script>${AI_TOOL_QUEST_BOOTSTRAP}</script>`;
}
