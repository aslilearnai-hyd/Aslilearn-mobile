import { storageGetItem } from '../lib/safe-storage';
import { API_BASE_URL } from '../lib/api-config';

let cachedAuthToken: string | null = null;
let authTokenLoadedAt = 0;
const AUTH_TOKEN_CACHE_MS = 5 * 60 * 1000;

async function getAuthToken(): Promise<string> {
  if (cachedAuthToken !== null && Date.now() - authTokenLoadedAt < AUTH_TOKEN_CACHE_MS) {
    return cachedAuthToken;
  }
  cachedAuthToken = (await storageGetItem('authToken')) || '';
  authTokenLoadedAt = Date.now();
  return cachedAuthToken;
}

/** Warm auth token + PDF bytes before navigating to the viewer. */
export function prefetchPdfPreview(fileUrl: string, title?: string): void {
  void getAuthToken();
  void fetchPdfPreviewLoadInfo(fileUrl, title);
}

const STREAMABLE_MEDIA_EXT =
  /\.(mp4|webm|ogg|mov|avi|mkv|mp3|wav|m4a|aac|flac|jpg|jpeg|png|gif|webp|svg|bmp)(\?|#|$)/i;

export type PreviewKind = 'youtube' | 'video' | 'pdf' | 'drive' | 'image' | 'audio' | 'unknown';

export function resolveContentUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `${API_BASE_URL}${trimmed}`;
  return `${API_BASE_URL}/${trimmed}`;
}

export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/i,
    /[?&]v=([a-zA-Z0-9_-]{11})/i,
    /\/v\/([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }

  const legacy = trimmed.match(/^.*(?:youtu\.be\/|v\/|embed\/|watch\?v=|&v=)([^#&?]{11})/i);
  if (legacy?.[1]) return legacy[1];

  return null;
}

/** Origin sent as Referer for YouTube embeds in WebView (must match app bundle id). */
export const YOUTUBE_EMBED_ORIGIN = 'https://com.tech.aslilearnai';

export function getYoutubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}

export function buildYouTubeEmbedHtml(videoId: string, options?: { autoplay?: boolean }): string {
  const params = new URLSearchParams({
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    fs: '1',
    enablejsapi: '1',
    origin: YOUTUBE_EMBED_ORIGIN,
  });
  if (options?.autoplay) {
    params.set('autoplay', '1');
  }
  const embedSrc =
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <iframe
    src="${embedSrc}"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    allowfullscreen
    referrerpolicy="strict-origin-when-cross-origin"
  ></iframe>
</body>
</html>`;
}

export function getYoutubeEmbedWebViewSource(
  url: string,
  options?: { autoplay?: boolean }
): { html: string; baseUrl: string } | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return {
    html: buildYouTubeEmbedHtml(id, options),
    baseUrl: YOUTUBE_EMBED_ORIGIN,
  };
}

export function getYoutubeEmbedUrl(url: string, options?: { autoplay?: boolean }): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  const params = new URLSearchParams({
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    fs: '1',
    enablejsapi: '1',
    origin: YOUTUBE_EMBED_ORIGIN,
  });
  if (options?.autoplay) {
    params.set('autoplay', '1');
  }
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/i.test(url);
}

/** Unwrap docs.google.com/gview?url=... so the real media URL can play. */
export function unwrapNestedFileUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    const isGview =
      parsed.hostname.includes('docs.google.com') &&
      (parsed.pathname.includes('/gview') || parsed.pathname.includes('/viewer'));
    if (isGview) {
      const target = parsed.searchParams.get('url');
      if (target) return unwrapNestedFileUrl(target);
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

export function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com|docs\.google\.com/i.test(url || '');
}

export function extractVimeoId(url: string): string | null {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  const match = trimmed.match(
    /vimeo\.com\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/|video\/)?(\d+)/i,
  );
  return match?.[1] || null;
}

export function getVimeoEmbedUrl(url: string): string | null {
  const id = extractVimeoId(url);
  if (!id) return null;
  return `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
}

function shouldFetchDirectly(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    const directDomains = ['ncert.nic.in', 'ncertbooks.prashanthellina.com'];
    return directDomains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/** Proxy URL that returns PDF bytes for inline viewing (PDF.js / WebView). */
export async function getPdfJsFetchUrl(fileUrl: string, title?: string): Promise<string> {
  const absolute = resolveContentUrl(fileUrl);
  if (!absolute) return '';
  if (shouldFetchDirectly(absolute)) return absolute;

  const token = await getAuthToken();
  return (
    `${API_BASE_URL}/api/student/content-preview` +
    `?url=${encodeURIComponent(absolute)}` +
    `&filename=${encodeURIComponent(title || 'preview.pdf')}` +
    `&token=${encodeURIComponent(token)}` +
    `&forceProxy=1`
  );
}

function isPdfBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 5) return false;
  const h = new Uint8Array(buffer, 0, 5);
  return h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46 && h[4] === 0x2d;
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  try {
    const { Buffer } = require('buffer');
    return Buffer.from(bytes).toString('base64');
  } catch {
    const chunkSize = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(slice));
    }
    if (typeof globalThis.btoa === 'function') {
      return globalThis.btoa(binary);
    }
    return '';
  }
}

/** Fetch PDF bytes in the native layer (auth + proxy), not inside WebView. */
const pdfBytesCache = new Map<string, { bytes: Uint8Array; at: number }>();
const PDF_CACHE_TTL_MS = 15 * 60 * 1000;
const PDF_CACHE_MAX = 6;

function cachePdfBytes(key: string, bytes: Uint8Array) {
  if (pdfBytesCache.size >= PDF_CACHE_MAX) {
    const oldest = [...pdfBytesCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) pdfBytesCache.delete(oldest[0]);
  }
  pdfBytesCache.set(key, { bytes, at: Date.now() });
}

/** Drop in-memory PDF byte buffers (called on app background). */
export function clearPdfBytesCache() {
  pdfBytesCache.clear();
}

function racePdfAttempts<T>(attempts: Promise<T | null>[]): Promise<T | null> {
  if (attempts.length === 0) return Promise.resolve(null);
  return new Promise((resolve) => {
    let pending = attempts.length;
    let settled = false;

    const finish = (result: T | null) => {
      if (settled) return;
      if (result) {
        settled = true;
        resolve(result);
        return;
      }
      pending -= 1;
      if (pending === 0) {
        settled = true;
        resolve(null);
      }
    };

    for (const attempt of attempts) {
      attempt.then(finish, () => finish(null));
    }
  });
}

