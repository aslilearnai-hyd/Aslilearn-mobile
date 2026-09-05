import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { renderAiToolOutputHtml } from '../../lib/render-ai-tool-output-html';
import { resolveRichDisplayContent, coalesceAiToolRawContent } from '../../lib/ai-tool-display-content';
import { AI_TOOL_OUTPUT_STYLES } from '../../lib/ai-tool-output-styles';
import { AI_TOOL_QUEST_STYLES, wrapQuestExperience } from '../../lib/ai-tool-quest-experience';
import { renderMarkdown } from '../../lib/render-teacher-markdown';
import { simpleContentFingerprint } from '../../lib/ai-tool-rotation-label';
import { AI_TOOL_SELECTION_GUARD_JS } from '../../lib/ai-tool-selection-guard';

type Props = {
  toolType: string;
  content: string;
  rawContent?: unknown;
  variant?: 'student' | 'teacher';
  /**
   * When true, WebView fills its parent and scrolls itself.
   * Use this on phone tool pages so nested parent ScrollView cannot trap gestures.
   */
  fill?: boolean;
};

const MIN_HEIGHT = 80;
const INITIAL_HEIGHT = 160;
const MAX_HEIGHT = 20000;
/** Tiny breath after the last section — nothing more. */
const BOTTOM_PAD = 8;

/**
 * Measure ONLY real content bottom (last quest node / last child).
 * Never use documentElement.scrollHeight — that mirrors the WebView viewport
 * and creates the huge empty region after the last section.
 * Used when WebView is auto-sized inside a parent ScrollView (scrollEnabled=false).
 */
function buildHeightScript(): string {
  return `
${AI_TOOL_SELECTION_GUARD_JS}
(function() {
  function syncHint(n){
    var h = n.querySelector && n.querySelector('.quest-hint');
    if (h) h.textContent = n.open ? 'Close' : 'Open';
  }
  function expandAllSections() {
    var nodes = document.querySelectorAll('.quest-node, details');
    for (var i = 0; i < nodes.length; i++) {
      try { nodes[i].open = true; } catch (e) {}
      syncHint(nodes[i]);
    }
  }
  function measure(forceExpand) {
    var html = document.documentElement;
    var body = document.body;
    html.style.height = 'auto';
    html.style.minHeight = '0';
    html.style.overflow = 'hidden';
    body.style.minHeight = '0';
    body.style.overflow = 'hidden';
    body.style.margin = '0';
    // First paint only — forcing open on every remasure fights user toggles.
    if (forceExpand) expandAllSections();

    var bodyTop = body.getBoundingClientRect().top;
    var bottom = bodyTop;
    var nodes = document.querySelectorAll('.quest-node');
    if (nodes.length) {
      for (var n = 0; n < nodes.length; n++) {
        bottom = Math.max(bottom, nodes[n].getBoundingClientRect().bottom);
      }
    } else {
      var root = document.querySelector('.quest-field') || document.querySelector('.ai-tool-root') || body;
      var kids = root.children;
      for (var i = 0; i < kids.length; i++) {
        bottom = Math.max(bottom, kids[i].getBoundingClientRect().bottom);
      }
    }

    var bodyPad = 0;
    try {
      bodyPad = parseFloat(getComputedStyle(body).paddingBottom) || 0;
    } catch (e) {}

    var h = Math.ceil(bottom - bodyTop + bodyPad);
    if (h < 40) {
      body.style.height = '1px';
      h = Math.ceil(body.scrollHeight || 0);
      body.style.height = 'auto';
    } else {
      body.style.height = 'auto';
    }
    return h;
  }
  function sendHeight(forceExpand) {
    var h = measure(forceExpand === true);
    if (window.ReactNativeWebView && h > 0) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', h: h }));
    }
  }
  window.__aiToolSendHeight = function() { sendHeight(false); };
  // Initial expand + measure so every generator section is visible.
  sendHeight(true);
  // A few settles only — continuous remasure while the parent scrolls causes shake.
  [120, 400, 1200].forEach(function(ms) { setTimeout(function(){ sendHeight(false); }, ms); });
  if (!window.__aiToolHeightBound) {
    window.__aiToolHeightBound = true;
    var roTimer = null;
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function() {
        if (roTimer) clearTimeout(roTimer);
        roTimer = setTimeout(function(){ sendHeight(false); }, 160);
      });
      ro.observe(document.body);
      var field = document.querySelector('.quest-field');
      if (field) ro.observe(field);
    }
    document.addEventListener('toggle', function() { setTimeout(function(){ sendHeight(false); }, 40); }, true);
  }
})();
true;
`;
}

/**
 * Fill mode: WebView owns scrolling. Must NOT lock overflow:hidden (that is for
 * auto-height mode). Open all sections and let the native WebView scroll.
 */
