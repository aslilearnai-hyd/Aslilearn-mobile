import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { isTvOrBoardDisplay } from '../../hooks/useIsTablet';
import { Ionicons } from '@expo/vector-icons';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import {
  buildPdfInjectScript,
  buildPdfJsViewerShellHtml,
  buildPdfUrlInjectScript,
  fetchPdfPreviewLoadInfo,
  resolvePdfUrlTarget,
  YOUTUBE_EMBED_ORIGIN,
  type PdfPreviewLoadInfo,
  type PdfUrlLoadTarget,
} from '../../utils/contentPreview';

const ZOOM_STEP = 1.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

export type PdfPreviewHandle = {
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
};

export type PdfPageState = {
  page: number;
  pageCount: number;
  ready: boolean;
};

type Props = {
  fileUrl: string;
  title?: string;
  style?: ViewStyle;
  onBusyChange?: (busy: boolean) => void;
  hidePageBar?: boolean;
  onPageStateChange?: (state: PdfPageState) => void;
};

const PdfPreviewWebView = forwardRef<PdfPreviewHandle, Props>(function PdfPreviewWebView(
  { fileUrl, title, style, onBusyChange, hidePageBar = false, onPageStateChange },
  ref,
) {
  const { width, height } = useWindowDimensions();
  const isTvView = isTvOrBoardDisplay(width, height);
  const webRef = useRef<WebView>(null);
  const webReadyRef = useRef(false);
  const [webReady, setWebReady] = useState(false);
  const [viewerSize, setViewerSize] = useState({ width: 0, height: 0 });
  const viewerSizeRef = useRef({ width: 0, height: 0 });
  const [urlTarget, setUrlTarget] = useState<PdfUrlLoadTarget | null>(null);
  const [base64Payload, setBase64Payload] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [pageDraft, setPageDraft] = useState('1');
  const [zoom, setZoom] = useState(1);
  const injectedRef = useRef(false);
  const mountedRef = useRef(true);
  const fallbackTriedRef = useRef(false);
  const prefetchedRef = useRef<PdfPreviewLoadInfo | null>(null);
  const prefetchPendingRef = useRef(true);
  const base64PayloadRef = useRef<string | null>(null);
  const fileUrlRef = useRef(fileUrl);
  const titleRef = useRef(title);

  fileUrlRef.current = fileUrl;
  titleRef.current = title;
  base64PayloadRef.current = base64Payload;

  const viewerViewport = {
    width: viewerSize.width > 2 ? viewerSize.width : width,
    height: viewerSize.height > 2 ? viewerSize.height : height,
  };
  const viewerConfig = {
    tv: isTvView,
    nativePinch: false,
    width: Math.round(viewerViewport.width),
    height: Math.round(viewerViewport.height),
  };

  const busy = rendering;
  const pageRef = useRef(page);
  const pageCountRef = useRef(pageCount);
  pageRef.current = page;
  pageCountRef.current = pageCount;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    webReadyRef.current = webReady;
  }, [webReady]);

  const injectWhenReady = useCallback((script: string) => {
    const wrapped = `window.__pdfViewerConfig=${JSON.stringify(viewerConfig)};${script}`;
    const run = () => {
      if (!mountedRef.current) return;
      if (webRef.current && webReadyRef.current) {
        injectedRef.current = true;
        setRendering(true);
        webRef.current.injectJavaScript(wrapped);
        return;
      }
      setTimeout(run, 20);
    };
    run();
  }, [viewerConfig.tv, viewerConfig.width, viewerConfig.height]);

  const loadBase64Fallback = useCallback(async () => {
    if (fallbackTriedRef.current) {
      setRendering(false);
      setError('Could not load this PDF. Check your connection and try again.');
      return;
    }
    fallbackTriedRef.current = true;
    injectedRef.current = false;
    setRendering(true);
    setError(null);

    const loaded =
      prefetchedRef.current ?? (await fetchPdfPreviewLoadInfo(fileUrlRef.current, titleRef.current));
    if (!mountedRef.current) return;

    if (!loaded) {
      setRendering(false);
      setError('Could not load this PDF. Check your connection and try again.');
      return;
    }
    prefetchedRef.current = loaded;
    injectWhenReady(buildPdfInjectScript(loaded.base64));
  }, [injectWhenReady]);

  useEffect(() => {
    mountedRef.current = true;
    fallbackTriedRef.current = false;
    injectedRef.current = false;
    webReadyRef.current = false;
    prefetchedRef.current = null;
    prefetchPendingRef.current = true;
    base64PayloadRef.current = null;
    setWebReady(false);
    setRendering(true);
    setError(null);
    setUrlTarget(null);
    setBase64Payload(null);
    setPage(1);
    setPageCount(0);
    setPageDraft('1');
    setZoom(1);

    void resolvePdfUrlTarget(fileUrlRef.current, titleRef.current).then((target) => {
      if (!mountedRef.current || !target?.url) return;
      setUrlTarget(target);
    });

    prefetchPendingRef.current = false;

    return () => {
      mountedRef.current = false;
      onBusyChange?.(false);
      webRef.current?.stopLoading();
    };
  }, [fileUrl, title, reloadKey, onBusyChange]);

  useEffect(() => {
    if (!webReady || injectedRef.current) return;

    if (base64Payload) {
      injectWhenReady(buildPdfInjectScript(base64Payload));
      return;
    }

    if (!urlTarget) return;

    injectWhenReady(buildPdfUrlInjectScript(urlTarget.url, urlTarget.headers));
  }, [webReady, base64Payload, urlTarget, injectWhenReady]);

  const injectViewerCommand = useCallback((command: string) => {
    webRef.current?.injectJavaScript(
      `(function(){try{var v=window.__pdfViewer;if(v){${command}}}catch(e){}})();true;`
    );
  }, []);

  const jumpToDraftPage = useCallback(() => {
    const count = pageCountRef.current;
    if (busy || count < 1) return;
    const parsed = Number.parseInt(String(pageDraft).replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(parsed)) {
      setPageDraft(String(pageRef.current));
      return;
    }
    const next = Math.min(Math.max(1, parsed), count);
    setPageDraft(String(next));
    setPage(next);
    injectViewerCommand(`v.goToPage(${next})`);
  }, [busy, pageDraft, injectViewerCommand]);

  useImperativeHandle(
    ref,
    () => ({
      goToPage: (n: number) => {
        const count = pageCountRef.current;
        if (count < 1) return;
        const next = Math.min(Math.max(1, Math.floor(n)), count);
        setPage(next);
        setPageDraft(String(next));
        injectViewerCommand(`v.goToPage(${next})`);
      },
      nextPage: () => injectViewerCommand('v.nextPage()'),
      prevPage: () => injectViewerCommand('v.prevPage()'),
    }),
    [injectViewerCommand],
  );

  useEffect(() => {
    onPageStateChange?.({
      page,
      pageCount,
      ready: !busy && pageCount > 0,
    });
  }, [page, pageCount, busy, onPageStateChange]);

  useEffect(() => {
    if (!webReadyRef.current || !injectedRef.current) return;
    webRef.current?.injectJavaScript(
      `window.__pdfViewerConfig=${JSON.stringify(viewerConfig)};if(typeof window.__pdfApplyConfig==='function'){window.__pdfApplyConfig();}true;`
    );
  }, [viewerConfig.tv, viewerConfig.width, viewerConfig.height]);

  const onWebMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const data = event.nativeEvent.data;
      if (data === 'viewer-ready') {
        setWebReady(true);
        return;
      }
      if (data === 'pdf-ready') {
        setRendering(false);
        return;
      }
      if (data === 'pdf-error') {
        void loadBase64Fallback();
        return;
      }
      if (typeof data === 'string' && data.charAt(0) === '{') {
        try {
          const msg = JSON.parse(data) as {
            type?: string;
            page?: number;
            pages?: number;
            zoom?: number;
          };
          if (msg.type === 'pdf-state') {
            if (typeof msg.page === 'number') {
              setPage(msg.page);
              setPageDraft(String(msg.page));
            }
            if (typeof msg.pages === 'number') setPageCount(msg.pages);
            if (typeof msg.zoom === 'number') setZoom(msg.zoom);
          }
        } catch {
          /* ignore */
        }
      }
    },
    [loadBase64Fallback]
  );

  useEffect(() => {
    if (!rendering) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) setRendering(false);
    }, 45000);
    return () => clearTimeout(timer);
  }, [rendering]);

  const showTvControls = isTvView;
  const showZoomControls = true;
  const controlsReady = !busy && pageCount > 0;
  const canZoomOut = controlsReady && zoom > MIN_ZOOM + 0.01;
  const canZoomIn = controlsReady && zoom < MAX_ZOOM - 0.01;
  const isFitPage = controlsReady && Math.abs(zoom - 1) < 0.02;

  if (error) {
    return (
      <View style={[styles.centered, style]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => setReloadKey((k) => k + 1)}
          accessibilityRole="button"
          accessibilityLabel="Retry loading the document"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pageBar = hidePageBar ? null : (
    <View style={styles.pageBar}>
      <TouchableOpacity
        style={[styles.pageNavBtn, (!controlsReady || page <= 1) && styles.tvBtnDisabled]}
        onPress={() => injectViewerCommand('v.prevPage()')}
        disabled={!controlsReady || page <= 1}
        accessibilityRole="button"
        accessibilityLabel="Previous page"
      >
        <Ionicons name="chevron-back" size={20} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.pageBarLabel}>Page</Text>
      <TextInput
        value={pageDraft}
        onChangeText={(text) => setPageDraft(text.replace(/[^\d]/g, ''))}
        onSubmitEditing={jumpToDraftPage}
        onBlur={jumpToDraftPage}
        keyboardType="number-pad"
        returnKeyType="go"
        selectTextOnFocus
        editable={controlsReady}
        style={styles.pageInput}
        accessibilityLabel="Go to page number"
      />
      <Text style={styles.pageBarLabel}>
        of {controlsReady ? pageCount : '—'}
      </Text>
      <TouchableOpacity
        style={[styles.goBtn, !controlsReady && styles.tvBtnDisabled]}
        onPress={jumpToDraftPage}
        disabled={!controlsReady}
        accessibilityRole="button"
        accessibilityLabel="Go to page"
      >
        <Text style={styles.goBtnText}>Go</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.pageNavBtn, (!controlsReady || page >= pageCount) && styles.tvBtnDisabled]}
        onPress={() => injectViewerCommand('v.nextPage()')}
        disabled={!controlsReady || page >= pageCount}
        accessibilityRole="button"
        accessibilityLabel="Next page"
      >
        <Ionicons name="chevron-forward" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.wrap, style]} collapsable={false}>
      {pageBar}
      <View
        style={styles.viewerWrap}
        onLayout={(event) => {
          const { width: layoutW, height: layoutH } = event.nativeEvent.layout;
          if (layoutW < 2 || layoutH < 2) return;
          const prev = viewerSizeRef.current;
          if (Math.abs(prev.width - layoutW) < 2 && Math.abs(prev.height - layoutH) < 2) return;
          viewerSizeRef.current = { width: layoutW, height: layoutH };
          setViewerSize({ width: layoutW, height: layoutH });
        }}
      >
        <WebView
          key={reloadKey}
          ref={webRef}
          source={{
            html: buildPdfJsViewerShellHtml(isTvView, false, { width, height }),
            baseUrl: YOUTUBE_EMBED_ORIGIN,
          }}
          style={[
            styles.viewer,
            viewerSize.width > 2 && viewerSize.height > 2
              ? { width: viewerSize.width, height: viewerSize.height }
              : null,
          ]}
          containerStyle={styles.viewerContainer}
          pointerEvents={busy ? 'none' : 'auto'}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          nestedScrollEnabled
          cacheEnabled
          cacheMode="LOAD_CACHE_ELSE_NETWORK"
          scalesPageToFit={false}
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          bounces={false}
          automaticallyAdjustContentInsets={false}
          overScrollMode={isTvView ? 'never' : 'content'}
          onMessage={onWebMessage}
        />
        {busy ? (
          <View style={styles.overlay} pointerEvents="auto">
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Opening preview…</Text>
          </View>
        ) : null}
      </View>

      {showZoomControls ? (
        <View style={[styles.tvBar, !showTvControls && styles.phoneZoomBar]}>
          <TouchableOpacity
            style={[styles.tvBtn, !canZoomOut && styles.tvBtnDisabled]}
            onPress={() => injectViewerCommand(`v.zoomBy(${1 / ZOOM_STEP})`)}
            disabled={!canZoomOut}
            accessibilityRole="button"
            accessibilityLabel="Zoom out"
          >
            <Ionicons name="remove" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tvFitBtn, isFitPage && styles.tvFitBtnActive, !controlsReady && styles.tvBtnDisabled]}
            onPress={() => injectViewerCommand('v.fitPage()')}
            disabled={!controlsReady}
            accessibilityRole="button"
            accessibilityLabel="Fit page to screen"
          >
            <Ionicons name="contract-outline" size={18} color="#fff" />
            <Text style={styles.tvFitText}>Fit page</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tvBtn, !canZoomIn && styles.tvBtnDisabled]}
            onPress={() => injectViewerCommand(`v.zoomBy(${ZOOM_STEP})`)}
            disabled={!canZoomIn}
            accessibilityRole="button"
            accessibilityLabel="Zoom in"
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.tvZoomLabel}>{Math.round(zoom * 100)}%</Text>
        </View>
      ) : null}
    </View>
  );
});

export default PdfPreviewWebView;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#525659',
  },
  viewerWrap: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  viewerContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  viewer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#525659',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#525659',
    zIndex: 10,
    elevation: 10,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#525659',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#fca5a5',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  tvBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#3c4043',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  phoneZoomBar: {
    paddingVertical: 8,
    justifyContent: 'center',
  },
  tvBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tvBtnDisabled: {
    opacity: 0.35,
  },
  tvFitBtn: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tvFitBtnActive: {
    backgroundColor: '#6366F1',
  },
  tvFitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tvZoomLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'center',
  },
  tvBarSpacer: {
    flex: 1,
  },
  tvPageLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'center',
  },
  pageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#3c4043',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  pageNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pageBarLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  pageInput: {
    width: 56,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#0f172a',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 0,
  },
  goBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
  },
  goBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
