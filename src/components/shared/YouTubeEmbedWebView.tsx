import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  extractYouTubeId,
  getYoutubeEmbedWebViewSource,
} from '../../utils/contentPreview';

type Props = {
  videoUrl: string;
  style?: ViewStyle;
  autoplay?: boolean;
};

export default function YouTubeEmbedWebView({ videoUrl, style, autoplay = false }: Props) {
  const source = getYoutubeEmbedWebViewSource(videoUrl, { autoplay });
  const videoId = extractYouTubeId(videoUrl);

  if (!source || !videoId) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>Unable to load this video link.</Text>
      </View>
    );
  }

  return (
    <WebView
      source={source}
      style={[styles.player, style]}
      allowsFullscreenVideo
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
      setSupportMultipleWindows={false}
      androidLayerType="hardware"
      onShouldStartLoadWithRequest={(request) => {
        if (request.navigationType !== 'click') return true;
        const url = request.url || '';
        return /embed|about:blank|youtube-nocookie/i.test(url);
      }}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      renderError={() => (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            Stream could not be loaded. It may be offline or restricted by YouTube.
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  player: {
    flex: 1,
    backgroundColor: '#000',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    padding: 24,
  },
  fallbackText: {
    color: '#d1d5db',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
});