function buildFillScrollScript(): string {
  return `
${AI_TOOL_SELECTION_GUARD_JS}
(function() {
  function syncHint(n){
    var h = n.querySelector && n.querySelector('.quest-hint');
    if (h) h.textContent = n.open ? 'Close' : 'Open';
  }
  function unlockScroll(forceOpen) {
    var html = document.documentElement;
    var body = document.body;
    html.style.height = '100%';
    html.style.minHeight = '100%';
    html.style.overflow = 'auto';
    html.style.overflowY = 'auto';
    html.style.overflowX = 'hidden';
    html.style.webkitOverflowScrolling = 'touch';
    body.style.height = 'auto';
    body.style.minHeight = '100%';
    body.style.overflow = 'visible';
    body.style.overflowY = 'visible';
    body.style.overflowX = 'hidden';
    body.style.margin = '0';
    body.style.webkitOverflowScrolling = 'touch';
    if (forceOpen) {
      var nodes = document.querySelectorAll('.quest-node, details');
      for (var i = 0; i < nodes.length; i++) {
        try { nodes[i].open = true; } catch (e) {}
        syncHint(nodes[i]);
      }
    }
  }
  window.__aiToolUnlockScroll = function() { unlockScroll(false); };
  window.__aiToolSendHeight = function() {};
  unlockScroll(true);
  [50, 150, 400].forEach(function(ms) { setTimeout(function(){ unlockScroll(true); }, ms); });
})();
true;
`;
}