export type PdfPreviewSource = 'cache' | 'direct' | 'proxy' | 'external';

export type PdfPreviewLoadInfo = {
  base64: string;
  byteLength: number;
  source: PdfPreviewSource;
  /** Human-readable origin (no auth token). */
  displaySource: string;
};

/** Prefer injecting PDF bytes when under this size (faster than WebView fetch). */
const PDF_BASE64_INJECT_MAX_BYTES = 4 * 1024 * 1024;

function formatPdfDisplaySource(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 48 ? `…${parsed.pathname.slice(-45)}` : parsed.pathname;
    return `${parsed.hostname}${path}`;
  } catch {
    const withoutQuery = url.split('?')[0] || url;
    return withoutQuery.length > 64 ? `…${withoutQuery.slice(-61)}` : withoutQuery;
  }
}

export function describePdfPreviewSource(info: Pick<PdfPreviewLoadInfo, 'source' | 'displaySource'>): string {
  switch (info.source) {
    case 'cache':
      return `Cached · ${info.displaySource}`;
    case 'direct':
      return `School library · ${info.displaySource}`;
    case 'proxy':
      return `Server stream · ${info.displaySource}`;
    case 'external':
      return `External · ${info.displaySource}`;
    default:
      return info.displaySource;
  }
}

type PdfBytesResult = { bytes: Uint8Array; source: Exclude<PdfPreviewSource, 'cache'>; fetchUrl: string };

export async function fetchPdfPreviewBytes(
  fileUrl: string,
  title?: string
): Promise<Uint8Array | null> {
  const loaded = await fetchPdfPreviewLoadInfo(fileUrl, title);
  return loaded ? uint8ArrayFromBase64(loaded.base64) : null;
}

function uint8ArrayFromBase64(base64: string): Uint8Array {
  try {
    const { Buffer } = require('buffer');
    return new Uint8Array(Buffer.from(base64, 'base64'));
  } catch {
    const raw = globalThis.atob ? globalThis.atob(base64) : '';
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
  }
}

export async function fetchPdfPreviewLoadInfo(
  fileUrl: string,
  title?: string
): Promise<PdfPreviewLoadInfo | null> {
  const absolute = resolveContentUrl(fileUrl);
  if (!absolute) return null;

  const cacheKey = `${absolute}|${title || ''}`;
  const cached = pdfBytesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < PDF_CACHE_TTL_MS) {
    return {
      base64: uint8ArrayToBase64(cached.bytes),
      byteLength: cached.bytes.length,
      source: 'cache',
      displaySource: formatPdfDisplaySource(absolute),
    };
  }

  const token = await getAuthToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;
  const isOurBackend =
    absolute.includes(API_BASE_URL) || absolute.includes('/uploads/');

  const tryFetch = async (url: string, headers?: Record<string, string>) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(url, { headers, signal: controller.signal });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return isPdfBuffer(buf) ? new Uint8Array(buf) : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const tryFetchLabeled = async (
    url: string,
    source: Exclude<PdfPreviewSource, 'cache'>
  ): Promise<PdfBytesResult | null> => {
    const bytes = await tryFetch(url, source === 'direct' ? authHeaders : undefined);
    return bytes ? { bytes, source, fetchUrl: url.split('?')[0] || url } : null;
  };

  const attempts: Promise<PdfBytesResult | null>[] = [];

  if (isOurBackend && !shouldFetchDirectly(absolute)) {
    attempts.push(tryFetchLabeled(absolute, 'direct'));
  }

  const proxyUrlPromise = getPdfJsFetchUrl(fileUrl, title).then(async (proxyUrl) => {
    if (!proxyUrl) return null;
    const bytes = await tryFetch(proxyUrl);
    return bytes
      ? { bytes, source: 'proxy' as const, fetchUrl: absolute }
      : null;
  });
  attempts.push(proxyUrlPromise);

  if (shouldFetchDirectly(absolute)) {
    attempts.push(tryFetchLabeled(absolute, 'external'));
  }

  const winner = await racePdfAttempts(attempts);
  if (!winner) return null;

  cachePdfBytes(cacheKey, winner.bytes);
  return {
    base64: uint8ArrayToBase64(winner.bytes),
    byteLength: winner.bytes.length,
    source: winner.source,
    displaySource: formatPdfDisplaySource(winner.fetchUrl || absolute),
  };
}

export function shouldInjectPdfAsBase64(info: Pick<PdfPreviewLoadInfo, 'source' | 'byteLength'>): boolean {
  return info.source === 'cache' || info.byteLength <= PDF_BASE64_INJECT_MAX_BYTES;
}

export async function fetchPdfPreviewBase64(
  fileUrl: string,
  title?: string
): Promise<string | null> {
  const loaded = await fetchPdfPreviewLoadInfo(fileUrl, title);
  return loaded?.base64 ?? null;
}

export type PdfUrlLoadTarget = {
  url: string;
  headers?: Record<string, string>;
};

/** Resolve a streamable PDF URL for in-WebView loading (no native download). */
export async function resolvePdfUrlTarget(
  fileUrl: string,
  title?: string
): Promise<PdfUrlLoadTarget | null> {
  const absolute = resolveContentUrl(fileUrl);
  if (!absolute) return null;

  if (shouldFetchDirectly(absolute)) {
    return { url: absolute };
  }

  const isOurBackend =
    absolute.includes(API_BASE_URL) || absolute.includes('/uploads/');
  if (isOurBackend) {
    const headers = await getAuthHeaders(absolute);
    return { url: absolute, headers };
  }

  const proxyUrl = await getPdfJsFetchUrl(fileUrl, title);
  return { url: proxyUrl || absolute };
}

