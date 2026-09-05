import { storageGetItem } from '../../src/lib/safe-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../src/lib/api-config';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { EmptyState, ErrorState, GlassPanel, LoadingState } from '../../src/components/ui';
import StudentScreenHeader from '../../src/components/student/StudentScreenHeader';
import { useSchoolOnlyGuard } from '../../src/components/b2c/SchoolOnlyGuard';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING } from '../../src/theme/student';

type PhotoPayload = {
  label?: string;
  imageUrl?: string;
};

async function resolveAuthenticatedFileUrl(token: string): Promise<string> {
  return `${API_BASE_URL}/api/timetable/photo/file?token=${encodeURIComponent(token)}`;
}

export default function StudentTimetable() {
  const blocked = useSchoolOnlyGuard();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<PhotoPayload | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  useBackNavigation('/dashboard', false);

  const load = useCallback(async () => {
    try {
      setError('');
      const token = await storageGetItem('authToken');
      if (!token) {
        setError('Please sign in again.');
        setPhoto(null);
        setImageUrl('');
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/timetable/photo`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        setPhoto(null);
        setImageUrl('');
        setError('Could not load timetable photo.');
        return;
      }
      const data = await res.json();
      const next = data?.data || null;
      setPhoto(next);
      setImageUrl(next?.imageUrl ? await resolveAuthenticatedFileUrl(token) : '');
    } catch {
      setError('Could not load timetable photo.');
      setPhoto(null);
      setImageUrl('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (blocked) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StudentScreenHeader
        title={photo?.label ? `Timetable · ${photo.label}` : 'Class Timetable'}
        subtitle="Photo From Your School"
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        maximumZoomScale={3}
        minimumZoomScale={1}
        bouncesZoom
      >
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              setLoading(true);
              void load();
            }}
          />
        ) : imageUrl ? (
          <GlassPanel style={styles.card} radius={STUDENT_RADIUS.card} tone="strong">
            <Pressable onPress={() => setFullscreen(true)} accessibilityRole="imagebutton">
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
              <Text style={styles.hint}>Tap To View Larger · Pinch To Zoom</Text>
            </Pressable>
          </GlassPanel>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No Timetable Photo"
            subtitle="Ask your school admin or teacher to upload the class timetable photo."
          />
        )}
      </ScrollView>

      <Modal
        visible={fullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setFullscreen(false)}
      >
        <SafeAreaView style={styles.fullscreen} edges={['top', 'bottom']}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle} numberOfLines={1}>
              {photo?.label ? `${photo.label} timetable` : 'Class Timetable'}
            </Text>
            <Pressable
              onPress={() => setFullscreen(false)}
              style={styles.closeBtn}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>
          <ScrollView
            style={styles.fullscreenScroll}
            contentContainerStyle={styles.fullscreenContent}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            bouncesZoom
          >
            <Image
              source={{ uri: imageUrl }}
              style={{ width: width - 16, height: Math.max(420, height * 0.75) }}
              resizeMode="contain"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: STUDENT.bg },
  content: { padding: STUDENT_SPACING.md, paddingBottom: 40 },
  card: { padding: 12 },
  image: {
    width: '100%',
    height: 420,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  hint: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: STUDENT.textMuted,
  },
  fullscreen: { flex: 1, backgroundColor: '#0f172a' },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  fullscreenTitle: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenScroll: { flex: 1 },
  fullscreenContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
});
