import { useEffect, useState, type Ref } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import YouTubeEmbedWebView from './YouTubeEmbedWebView';
import PdfPreviewWebView, { type PdfPageState, type PdfPreviewHandle } from './PdfPreviewWebView';
import {
  getAuthHeaders,
  getDrivePreviewUrl,
  getPreviewKind,
  isYouTubeUrl,
  resolveContentUrl,
} from '../../utils/contentPreview';

type Props = {
  fileUrl: string;
  title?: string;
  contentType?: string;
  youtubeUrl?: string;
  onPreviewBusyChange?: (busy: boolean) => void;
  pdfRef?: Ref<PdfPreviewHandle>;
  hidePdfPageBar?: boolean;
  onPdfPageStateChange?: (state: PdfPageState) => void;
};

export default function MediaPreviewPanel({
  fileUrl,
  title,
  contentType,
  youtubeUrl,
  onPreviewBusyChange,
  pdfRef,
  hidePdfPageBar,
  onPdfPageStateChange,
}: Props) {
  const resolvedUrl = resolveContentUrl(fileUrl);
  const ytSource = youtubeUrl || resolvedUrl;
  const kind = getPreviewKind(resolvedUrl, contentType, youtubeUrl);

  const [loading, setLoading] = useState(
    kind === 'drive' || kind === 'image' || kind === 'video' || kind === 'audio',
  );
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [webHeaders, setWebHeaders] = useState<Record<string, string> | undefined>();
  const [videoHeaders, setVideoHeaders] = useState<Record<string, string> | undefined>();

  useEffect(() => {
    setPreviewUri(null);
    setWebHeaders(undefined);
    setVideoHeaders(undefined);
    setLoading(kind === 'drive' || kind === 'image' || kind === 'video' || kind === 'audio');

    let cancelled = false;

    (async () => {
      if (kind === 'pdf') {
        setLoading(false);
        return;
      }

      if (kind === 'drive') {
        setPreviewUri(getDrivePreviewUrl(resolvedUrl));
        setWebHeaders(undefined);
        setLoading(false);
        return;
      }

      if (kind === 'youtube') {
        setLoading(false);
        return;
      }

      if (kind === 'image') {
        const headers = await getAuthHeaders(resolvedUrl);
        if (!cancelled) {
          setPreviewUri(resolvedUrl);
          setWebHeaders(headers);
          setLoading(false);
        }
        return;
      }

      if (kind === 'video') {
        const headers = await getAuthHeaders(resolvedUrl);
        if (!cancelled) {
          setVideoHeaders(headers);
          setLoading(false);
        }
        return;
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [kind, resolvedUrl, title, ytSource]);

  if (kind === 'video' && resolvedUrl) {
    return (
      <View style={styles.flex}>
        <Video
          source={{ uri: resolvedUrl, headers: videoHeaders }}
          style={styles.flex}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
        />
      </View>
    );
  }

  if (kind === 'audio' && resolvedUrl) {
    const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:24px;background:#f8fafc;font-family:sans-serif">
        <audio controls style="width:100%" src="${resolvedUrl.replace(/"/g, '&quot;')}"></audio>
      </body></html>`;
    return <WebView source={{ html }} style={styles.flex} allowsInlineMediaPlayback />;
  }

  if (kind === 'image' && previewUri) {
    return (
      <Image
        source={{ uri: previewUri, headers: webHeaders }}
        style={styles.flex}
        contentFit="contain"
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading preview…</Text>
      </View>
    );
  }

  if (kind === 'youtube' && isYouTubeUrl(ytSource)) {
    return (
      <View style={styles.flex}>
        <YouTubeEmbedWebView videoUrl={ytSource} style={styles.flex} />
      </View>
    );
  }

  if (kind === 'pdf') {
    return (
      <View style={[styles.flex, styles.pdfShell]}>
        <PdfPreviewWebView
          ref={pdfRef}
          fileUrl={fileUrl}
          title={title}
          style={styles.flex}
          onBusyChange={onPreviewBusyChange}
          hidePageBar={hidePdfPageBar}
          onPageStateChange={onPdfPageStateChange}
        />
      </View>
    );
  }

  if (previewUri && kind === 'drive') {
    return (
      <WebView
        source={{ uri: previewUri, headers: webHeaders }}
        style={styles.flex}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        startInLoadingState
        onShouldStartLoadWithRequest={(request) => {
          if (request.navigationType !== 'click') return true;
          const url = request.url || '';
          return (
            url.includes('drive.google.com') ||
            url.includes('docs.google.com') ||
            url.startsWith('about:')
          );
        }}
        renderLoading={() => (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        )}
      />
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.unavailableText}>
        {contentType
          ? `Preview is not available for ${contentType} files on this device.`
          : 'Preview is not available for this file type.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  pdfShell: { backgroundColor: '#525659', width: '100%', alignSelf: 'stretch' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  unavailableText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});