/** Lightweight shell — PDF opened via URL or injected base64 fallback. */
export const PDF_JS_VIEWER_SHELL_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"><\/script>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      min-height: 100%;
      background: #525659;
    }
    body.tv-mode {
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
    #status {
      position: relative;
      z-index: 2;
      color: #fff;
      text-align: center;
      padding: 32px 16px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 15px;
    }
    #zoom-frame {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x pan-y;
      background: #525659;
    }
    #zoom-sizer {
      width: 100%;
      min-height: 100%;
    }
    #pages {
      width: 100%;
      padding: 8px 0 24px;
    }
    .pdf-slot {
      display: block;
      margin: 0 auto 12px;
      overflow: hidden;
      background: #d1d5db;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    }
    .pdf-zoom-inner {
      transform-origin: 0 0;
    }
    .pdf-slot canvas {
      display: block;
      margin: 0;
      box-shadow: none;
      transform-origin: 0 0;
      pointer-events: none;
    }
    /* Phone / tablet: zoom expands the page; pan via #zoom-frame in all directions */
    body.pdf-zoomed #zoom-frame {
      touch-action: pan-x pan-y;
      overflow: auto;
    }
    body.pdf-zoomed .pdf-slot {
      overflow: visible;
    }
    body.tv-mode #zoom-frame {
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: none;
    }
    body.tv-mode #zoom-sizer,
    body.tv-mode #pages {
      padding: 0;
      height: 100%;
      width: 100%;
      max-width: 100%;
      max-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    body.tv-mode #pages > *:not(:first-child) {
      display: none !important;
    }
    body.tv-mode.tv-zoomed #zoom-sizer,
    body.tv-mode.tv-zoomed #pages,
    body.tv-mode.tv-zoomed .pdf-slot {
      width: 100%;
      height: 100%;
      display: block;
      overflow: hidden;
    }
    body.tv-mode.tv-zoomed .pdf-slot {
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x pan-y;
    }
    body.tv-mode .pdf-slot {
      touch-action: none;
      margin: 0 auto;
      flex: 0 0 auto;
      align-self: center;
    }
    canvas {
      display: block;
      margin: 0 auto 12px;
      width: auto;
      height: auto;
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
    }
    body.tv-mode canvas {
      margin: 0 auto;
      max-width: none;
      box-shadow: 0 4px 24px rgba(0,0,0,0.45);
    }
    #error { display: none; color: #fca5a5; padding: 24px; text-align: center; font-family: sans-serif; font-size: 14px; }
    #progress { position: relative; z-index: 2; color: #cbd5e1; text-align: center; font-size: 12px; padding: 8px; font-family: sans-serif; }
  </style>
