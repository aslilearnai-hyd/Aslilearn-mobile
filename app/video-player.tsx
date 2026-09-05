import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  BackHandler,
  Animated,
  Easing,
  type LayoutChangeEvent,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Video as ExpoVideo, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { WebView } from 'react-native-webview';
import * as ScreenOrientation from 'expo-screen-orientation';
import api from '../src/services/api/api';
import YouTubeEmbedWebView from '../src/components/shared/YouTubeEmbedWebView';
import { useContentViewerBack } from '../src/hooks/useBackNavigation';
import {
  extractYouTubeId,
  extractVimeoId,
  getAuthHeaders,
  getDrivePreviewUrl,
  getVimeoEmbedUrl,
  isGoogleDriveUrl,
  resolveContentUrl,
  unwrapNestedFileUrl,
} from '../src/utils/contentPreview';
import { getVideoDisplayTitle } from '../src/lib/video-chapter-schedule';

const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';
const BRAND = 'AsliLearn';
const FRAME_BORDER = '#E5E7EB';
const FRAME_ACCENT = '#6366F1';

async function lockLandscapeOrientation(): Promise<void> {
  if (!isNativeMobile) return;
  try {
    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  } catch (error) {
    console.warn('Failed to lock landscape orientation:', error);
  }
}

async function unlockScreenOrientation(): Promise<void> {
  if (!isNativeMobile) return;
  try {
    await ScreenOrientation.unlockAsync();
  } catch (error) {
    console.warn('Failed to unlock screen orientation:', error);
  }
}

function pickParam(v: string | string[] | undefined): string {
  if (v == null) return '';
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' ? s : '';
}

function extractApiList(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.videos)) return obj.videos;
  }
  return [];
}

function findByIdInList(list: unknown, videoId: string) {
  const id = String(videoId);
  return extractApiList(list).find(
    (item: any) => String(item?._id) === id || String(item?.id) === id
  );
}

function resolveDurationSeconds(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 100 ? Math.round(n) : Math.round(n * 60);
}

function pickLibraryMediaUrl(videoData: any): string {
  const raw =
    videoData?.videoUrl ||
    videoData?.fileUrl ||
    (Array.isArray(videoData?.fileUrls) ? videoData.fileUrls[0] : '') ||
    videoData?.driveLink ||
    videoData?.youtubeUrl ||
    '';
  return unwrapNestedFileUrl(String(raw || '').trim());
}

function parseContentPayload(raw: unknown): any | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
  const text = pickParam(raw as string | string[] | undefined);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function transformLibraryVideo(videoData: any) {
  const videoFileUrl = pickLibraryMediaUrl(videoData);
  const youtubeFromFields = String(videoData?.youtubeUrl || '').trim();
  const isYouTube =
    !!videoData.isYouTubeVideo ||
    !!extractYouTubeId(youtubeFromFields || videoFileUrl);

  return {
    _id: videoData._id || videoData.id,
    title: getVideoDisplayTitle({ ...videoData, type: videoData.type || 'Video' }),
    duration: resolveDurationSeconds(videoData.duration),
    videoUrl: videoFileUrl,
    youtubeUrl: youtubeFromFields || (isYouTube ? videoFileUrl : ''),
    isYouTubeVideo: isYouTube,
  };
}

