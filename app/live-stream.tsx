import { storageGetItem } from '../src/lib/safe-storage';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import * as ScreenOrientation from 'expo-screen-orientation';
import { API_BASE_URL } from '../src/lib/api-config';
import { useContentViewerBack } from '../src/hooks/useBackNavigation';
import YouTubeEmbedWebView from '../src/components/shared/YouTubeEmbedWebView';
import { extractYouTubeId } from '../src/utils/contentPreview';
import { resolveLiveSessionEmbedUrl } from '../src/utils/liveSessionPlayback';

const { height } = Dimensions.get('window');
const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';

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

interface LiveSession {
  _id: string;
  title: string;
  description?: string;
  playbackUrl?: string;
  hlsUrl?: string;
  youtubeUrl?: string;
  youtubeEmbedUrl?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  viewerCount?: number;
  scheduledTime?: string;
  scheduledStartTime?: string;
}

export default function LiveStream() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<LiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImmersive, setIsImmersive] = useState(false);
  const joinedRef = useRef(false);
  const goBack = useContentViewerBack('eduott');

  const enterImmersive = useCallback(async () => {
    setIsImmersive(true);
    await lockLandscapeOrientation();
    if (isNativeMobile) {
      StatusBar.setHidden(true, 'fade');
    }
  }, []);

  const exitImmersive = useCallback(async () => {
    setIsImmersive(false);
    await unlockScreenOrientation();
    if (isNativeMobile) {
      StatusBar.setHidden(false, 'fade');
    }
  }, []);

  useEffect(() => {
    return () => {
      void unlockScreenOrientation();
      if (isNativeMobile) {
        StatusBar.setHidden(false, 'fade');
      }
    };
  }, []);

  useEffect(() => {
    if (!isImmersive) return undefined;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      void exitImmersive();
      return true;
    });
    return () => backHandler.remove();
  }, [isImmersive, exitImmersive]);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const logJoin = async (id: string) => {
    if (joinedRef.current) return;
    joinedRef.current = true;
    try {
      const token = await storageGetItem('authToken');
      await fetch(`${API_BASE_URL}/api/streams/${id}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Failed to log live session join:', error);
      joinedRef.current = false;
    }
  };

  const fetchSession = async () => {
    try {
      setIsLoading(true);
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/streams/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const stream = data.data || data;
        const normalized: LiveSession = {
          ...stream,
          title: stream.title || stream.name || 'Live Session',
          hlsUrl: stream.hlsUrl || stream.playbackUrl,
          playbackUrl: stream.playbackUrl || stream.streamUrl,
          youtubeEmbedUrl: stream.youtubeEmbedUrl,
          youtubeUrl: stream.youtubeUrl,
        };
        setSession(normalized);
        if (['live', 'scheduled'].includes(normalized.status)) {
          await logJoin(normalized._id);
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading stream...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Stream not found</Text>
          <TouchableOpacity style={styles.errorBackButton} onPress={goBack}>
            <Text style={styles.errorBackButtonText}>Back to Edu OTT</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const embedUrl = resolveLiveSessionEmbedUrl(session);
  const youtubeId = embedUrl ? extractYouTubeId(embedUrl) : null;
  const streamUrl = session.hlsUrl || session.playbackUrl;
  const isLive = session.status === 'live' || session.status === 'scheduled';
  const canPlayYoutube = isLive && !!youtubeId && !!embedUrl;
  const canPlayNative = isLive && !!streamUrl && !youtubeId;

  return (
    <SafeAreaView style={styles.container} edges={isImmersive ? [] : ['top']}>
      {!isImmersive ? (
        <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={goBack} style={styles.headerBackButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <View style={styles.liveIndicator}>
                {session.status === 'live' ? (
                  <>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </>
                ) : (
                  <Text style={styles.liveText}>SCHEDULED</Text>
                )}
              </View>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {session.title}
              </Text>
              <Text style={styles.viewerCountText}>Watching inside AsliLearn</Text>
            </View>
            {(canPlayYoutube || canPlayNative) ? (
              <TouchableOpacity
                onPress={() => void enterImmersive()}
                style={styles.headerFullscreenButton}
                accessibilityLabel="Enter fullscreen"
              >
                <Ionicons name="expand" size={22} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>
        </LinearGradient>
      ) : null}

      <View style={[styles.content, isImmersive && styles.contentImmersive]}>
        <View style={[styles.videoContainer, isImmersive && styles.videoContainerImmersive]}>
          {canPlayYoutube && embedUrl ? (
            <YouTubeEmbedWebView videoUrl={embedUrl} style={styles.video} autoplay />
          ) : canPlayNative ? (
            <Video
              source={{ uri: streamUrl }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Ionicons name="videocam-off" size={64} color="#9ca3af" />
              <Text style={styles.placeholderText}>
                {session.status === 'scheduled'
                  ? `Stream starts at ${
                      session.scheduledTime || session.scheduledStartTime
                        ? new Date(session.scheduledTime || session.scheduledStartTime || '').toLocaleString()
                        : 'TBD'
                    }`
                  : 'Stream not available. Make sure the YouTube broadcast is live.'}
              </Text>
            </View>
          )}
          {isImmersive ? (
            <View style={styles.immersiveControls}>
              <TouchableOpacity
                onPress={() => void exitImmersive()}
                style={styles.immersiveExitButton}
                accessibilityLabel="Exit fullscreen"
              >
                <Ionicons name="contract" size={20} color="#fff" />
                <Text style={styles.immersiveExitText}>Exit fullscreen</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {!isImmersive && session.description ? (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>About this session</Text>
            <Text style={styles.descriptionText}>{session.description}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 24,
  },
  errorBackButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorBackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBackButton: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerFullscreenButton: {
    padding: 8,
    marginLeft: 4,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  viewerCountText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
  },
  contentImmersive: {
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    height: height * 0.42,
    backgroundColor: '#000',
  },
  videoContainerImmersive: {
    flex: 1,
    height: undefined,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 32,
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  descriptionContainer: {
    padding: 16,
    backgroundColor: '#111827',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#d1d5db',
    lineHeight: 20,
  },
  immersiveControls: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    zIndex: 10,
  },
  immersiveExitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  immersiveExitText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