</head>
<body>
  <div id="status">Preparing viewer…</div>
  <div id="progress"></div>
  <div id="zoom-frame">
    <div id="zoom-sizer">
      <div id="pages"></div>
    </div>
  </div>
  <script>
    (function () {
      /*PDF_TV_CONFIG*/
      var MIN_ZOOM = 0.5;
      var MAX_ZOOM = 4;
      var PAGE_PAD = 16;
      var MAX_CANVAS = 4096;
      var pdfDoc = null;
      var currentPage = 1;
      var userZoom = 1;
      var renderToken = 0;
      var resizeTimer = null;
      var lastLayoutKey = '';
      var pageSlots = [];
      var syncTimer = null;
      var syncingPages = false;
      var PRELOAD_PAGES = 2;
      var UNLOAD_PAGES = 8;

      const statusEl = () => document.getElementById('status');
      const progressEl = () => document.getElementById('progress');
      const pagesEl = () => document.getElementById('pages');
      const zoomFrameEl = () => document.getElementById('zoom-frame');
      const zoomSizerEl = () => document.getElementById('zoom-sizer');

      var pinchStartDist = 0;
      var pinchStartZoom = 1;
      var pinchSlot = null;
      var lastTapTime = 0;
      var lastTapX = 0;
      var lastTapY = 0;
      var pinchBound = false;
      var hiResTimer = null;
      var swipeStartX = 0;
      var swipeStartY = 0;
      var swipeActive = false;

      function isTvView() {
        var cfg = window.__pdfViewerConfig;
        if (cfg && typeof cfg.tv === 'boolean') return cfg.tv;
        var w = window.innerWidth || 0;
        var h = window.innerHeight || 0;
        var shortSide = Math.min(w, h);
        var longSide = Math.max(w, h);
        return shortSide >= 500 && longSide >= 900;
      }

      function applyNativeViewport() {
        var cfg = window.__pdfViewerConfig || {};
        var w = Math.round(Number(cfg.width) || 0);
        var h = Math.round(Number(cfg.height) || 0);
        if (w < 2 || h < 2) return;
        var meta = document.querySelector('meta[name="viewport"]');
        if (meta) {
          meta.setAttribute(
            'content',
            'width=' + w + ', initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
          );
        }
        document.documentElement.style.width = w + 'px';
        document.documentElement.style.height = h + 'px';
        document.body.style.width = w + 'px';
        document.body.style.height = h + 'px';
        var frame = zoomFrameEl();
        if (frame) {
          frame.style.width = w + 'px';
          frame.style.height = h + 'px';
        }
      }

      function applyBodyMode() {
        applyNativeViewport();
        if (isTvView()) {
          document.body.classList.add('tv-mode');
          document.body.classList.remove('pdf-zoomed');
        } else {
          document.body.classList.remove('tv-mode');
          document.body.classList.remove('tv-zoomed');
          syncPhoneZoomClass();
        }
      }

      function postNative(msg) {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
      }

      function postState() {
        postNative(JSON.stringify({
          type: 'pdf-state',
          page: currentPage,
          pages: pdfDoc ? pdfDoc.numPages : 0,
          zoom: Math.round(userZoom * 100) / 100,
          tv: isTvView()
        }));
      }

      function clampZoom(z) {
        return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
      }

      function touchDist(touches) {
        return Math.hypot(
          touches[1].clientX - touches[0].clientX,
          touches[1].clientY - touches[0].clientY
        );
      }

      function touchMid(touches) {
        return {
          x: (touches[0].clientX + touches[1].clientX) / 2,
          y: (touches[0].clientY + touches[1].clientY) / 2
        };
      }

      function slotFromPoint(clientX, clientY) {
        var el = document.elementFromPoint(clientX, clientY);
        while (el && el !== document.body) {
          if (el.classList && el.classList.contains('pdf-slot')) return el;
          el = el.parentElement;
        }
        return pageSlots[currentPage] || null;
      }

      function syncTvZoomLayout(z) {
        if (!isTvView()) return;
        var zoomed = z > 1.02;
        document.body.classList.toggle('tv-zoomed', zoomed);
        var frame = zoomFrameEl();
        if (frame) frame.style.overflow = 'hidden';
        var slot = pageSlots[currentPage];
        if (!slot) return;
        if (zoomed) {
          slot.style.width = '100%';
          slot.style.height = '100%';
          slot.style.margin = '0';
          slot.style.overflow = 'auto';
        } else {
          var baseW = Number(slot.getAttribute('data-base-w')) || 0;
          var baseH = Number(slot.getAttribute('data-base-h')) || 0;
          if (baseW) slot.style.width = baseW + 'px';
          if (baseH) slot.style.height = baseH + 'px';
          slot.style.margin = '0 auto';
          slot.style.overflow = 'hidden';
          slot.scrollLeft = 0;
          slot.scrollTop = 0;
        }
      }

      function syncPhoneZoomClass() {
        if (isTvView()) {
          document.body.classList.remove('pdf-zoomed');
          return;
        }
        var anyZoomed = false;
        for (var i = 1; i < pageSlots.length; i++) {
          var s = pageSlots[i];
          if (s && (Number(s.getAttribute('data-zoom')) || 1) > 1.02) {
            anyZoomed = true;
            break;
          }
        }
        document.body.classList.toggle('pdf-zoomed', anyZoomed);
        var frame = zoomFrameEl();
        if (frame) {
          frame.style.overflow = 'auto';
          frame.style.touchAction = 'pan-x pan-y';
        }
      }

      function applySlotZoom(slot, nextZoom, clientX, clientY) {
        if (!slot) return;
        var canvas = slot.querySelector('canvas');
        var inner = slot.querySelector('.pdf-zoom-inner');
        if (!canvas || !inner) return;
        var frame = zoomFrameEl();
        var baseW = Number(slot.getAttribute('data-base-w')) || canvas.offsetWidth || 1;
        var baseH = Number(slot.getAttribute('data-base-h')) || canvas.offsetHeight || 1;
        var oldZ = Number(slot.getAttribute('data-zoom')) || 1;
        var z = clampZoom(nextZoom);
        var tv = isTvView();
        var rect = slot.getBoundingClientRect();
        var frameRect = frame ? frame.getBoundingClientRect() : rect;
        var contentX;
        var contentY;
        if (tv) {
          contentX = (slot.scrollLeft + (clientX - rect.left)) / (oldZ || 1);
          contentY = (slot.scrollTop + (clientY - rect.top)) / (oldZ || 1);
        } else if (frame) {
          var slotLeftInFrame = rect.left - frameRect.left + frame.scrollLeft;
          var slotTopInFrame = rect.top - frameRect.top + frame.scrollTop;
          contentX = (frame.scrollLeft + (clientX - frameRect.left) - slotLeftInFrame) / (oldZ || 1);
          contentY = (frame.scrollTop + (clientY - frameRect.top) - slotTopInFrame) / (oldZ || 1);
        } else {
          contentX = baseW / 2;
          contentY = baseH / 2;
        }
        slot.setAttribute('data-zoom', String(z));
        userZoom = z;
        inner.style.width = Math.round(baseW * z) + 'px';
        inner.style.height = Math.round(baseH * z) + 'px';
        canvas.style.transformOrigin = '0 0';
        canvas.style.transform = z <= 1.001 ? '' : ('scale(' + z + ')');

        if (z > 1.02) {
          if (tv) {
            // TV: pan inside the page slot (one page fills the screen).
            slot.style.width = '100%';
            slot.style.height = '100%';
            slot.style.overflow = 'auto';
            if (frame) frame.style.overflow = 'hidden';
            slot.scrollLeft = contentX * z - (clientX - rect.left);
            slot.scrollTop = contentY * z - (clientY - rect.top);
          } else {
            // Phone/tablet: grow the page; pan with the outer #zoom-frame (reliable in WebView).
            slot.style.width = Math.round(baseW * z) + 'px';
            slot.style.height = Math.round(baseH * z) + 'px';
            slot.style.overflow = 'visible';
            slot.scrollLeft = 0;
            slot.scrollTop = 0;
            if (frame) {
              frame.style.overflow = 'auto';
              frame.style.touchAction = 'pan-x pan-y';
              var newSlotLeft = slot.offsetLeft;
              var newSlotTop = slot.offsetTop;
              frame.scrollLeft = newSlotLeft + contentX * z - (clientX - frameRect.left);
              frame.scrollTop = newSlotTop + contentY * z - (clientY - frameRect.top);
            }
          }
        } else {
          userZoom = 1;
          slot.setAttribute('data-zoom', '1');
          slot.style.width = baseW + 'px';
          slot.style.height = baseH + 'px';
          slot.style.overflow = 'hidden';
          slot.scrollLeft = 0;
          slot.scrollTop = 0;
          inner.style.width = baseW + 'px';
          inner.style.height = baseH + 'px';
          canvas.style.transform = '';
          if (frame && !tv) {
            frame.style.overflow = 'auto';
            frame.style.touchAction = 'pan-x pan-y';
          }
        }
        syncTvZoomLayout(userZoom);
        syncPhoneZoomClass();
        postState();
      }

      function applyCssZoom() {
        var pages = pagesEl();
        if (pages) pages.style.transform = '';
        var sizer = zoomSizerEl();
        if (sizer) {
          sizer.style.width = '100%';
          sizer.style.height = '';
        }
      }

      function zoomAt(nextZoom, clientX, clientY) {
        applySlotZoom(pinchSlot || slotFromPoint(clientX, clientY) || pageSlots[currentPage], nextZoom, clientX, clientY);
      }

      function updatePageFromScroll() {
        if (isTvView() || !pdfDoc) return;
        var frame = zoomFrameEl();
        if (!frame || pageSlots.length < 2) return;
        var y = frame.scrollTop + Math.min(48, frame.clientHeight / 4);
        var best = 1;
        for (var i = 1; i < pageSlots.length; i++) {
          var slot = pageSlots[i];
          if (slot && slot.offsetTop <= y) best = i;
        }
        if (best !== currentPage) {
          currentPage = best;
          postState();
        }
      }

      function tvZoomLevel() {
        var slot = pageSlots[currentPage];
        if (slot) return Number(slot.getAttribute('data-zoom')) || 1;
        return userZoom;
      }

      function bindPinchZoom() {
        var frame = zoomFrameEl();
        if (!frame || pinchBound) return;
        pinchBound = true;

        frame.addEventListener('scroll', function () {
          updatePageFromScroll();
          scheduleSyncPages();
        }, { passive: true });

        frame.addEventListener('touchstart', function (e) {
          if (e.touches.length >= 2) {
            e.preventDefault();
            swipeActive = false;
            var midStart = touchMid(e.touches);
            pinchSlot = slotFromPoint(midStart.x, midStart.y) || pageSlots[currentPage];
            pinchStartDist = touchDist(e.touches);
            pinchStartZoom = pinchSlot ? (Number(pinchSlot.getAttribute('data-zoom')) || 1) : 1;
            return;
          }
          if (isTvView() && e.touches.length === 1 && tvZoomLevel() <= 1.02) {
            swipeActive = true;
            swipeStartX = e.touches[0].clientX;
            swipeStartY = e.touches[0].clientY;
          } else {
            swipeActive = false;
          }
        }, { passive: false, capture: true });

        frame.addEventListener('touchmove', function (e) {
          if (e.touches.length >= 2) {
            e.preventDefault();
            swipeActive = false;
            if (pinchStartDist <= 0) {
              var mid0 = touchMid(e.touches);
              pinchSlot = pinchSlot || slotFromPoint(mid0.x, mid0.y) || pageSlots[currentPage];
              pinchStartDist = touchDist(e.touches);
              pinchStartZoom = pinchSlot ? (Number(pinchSlot.getAttribute('data-zoom')) || 1) : 1;
              return;
            }
            var mid = touchMid(e.touches);
            zoomAt(pinchStartZoom * (touchDist(e.touches) / pinchStartDist), mid.x, mid.y);
            return;
          }
          if (swipeActive && isTvView() && tvZoomLevel() <= 1.02) {
            e.preventDefault();
          }
        }, { passive: false, capture: true });

        frame.addEventListener('touchend', function (e) {
          if (e.touches.length >= 2) return;
          if (e.touches.length === 1) {
            pinchStartDist = 0;
            return;
          }
          var endedSlot = pinchSlot;
          var wasPinch = pinchStartDist > 0;
          pinchStartDist = 0;
          if (swipeActive && isTvView() && tvZoomLevel() <= 1.02 && e.changedTouches && e.changedTouches.length) {
            var t0 = e.changedTouches[0];
            var dx = t0.clientX - swipeStartX;
            var dy = t0.clientY - swipeStartY;
            var absX = Math.abs(dx);
            var absY = Math.abs(dy);
            swipeActive = false;
            if (!wasPinch && Math.max(absX, absY) > 56) {
              lastTapTime = 0;
              pinchSlot = null;
              if (window.__pdfViewer) {
                if (absX > absY) {
                  if (dx < 0) window.__pdfViewer.nextPage();
                  else window.__pdfViewer.prevPage();
                } else if (dy < 0) {
                  window.__pdfViewer.nextPage();
                } else {
                  window.__pdfViewer.prevPage();
                }
              }
              return;
            }
          }
          swipeActive = false;
          if (e.changedTouches && e.changedTouches.length === 1) {
            var t = e.changedTouches[0];
            var now = Date.now();
            if (now - lastTapTime <= 320 && Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY) < 44) {
              lastTapTime = 0;
              pinchSlot = slotFromPoint(t.clientX, t.clientY) || pageSlots[currentPage];
              var currentZ = pinchSlot ? (Number(pinchSlot.getAttribute('data-zoom')) || 1) : 1;
              zoomAt(currentZ > 1.05 ? 1 : 2.25, t.clientX, t.clientY);
              scheduleHiResRefresh(pinchSlot);
              pinchSlot = null;
              return;
            }
            lastTapTime = now;
            lastTapX = t.clientX;
            lastTapY = t.clientY;
          }
          if (endedSlot) scheduleHiResRefresh(endedSlot);
          pinchSlot = null;
        }, { passive: false });
      }

      function availableSize() {
        var cfg = window.__pdfViewerConfig || {};
        var frame = zoomFrameEl();
        var vis = window.visualViewport;
        var nativeW = Number(cfg.width) || 0;
        var nativeH = Number(cfg.height) || 0;
        var w;
        var h;
        if (isTvView()) {
          w = Math.max(
            (frame && frame.clientWidth) || 0,
            (vis && vis.width) || 0,
            document.documentElement.clientWidth || 0,
            window.innerWidth || 0,
            nativeW
          );
          h = Math.max(
            (frame && frame.clientHeight) || 0,
            (vis && vis.height) || 0,
            document.documentElement.clientHeight || 0,
            window.innerHeight || 0,
            nativeH
          );
        } else {
          w = (frame && frame.clientWidth) || window.innerWidth || document.documentElement.clientWidth || 320;
          h = (frame && frame.clientHeight) || window.innerHeight || document.documentElement.clientHeight || 480;
        }
        return {
          w: Math.max(w - PAGE_PAD, 200),
          h: Math.max(h - PAGE_PAD, 200)
        };
      }

      function layoutKey() {
        var cfg = window.__pdfViewerConfig || {};
        return [
          isTvView() ? 'tv' : 'phone',
          Math.round(Number(cfg.width) || window.innerWidth || 0),
          Math.round(Number(cfg.height) || window.innerHeight || 0),
          isTvView() ? currentPage : 0,
          pdfDoc ? pdfDoc.numPages : 0
        ].join(':');
      }

      function clearError() {
        const err = document.getElementById('error');
        if (err) err.remove();
      }

      function showError(msg) {
        const s = statusEl();
        const p = progressEl();
        if (s) s.remove();
        if (p) p.remove();
        const errEl = document.createElement('div');
        errEl.id = 'error';
        errEl.style.display = 'block';
        errEl.textContent = msg || 'Could not display this PDF.';
        document.body.appendChild(errEl);
      }

      /** In the app WebView, keep loading UI and let native retry — never flash HTML errors. */
      function reportPdfFailure(msg) {
        clearError();
        if (window.ReactNativeWebView) {
          const s = statusEl();
          if (s) s.textContent = 'Opening document…';
          postNative('pdf-error');
          return;
        }
        showError(msg);
      }

      async function paintSlot(pdf, num, force) {
        var slot = pageSlots[num];
        if (!slot) return;
        if (!force && slot.getAttribute('data-ready')) return;
        var paintId = (Number(slot.getAttribute('data-paint')) || 0) + 1;
        slot.setAttribute('data-paint', String(paintId));
        var keepZoom = Number(slot.getAttribute('data-zoom')) || 1;
        var keepScrollL = slot.scrollLeft;
        var keepScrollT = slot.scrollTop;
        slot.setAttribute('data-ready', 'pending');
        try {
          var page = await pdf.getPage(num);
          if (Number(slot.getAttribute('data-paint')) !== paintId || pageSlots[num] !== slot) return;
          var baseViewport = page.getViewport({ scale: 1 });
          var size = availableSize();
          var fitScale = isTvView()
            ? Math.min(size.w / baseViewport.width, size.h / baseViewport.height)
            : size.w / baseViewport.width;
          if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
          var pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
          var quality = Math.max(1, Math.min(keepZoom, MAX_ZOOM));
          var outputScale = pixelRatio * quality;
          var cssW = Math.max(1, Math.floor(baseViewport.width * fitScale));
          var cssH = Math.max(1, Math.floor(baseViewport.height * fitScale));
          var renderViewport = page.getViewport({ scale: fitScale * outputScale });
          var backingW = Math.max(1, Math.min(Math.floor(renderViewport.width), MAX_CANVAS));
          var backingH = Math.max(1, Math.min(Math.floor(renderViewport.height), MAX_CANVAS));
          var canvas = document.createElement('canvas');
          canvas.style.width = cssW + 'px';
          canvas.style.height = cssH + 'px';
          canvas.width = backingW;
          canvas.height = backingH;
          var ctx = canvas.getContext('2d', { alpha: false });
          if (!ctx) {
            if (Number(slot.getAttribute('data-paint')) === paintId) slot.removeAttribute('data-ready');
            return;
          }
          ctx.imageSmoothingEnabled = true;
          if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
          ctx.setTransform(backingW / renderViewport.width, 0, 0, backingH / renderViewport.height, 0, 0);
          slot.setAttribute('data-base-w', String(cssW));
          slot.setAttribute('data-base-h', String(cssH));
          slot.style.width = cssW + 'px';
          slot.style.height = cssH + 'px';
          var inner = document.createElement('div');
          inner.className = 'pdf-zoom-inner';
          inner.appendChild(canvas);
          if (keepZoom > 1.02) {
            inner.style.width = Math.round(cssW * keepZoom) + 'px';
            inner.style.height = Math.round(cssH * keepZoom) + 'px';
            canvas.style.transformOrigin = '0 0';
            canvas.style.transform = 'scale(' + keepZoom + ')';
            slot.setAttribute('data-zoom', String(keepZoom));
            if (isTvView()) {
              slot.style.overflow = 'auto';
            } else {
              slot.style.width = Math.round(cssW * keepZoom) + 'px';
              slot.style.height = Math.round(cssH * keepZoom) + 'px';
              slot.style.overflow = 'visible';
            }
          } else {
            inner.style.width = cssW + 'px';
            inner.style.height = cssH + 'px';
            slot.style.overflow = 'hidden';
            slot.setAttribute('data-zoom', '1');
            keepZoom = 1;
          }
          await page.render({
            canvasContext: ctx,
            viewport: renderViewport,
            intent: 'display',
          }).promise;
          if (Number(slot.getAttribute('data-paint')) !== paintId || pageSlots[num] !== slot) return;
          var oldInner = slot.querySelector('.pdf-zoom-inner');
          if (oldInner && oldInner.parentNode === slot) slot.removeChild(oldInner);
          slot.appendChild(inner);
          if (keepZoom > 1.02 && isTvView()) {
            slot.scrollLeft = keepScrollL;
            slot.scrollTop = keepScrollT;
          }
          if (isTvView()) {
            userZoom = keepZoom;
            syncTvZoomLayout(userZoom);
          } else {
            userZoom = keepZoom;
            syncPhoneZoomClass();
          }
          slot.setAttribute('data-ready', '1');
        } catch (err) {
          if (Number(slot.getAttribute('data-paint')) === paintId) slot.removeAttribute('data-ready');
        }
      }

      function scheduleHiResRefresh(slot) {
        if (!slot || !pdfDoc) return;
        var num = Number(slot.getAttribute('data-page'));
        if (!num) return;
        clearTimeout(hiResTimer);
        hiResTimer = setTimeout(function () {
          void paintSlot(pdfDoc, num, true);
        }, 140);
      }

      function visiblePageRange() {
        var frame = zoomFrameEl();
        var last = Math.max(1, pageSlots.length - 1);
        if (!frame || last < 1) return { first: 1, last: 1 };
        var viewTop = frame.scrollTop;
        var viewBottom = frame.scrollTop + frame.clientHeight;
        var first = 1;
        var end = 1;
        for (var i = 1; i <= last; i++) {
          var slot = pageSlots[i];
          if (!slot) continue;
          if (slot.offsetTop + slot.offsetHeight >= viewTop - 24) {
            first = i;
            break;
          }
        }
        for (var j = first; j <= last; j++) {
          var s2 = pageSlots[j];
          if (!s2) continue;
          end = j;
          if (s2.offsetTop > viewBottom + 24) break;
        }
        return {
          first: Math.max(1, first - PRELOAD_PAGES),
          last: Math.min(last, end + PRELOAD_PAGES)
        };
      }

      function scheduleSyncPages() {
        if (syncTimer) return;
        syncTimer = setTimeout(function () {
          syncTimer = null;
          void syncVisiblePages();
        }, 40);
      }

      async function syncVisiblePages() {
        if (!pdfDoc || isTvView() || syncingPages || pageSlots.length < 2) return;
        syncingPages = true;
        try {
          var range = visiblePageRange();
          for (var n = range.first; n <= range.last; n++) {
            await paintSlot(pdfDoc, n);
          }
          var last = pageSlots.length - 1;
          for (var i = 1; i <= last; i++) {
            if (i >= range.first - UNLOAD_PAGES && i <= range.last + UNLOAD_PAGES) continue;
            var slot = pageSlots[i];
            if (slot && slot.getAttribute('data-ready') === '1') {
              slot.innerHTML = '';
              slot.removeAttribute('data-ready');
            }
          }
        } finally {
          syncingPages = false;
        }
      }

      function buildPageSlots(pdf, cssW, cssH) {
        var container = pagesEl();
        if (!container) return;
        container.innerHTML = '';
        pageSlots = new Array(pdf.numPages + 1);
        for (var i = 1; i <= pdf.numPages; i++) {
          var slot = document.createElement('div');
          slot.className = 'pdf-slot';
          slot.setAttribute('data-page', String(i));
          slot.style.width = cssW + 'px';
          slot.style.height = cssH + 'px';
          container.appendChild(slot);
          pageSlots[i] = slot;
        }
      }

      function ensureTvSlot(pageNum) {
        var container = pagesEl();
        if (!container) return null;
        var kids = container.children;
        var slot = null;
        if (kids.length === 1 && kids[0].classList && kids[0].classList.contains('pdf-slot')) {
          slot = kids[0];
        } else {
          slot = pageSlots[pageNum];
          if (slot && slot.parentNode) slot.parentNode.removeChild(slot);
          container.innerHTML = '';
          if (!slot || !slot.classList || !slot.classList.contains('pdf-slot')) {
            slot = document.createElement('div');
            slot.className = 'pdf-slot';
          }
          container.appendChild(slot);
        }
        while (container.children.length > 1) {
          container.removeChild(container.lastChild);
        }
        slot.setAttribute('data-page', String(pageNum));
        pageSlots = [];
        pageSlots[pageNum] = slot;
        return slot;
      }

      function showTvPage(pageNum, resetZoom) {
        if (!pdfDoc) return;
        currentPage = Math.min(Math.max(1, pageNum), pdfDoc.numPages);
        var slot = ensureTvSlot(currentPage);
        if (resetZoom && slot) {
          userZoom = 1;
          slot.setAttribute('data-zoom', '1');
          slot.scrollLeft = 0;
          slot.scrollTop = 0;
          document.body.classList.remove('tv-zoomed');
        }
        lastLayoutKey = layoutKey();
        postState();
        void paintSlot(pdfDoc, currentPage, true);
      }

      async function renderVisible(pdf) {
        var container = pagesEl();
        var s = statusEl();
        var p = progressEl();
        if (!container) return false;
        var token = ++renderToken;
        var tv = isTvView();
        applyBodyMode();
        await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(r); }); });
        if (token !== renderToken) return false;
        var key = layoutKey();

        if (tv) {
          currentPage = Math.min(Math.max(1, currentPage), pdf.numPages);
          ensureTvSlot(currentPage);
          await paintSlot(pdf, currentPage, true);
          if (token !== renderToken) return false;
          lastLayoutKey = key;
          bindPinchZoom();
          if (s) s.remove();
          if (p) p.remove();
          postNative('pdf-ready');
          postState();
          return true;
        }

        container.innerHTML = '';

        var firstPage = await pdf.getPage(1);
        var baseViewport = firstPage.getViewport({ scale: 1 });
        var size = availableSize();
        var fitScale = size.w / baseViewport.width;
        if (!isFinite(fitScale) || fitScale <= 0) fitScale = 1;
        var viewport = firstPage.getViewport({ scale: fitScale });
        var cssW = Math.max(1, Math.floor(viewport.width));
        var cssH = Math.max(1, Math.floor(viewport.height));
        buildPageSlots(pdf, cssW, cssH);
        await paintSlot(pdf, 1);
        if (token !== renderToken) return false;
        if (s) s.remove();
        if (p) p.remove();
        lastLayoutKey = key;
        applyCssZoom();
        bindPinchZoom();
        postNative('pdf-ready');
        postState();
        void syncVisiblePages();
        return true;
      }

      async function rerender() {
        if (!pdfDoc) return;
        if (layoutKey() === lastLayoutKey && pagesEl() && pagesEl().querySelector('canvas')) return;
        await renderVisible(pdfDoc);
      }

      window.__pdfApplyConfig = function () {
        lastLayoutKey = '';
        applyBodyMode();
        rerender();
      };

      function viewerCenter() {
        var frame = zoomFrameEl();
        return {
          x: frame ? frame.getBoundingClientRect().left + frame.clientWidth / 2 : window.innerWidth / 2,
          y: frame ? frame.getBoundingClientRect().top + frame.clientHeight / 2 : window.innerHeight / 2
        };
      }

      window.__pdfViewer = {
        zoomBy: function (factor) {
          var slot = pageSlots[currentPage] || document.querySelector('.pdf-slot');
          var c = viewerCenter();
          pinchSlot = slot;
          zoomAt((slot ? (Number(slot.getAttribute('data-zoom')) || 1) : userZoom) * factor, c.x, c.y);
          scheduleHiResRefresh(slot);
          pinchSlot = null;
        },
        setZoom: function (z) {
          var slot = pageSlots[currentPage] || document.querySelector('.pdf-slot');
          var c = viewerCenter();
          pinchSlot = slot;
          zoomAt(z, c.x, c.y);
          scheduleHiResRefresh(slot);
          pinchSlot = null;
        },
        fitPage: function () {
          var slot = pageSlots[currentPage] || document.querySelector('.pdf-slot');
          var c = viewerCenter();
          pinchSlot = slot;
          zoomAt(1, c.x, c.y);
          pinchSlot = null;
        },
        nextPage: function () {
          if (!pdfDoc || currentPage >= pdfDoc.numPages) return;
          if (isTvView()) {
            showTvPage(currentPage + 1, true);
            return;
          }
          window.__pdfViewer.goToPage(currentPage + 1);
        },
        prevPage: function () {
          if (!pdfDoc || currentPage <= 1) return;
          if (isTvView()) {
            showTvPage(currentPage - 1, true);
            return;
          }
          window.__pdfViewer.goToPage(currentPage - 1);
        },
        goToPage: function (n) {
          if (!pdfDoc) return;
          var page = Math.min(Math.max(1, Math.floor(Number(n) || 1)), pdfDoc.numPages);
          currentPage = page;
          if (isTvView()) {
            showTvPage(page, true);
            return;
          }
          var container = pagesEl();
          var frame = zoomFrameEl();
          if (!container) return;
          var target = pageSlots[page];
          if (target && frame) {
            pinchSlot = target;
            var cx = target.getBoundingClientRect().left + target.clientWidth / 2;
            var cy = target.getBoundingClientRect().top + Math.min(80, target.clientHeight / 4);
            zoomAt(1, cx, cy);
            pinchSlot = null;
            frame.style.overflow = 'auto';
            frame.scrollTo({
              top: Math.max(0, target.offsetTop - 8),
              left: 0,
              behavior: 'auto'
            });
            void paintSlot(pdfDoc, page);
            scheduleSyncPages();
          } else if (target && typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
            void paintSlot(pdfDoc, page);
            scheduleSyncPages();
          }
          postState();
        }
      };

      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { rerender(); }, 220);
      });

      async function renderPdf(pdf) {
        pdfDoc = pdf;
        currentPage = 1;
        userZoom = 1;
        lastLayoutKey = '';
        return renderVisible(pdf);
      }

      async function openPdf(getDocumentParams) {
        clearError();
        if (typeof pdfjsLib === 'undefined') {
          reportPdfFailure('PDF viewer failed to load. Check your internet connection.');
          return false;
        }
        const s = statusEl();
        try {
          if (s) s.textContent = 'Opening document…';
          pdfjsLib.GlobalWorkerOptions.workerSrc = '';
          const pdf = await pdfjsLib.getDocument(getDocumentParams).promise;
          return await renderPdf(pdf);
        } catch (err) {
          reportPdfFailure('Could not display this PDF. Please try again.');
          return false;
        }
      }

      window.__renderPdfFromUrl = async function (url, headers) {
        const params = { url: url, disableWorker: true, disableStream: false, disableAutoFetch: false, disableRange: false };
        if (headers && Object.keys(headers).length) {
          params.httpHeaders = headers;
        }
        return openPdf(params);
      };

      window.__renderPdfBase64 = async function (b64) {
        const raw = atob(b64);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        return openPdf({ data: bytes, disableWorker: true });
      };

      function signalViewerReady() {
        applyBodyMode();
        bindPinchZoom();
        postNative('viewer-ready');
      }

      if (typeof pdfjsLib !== 'undefined') {
        signalViewerReady();
      } else {
        var viewerReadyPoll = setInterval(function () {
          if (typeof pdfjsLib !== 'undefined') {
            clearInterval(viewerReadyPoll);
            signalViewerReady();
          }
        }, 20);
      }
    })();
  <\/script>