/** Marquee when the heading is wider than the available bar. */
function ScrollingHeading({ text }: { text: string }) {
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const offset = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const needsScroll = textWidth > boxWidth + 4 && boxWidth > 0 && textWidth > 0;

  useEffect(() => {
    loopRef.current?.stop();
    offset.stopAnimation();
    offset.setValue(0);
    if (!needsScroll) return;

    const distance = textWidth - boxWidth + 24;
    const duration = Math.max(4500, Math.round(distance * 36));

    const run = () => {
      offset.setValue(0);
      loopRef.current = Animated.sequence([
        Animated.delay(1000),
        Animated.timing(offset, {
          toValue: -distance,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(1200),
      ]);
      loopRef.current.start(({ finished }) => {
        if (finished) run();
      });
    };
    run();

    return () => {
      loopRef.current?.stop();
    };
  }, [needsScroll, textWidth, boxWidth, offset, text]);

  return (
    <View
      style={styles.headingClip}
      onLayout={(e: LayoutChangeEvent) => {
        const w = Math.floor(e.nativeEvent.layout.width);
        if (w > 0 && w !== boxWidth) setBoxWidth(w);
      }}
    >
      {/* Off-flow measure so we get the natural title width, not the clipped width. */}
      <Text
        style={styles.headingMeasure}
        onLayout={(e: LayoutChangeEvent) => {
          const w = Math.ceil(e.nativeEvent.layout.width);
          if (w > 0 && w !== textWidth) setTextWidth(w);
        }}
      >
        {text}
      </Text>
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.headingText,
          { transform: [{ translateX: needsScroll ? offset : 0 }] },
        ]}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

interface LibraryVideo {
  _id: string;
  title: string;
  duration: number;
  videoUrl?: string;
  youtubeUrl?: string;
  isYouTubeVideo?: boolean;
}

export default function VideoPlayer() {
  const params = useLocalSearchParams<{
    videoId?: string | string[];
    isContentItem?: string;
    contentData?: string;
    returnTo?: string | string[];
  }>();
  const videoId = pickParam(params.videoId);
  const returnTo = pickParam(params.returnTo);
  const isContentItem = pickParam(params.isContentItem);
  const contentData = params.contentData;
  const [video, setVideo] = useState<LibraryVideo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const goBack = useContentViewerBack(returnTo || undefined);
  const [, setIsPlaying] = useState(false);
  const [videoHeaders, setVideoHeaders] = useState<Record<string, string> | undefined>();
  const videoRef = useRef<ExpoVideo>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const handleExit = useCallback(async () => {
    await unlockScreenOrientation();
    if (isNativeMobile) {
      StatusBar.setHidden(false, 'fade');
    }
    await goBack();
  }, [goBack]);

  useEffect(() => {
    void lockLandscapeOrientation();
    if (isNativeMobile) {
      StatusBar.setHidden(true, 'fade');
    }
    return () => {
      void unlockScreenOrientation();
      if (isNativeMobile) {
        StatusBar.setHidden(false, 'fade');
      }
    };
  }, []);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      void handleExit();
      return true;
    });
    return () => backHandler.remove();
  }, [handleExit]);

  useEffect(() => {
    if (isContentItem === 'true' && contentData) {
      const parsedContent = parseContentPayload(contentData);
      if (parsedContent) {
        setVideo(transformLibraryVideo(parsedContent));
        setIsLoading(false);
        if (videoId && videoId !== 'preview') {
          void fetchVideo({ silent: true });
        }
        return;
      }
    }

    if (videoId && videoId !== 'preview') {
      fetchVideo();
      return;
    }

    setIsLoading(false);
  }, [videoId, isContentItem, contentData]);

  const fetchVideo = async (opts?: { silent?: boolean }) => {
    if (!videoId) return;
    try {
      if (!opts?.silent) setIsLoading(true);

      const libraryAttempts: Array<() => Promise<{ data: any }>> = [
        () => api.get('/api/student/asli-prep-content', { params: { type: 'Video' } }),
        () => api.get('/api/student/asli-prep-content', { params: { type: 'Video', surface: 'eduott' } }),
        () => api.get('/api/student/asli-prep-content', { params: { surface: 'learning-path' } }),
        () => api.get('/api/teacher/asli-prep-content', { params: { type: 'Video' } }),
        () => api.get('/api/teacher/asli-prep-content', { params: { type: 'Video', surface: 'eduott' } }),
        () => api.get('/api/teacher/asli-prep-content', { params: { surface: 'learning-path' } }),
        () => api.get('/api/admin/asli-prep-content', { params: { type: 'Video' } }),
        () => api.get('/api/admin/asli-prep-content', { params: { type: 'Video', surface: 'eduott' } }),
        () => api.get('/api/admin/asli-prep-content', { params: { surface: 'learning-path' } }),
        () => api.get('/api/teacher/videos'),
        () => api.get('/api/student/videos'),
      ];

      for (const run of libraryAttempts) {
        try {
          const { data } = await run();
          const match = findByIdInList(data, videoId);
          if (match && pickLibraryMediaUrl(match)) {
            setVideo(transformLibraryVideo(match));
            return;
          }
        } catch {
          // try next source
        }
      }

      console.error('Video not found in any endpoint');
    } catch (error) {
      console.error('Error fetching video:', error);
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  };

  const resolvedVideoUrl = resolveContentUrl(unwrapNestedFileUrl(video?.videoUrl || ''));
  const vimeoId = extractVimeoId(resolvedVideoUrl);
  const isDriveVideo = isGoogleDriveUrl(resolvedVideoUrl);
  const isDirectVideo =
    !!resolvedVideoUrl &&
    !/youtube\.com|youtu\.be/i.test(resolvedVideoUrl) &&
    !isDriveVideo &&
    !vimeoId;

  useEffect(() => {
    if (!isDirectVideo) {
      setVideoHeaders(undefined);
      return;
    }
    getAuthHeaders(resolvedVideoUrl).then(setVideoHeaders);
  }, [isDirectVideo, resolvedVideoUrl]);

  const framePad = useMemo(() => {
    const edge = Math.max(insets.left, insets.right, 8);
    return {
      paddingTop: Math.max(insets.top, 8),
      paddingBottom: Math.max(insets.bottom, 8),
      paddingLeft: edge,
      paddingRight: edge,
    };
  }, [insets.top, insets.bottom, insets.left, insets.right]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.stateTitle}>Loading video…</Text>
        </View>
      </View>
    );
  }

  if (!video) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centeredState}>
          <Ionicons name="videocam-off-outline" size={48} color="#ef4444" />
          <Text style={styles.stateTitle}>Video not found</Text>
          <Text style={styles.stateSub}>This lesson may have been moved or removed.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => void handleExit()} activeOpacity={0.88}>
            <Ionicons name="arrow-back" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const youtubeSourceUrl = (video.youtubeUrl || video.videoUrl || '').trim();
  const youtubeVideoId = extractYouTubeId(youtubeSourceUrl);
  const isYouTube = !!youtubeVideoId;
  const heading = `${BRAND} | ${video.title || 'Video'}`;
  // Keep landscape stage filling the shorter screen edge when unlocked briefly.
  const isLandscape = width > height;

  return (
    <View style={styles.container}>
      <View style={[styles.frameShell, framePad, !isLandscape && styles.frameShellPortraitHint]}>
        <View style={styles.frame}>
          <View style={styles.frameTitleBar}>
            <TouchableOpacity
              onPress={() => void handleExit()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <ScrollingHeading text={heading} />
          </View>

          <View style={styles.stage}>
            {isYouTube && youtubeSourceUrl ? (
              <YouTubeEmbedWebView videoUrl={youtubeSourceUrl} style={styles.video} autoplay />
            ) : vimeoId && getVimeoEmbedUrl(resolvedVideoUrl) ? (
              <WebView
                source={{ uri: getVimeoEmbedUrl(resolvedVideoUrl)! }}
                style={styles.video}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                setSupportMultipleWindows={false}
              />
            ) : isDriveVideo ? (
              <WebView
                source={{ uri: getDrivePreviewUrl(resolvedVideoUrl) }}
                style={styles.video}
                allowsFullscreenVideo
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
                setSupportMultipleWindows={false}
                androidLayerType="hardware"
              />
            ) : isDirectVideo ? (
              <ExpoVideo
                ref={videoRef}
                source={{ uri: resolvedVideoUrl, headers: videoHeaders }}
                style={styles.video}
                useNativeControls
                shouldPlay
                resizeMode={ResizeMode.CONTAIN}
                onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                  if (status.isLoaded) {
                    setIsPlaying(status.isPlaying);
                  }
                }}
              />
            ) : (
              <View style={styles.placeholder}>
                <Ionicons name="videocam-off-outline" size={40} color="#9ca3af" />
                <Text style={styles.placeholderTitle}>Video not available</Text>
                <Text style={styles.placeholderSub}>
                  This stream could not be loaded right now.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  frameShell: {
    flex: 1,
  },
  frameShellPortraitHint: {
    // Orientation lock is landscape; keep layout safe if rotation lags.
  },
  frame: {
    flex: 1,
    borderWidth: 2,
    borderColor: FRAME_BORDER,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  frameTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: FRAME_BORDER,
    backgroundColor: '#111827',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: FRAME_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headingClip: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    minHeight: 22,
  },
  headingMeasure: {
    position: 'absolute',
    opacity: 0,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headingText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: 0.2,
  },
  stage: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 8,
    backgroundColor: '#000',
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
  },
  stateSub: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
  primaryBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
    backgroundColor: '#111827',
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f3f4f6',
  },
  placeholderSub: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});