export default function AiToolWebView({
  toolType,
  content,
  rawContent,
  variant = 'student',
  fill = false,
}: Props) {
  const mergedRaw = useMemo(() => coalesceAiToolRawContent(content, rawContent), [content, rawContent]);

  const html = useMemo(() => {
    try {
      return renderAiToolOutputHtml(toolType, content, mergedRaw, variant);
    } catch {
      const display = resolveRichDisplayContent(content, mergedRaw);
      const body = renderMarkdown(display.slice(0, 80000));
      return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${AI_TOOL_OUTPUT_STYLES}${AI_TOOL_QUEST_STYLES}</style></head><body>${wrapQuestExperience(body)}</body></html>`;
    }
  }, [toolType, content, mergedRaw, variant]);

  const contentKey = useMemo(() => {
    const display = resolveRichDisplayContent(content, mergedRaw);
    return `${toolType}:${simpleContentFingerprint(display)}:${simpleContentFingerprint(html)}`;
  }, [toolType, content, mergedRaw, html]);

  const webViewRef = useRef<WebView>(null);
  const [height, setHeight] = useState(INITIAL_HEIGHT);
  /** Explicit pixel viewport for fill mode — Android needs this to enable WebView scroll. */
  const [fillViewportH, setFillViewportH] = useState(0);
  const heightDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heightLockedRef = useRef(false);
  const lastStableHeightRef = useRef(INITIAL_HEIGHT);
  const stableHitsRef = useRef(0);

  useEffect(() => {
    // Always start short — never seed with a content-length guess (that was the empty gap).
    heightLockedRef.current = false;
    stableHitsRef.current = 0;
    lastStableHeightRef.current = INITIAL_HEIGHT;
    setHeight(INITIAL_HEIGHT);
  }, [contentKey]);

  const applyHeight = useCallback((next: number) => {
    if (heightLockedRef.current) {
      // After settle, only accept large jumps (e.g. user toggled a section).
      const delta = Math.abs(next + BOTTOM_PAD - lastStableHeightRef.current);
      if (delta < 48) return;
      heightLockedRef.current = false;
      stableHitsRef.current = 0;
    }
    const target = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, next + BOTTOM_PAD));
    setHeight((prev) => {
      if (Math.abs(target - prev) < 6) {
        stableHitsRef.current += 1;
        if (stableHitsRef.current >= 2) {
          heightLockedRef.current = true;
          lastStableHeightRef.current = prev;
        }
        return prev;
      }
      stableHitsRef.current = 0;
      lastStableHeightRef.current = target;
      return target;
    });
  }, []);

  const webViewHeight = Math.max(height, MIN_HEIGHT);
  const heightScript = useMemo(() => buildHeightScript(), []);
  const fillScrollScript = useMemo(() => buildFillScrollScript(), []);

  const measureHeight = useCallback(() => {
    if (fill) return;
    webViewRef.current?.injectJavaScript(heightScript);
  }, [fill, heightScript]);

  const unlockFillScroll = useCallback(() => {
    if (!fill) return;
    webViewRef.current?.injectJavaScript(fillScrollScript);
  }, [fill, fillScrollScript]);

  useEffect(() => {
    if (fill) {
      const timers = [80, 300, 800, 1600].map((ms) => setTimeout(unlockFillScroll, ms));
      return () => {
        timers.forEach(clearTimeout);
      };
    }
    const timers = [100, 500, 1400].map((ms) => setTimeout(measureHeight, ms));
    return () => {
      timers.forEach(clearTimeout);
      if (heightDebounceRef.current) clearTimeout(heightDebounceRef.current);
    };
  }, [html, fill, measureHeight, unlockFillScroll]);

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      const raw = event.nativeEvent.data;
      try {
        const msg = JSON.parse(raw) as {
          type?: string;
          h?: number;
          tabs?: string[];
          index?: number;
        };
        if (msg.type === 'height' && typeof msg.h === 'number' && msg.h > 0) {
          // Fill mode ignores auto-height — WebView scrolls itself.
          if (fill) {
            unlockFillScroll();
            return;
          }
          if (heightDebounceRef.current) clearTimeout(heightDebounceRef.current);
          heightDebounceRef.current = setTimeout(() => applyHeight(msg.h as number), 80);
          return;
        }
        if (msg.type === 'orbit') {
          // Section-tab rail removed from the UI; still re-measure so all
          // expanded sections are sized correctly.
          if (fill) {
            setTimeout(unlockFillScroll, 40);
          } else {
            setTimeout(measureHeight, 40);
          }
          return;
        }
      } catch {
        // Legacy plain-number height
      }
      if (fill) return;
      const next = Number(raw);
      if (!Number.isFinite(next) || next <= 0) return;
      if (heightDebounceRef.current) clearTimeout(heightDebounceRef.current);
      heightDebounceRef.current = setTimeout(() => applyHeight(next), 80);
    },
    [applyHeight, fill, measureHeight, unlockFillScroll],
  );

  // Self-scrolling fill mode: used on phone tool results so the page can keep
  // params above and the WebView owns vertical scrolling (no nested trap).
  if (fill) {
    return (
      <View style={[styles.root, styles.rootFill]} collapsable={false}>
        <View
          style={styles.wrapFill}
          collapsable={false}
          onLayout={(e) => {
            const next = Math.floor(e.nativeEvent.layout.height);
            if (next > 0) setFillViewportH((prev) => (Math.abs(prev - next) < 2 ? prev : next));
          }}
        >
          <WebView
            key={contentKey}
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html }}
            style={[
              styles.webView,
              fillViewportH > 0 ? { height: fillViewportH, width: '100%' } : styles.webViewFill,
              Platform.OS === 'android' ? styles.webViewAndroid : null,
            ]}
            containerStyle={[styles.webViewContainer, styles.webViewContainerFill]}
            scrollEnabled
            nestedScrollEnabled
            overScrollMode="always"
            showsVerticalScrollIndicator
            bounces
            onMessage={onMessage}
            onLoadEnd={unlockFillScroll}
            injectedJavaScript={fillScrollScript}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            collapsable={false}
            setBuiltInZoomControls={false}
            setDisplayZoomControls={false}
            {...(Platform.OS === 'android' ? { androidLayerType: 'hardware' as const } : null)}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root} collapsable={false}>
      <View style={[styles.wrap, { height: webViewHeight }]} collapsable={false}>
        <WebView
          key={contentKey}
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html }}
          style={[
            styles.webView,
            { height: webViewHeight },
            Platform.OS === 'android' ? styles.webViewAndroid : null,
          ]}
          containerStyle={styles.webViewContainer}
          scrollEnabled={false}
          // Keep false so the parent page ScrollView owns all vertical gestures.
          nestedScrollEnabled={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          bounces={false}
          pointerEvents="auto"
          {...(Platform.OS === 'android' ? { androidLayerType: 'hardware' as const } : null)}
          onMessage={onMessage}
          onLoadEnd={measureHeight}
          injectedJavaScript={heightScript}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          collapsable={false}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
        />
      </View>
    </View>
  );
}

const WEB_BG = '#FFFFFF';

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  rootFill: {
    flex: 1,
    minHeight: 0,
  },
  wrapFill: {
    flex: 1,
    minHeight: 0,
    borderRadius: 16,
    backgroundColor: WEB_BG,
  },
  webViewFill: {
    flex: 1,
  },
  webViewContainerFill: {
    flex: 1,
  },
  wrap: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: WEB_BG,
  },
  webViewContainer: {
    backgroundColor: WEB_BG,
    borderRadius: 16,
    overflow: 'hidden',
  },
  webView: {
    width: '100%',
    backgroundColor: WEB_BG,
    opacity: 0.99,
    borderRadius: 16,
  },
  webViewAndroid: { backgroundColor: WEB_BG },
});