</body>
</html>`;

export function buildPdfJsViewerShellHtml(
  tv = false,
  nativePinch = false,
  viewport?: { width?: number; height?: number }
): string {
  const width = Math.round(Number(viewport?.width) || 0);
  const height = Math.round(Number(viewport?.height) || 0);
  const viewportMeta =
    width > 0
      ? `width=${width}, initial-scale=1.0, maximum-scale=1.0, user-scalable=no`
      : 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  return PDF_JS_VIEWER_SHELL_HTML
    .replace(
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
      viewportMeta
    )
    .replace('<body>', tv ? '<body class="tv-mode">' : '<body>')
    .replace(
      '/*PDF_TV_CONFIG*/',
      `window.__pdfViewerConfig=${JSON.stringify({
        tv,
        nativePinch,
        width: width || undefined,
        height: height || undefined,
      })};`
    );
}

export function buildPdfInjectScript(base64: string): string {
  return `(function(){
    var b64 = ${JSON.stringify(base64)};
    function run() {
      if (typeof window.__renderPdfBase64 === 'function') {
        window.__renderPdfBase64(b64);
      } else {
        setTimeout(run, 40);
      }
    }
    run();
  })();true;`;
}

export function buildPdfUrlInjectScript(
  url: string,
  headers?: Record<string, string>
): string {
  return `(function(){
    var url = ${JSON.stringify(url)};
    var headers = ${JSON.stringify(headers || {})};
    function run() {
      if (typeof window.__renderPdfFromUrl === 'function') {
        window.__renderPdfFromUrl(url, headers);
      } else {
        setTimeout(run, 40);
      }
    }
    run();
  })();true;`;
}

export function isPdfPreviewContent(fileUrl: string, contentType?: string | null): boolean {
  const absolute = resolveContentUrl(fileUrl).toLowerCase();
  if (!absolute) return false;
  if (absolute.includes('.pdf')) return true;
  if (STREAMABLE_MEDIA_EXT.test(absolute)) return false;
  if (absolute.includes('youtube.com') || absolute.includes('youtu.be')) return false;

  const type = (contentType || '').trim();
  if (type === 'TextBook' || type === 'Workbook' || type === 'PDF') return true;
  if (type === 'Material' || type === 'Homework') return true;
  if (/\/uploads\//i.test(absolute)) return true;

  return false;
}

export function getPreviewKind(
  fileUrl: string,
  contentType?: string | null,
  youtubeUrl?: string,
): PreviewKind {
  const resolved = resolveContentUrl(unwrapNestedFileUrl(fileUrl));
  const yt = youtubeUrl || resolved;
  if (isYouTubeUrl(yt)) return 'youtube';
  if (contentType === 'Video' || /\.(mp4|webm|mov|avi|mkv)(\?|#|$)/i.test(resolved)) return 'video';
  if (contentType === 'Audio' || /\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i.test(resolved)) return 'audio';
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|#|$)/i.test(resolved)) return 'image';
  if (isPdfPreviewContent(resolved, contentType)) return 'pdf';
  if (isGoogleDriveUrl(resolved)) return 'drive';
  return 'unknown';
}

export function getDrivePreviewUrl(link: string): string {
  const trimmed = link.trim();
  let extractedId = '';

  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) {
    extractedId = fileMatch[1];
  } else {
    const openMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (openMatch) {
      extractedId = openMatch[1];
    } else {
      const docMatch = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
      if (docMatch) {
        extractedId = docMatch[1];
      } else {
        const sheetMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        if (sheetMatch) {
          extractedId = sheetMatch[1];
        } else {
          const slideMatch = trimmed.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
          if (slideMatch) {
            extractedId = slideMatch[1];
          }
        }
      }
    }
  }

  if (!extractedId) return trimmed;

  if (trimmed.includes('document')) {
    return `https://docs.google.com/document/d/${extractedId}/preview`;
  }
  if (trimmed.includes('spreadsheet')) {
    return `https://docs.google.com/spreadsheets/d/${extractedId}/preview`;
  }
  if (trimmed.includes('presentation')) {
    return `https://docs.google.com/presentation/d/${extractedId}/preview`;
  }
  return `https://drive.google.com/file/d/${extractedId}/preview`;
}

export async function getPdfPreviewUrl(fileUrl: string, title?: string): Promise<string> {
  return getPdfJsFetchUrl(fileUrl, title);
}

export async function getAuthHeaders(url: string): Promise<Record<string, string> | undefined> {
  if (url.includes('content-preview') && url.includes('token=')) return undefined;
  if (!url.includes(API_BASE_URL) && !url.includes('/uploads/')) return undefined;
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}
