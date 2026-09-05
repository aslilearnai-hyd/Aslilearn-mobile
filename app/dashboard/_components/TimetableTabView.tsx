import { storageGetItem } from '../../../src/lib/safe-storage';
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { getSchoolBranding } from '../../../src/lib/school-branding';
import { EmptyState, ErrorState, LoadingState } from '../../../src/components/ui';
import { STUDENT } from '../../../src/theme/student';

type PhotoPayload = {
  label?: string;
  imageUrl?: string;
};

export default function TimetableTabView({ user }: { user?: any }) {
  const { width, height } = useWindowDimensions();
  const branding = getSchoolBranding(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<PhotoPayload | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const token = await storageGetItem('authToken');
      if (!token) {
        setError('Please Sign In Again.');
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
        setError('Could Not Load Timetable Photo.');
        return;
      }
      const data = await res.json();
      const next = data?.data || null;
      setPhoto(next);
      setImageUrl(
        next?.imageUrl
          ? `${API_BASE_URL}/api/timetable/photo/file?token=${encodeURIComponent(token)}`
          : ''
      );
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

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <LinearGradient
          colors={['#f0f9ff', '#ffffff', '#f0fdfa']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerIcon}>
            <Ionicons name="calendar" size={22} color="#fff" />
          </View>
          <View style={styles.headerCopy}>
            {branding?.schoolName ? (
              <Text style={styles.schoolName} numberOfLines={1}>
                {branding.schoolName}
              </Text>
            ) : null}
            <Text style={styles.title}>
              Class Timetable
              {photo?.label ? ` · ${photo.label}` : ''}
            </Text>
            <Text style={styles.subtitle}>Photo Uploaded By Your School · Tap To Zoom</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
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
            <Pressable onPress={() => setFullscreen(true)} accessibilityRole="imagebutton">
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
              <Text style={styles.hint}>Tap To View Larger</Text>
            </Pressable>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title="No Timetable Photo"
              subtitle="Ask your school admin or teacher to upload the class timetable photo."
            />
          )}
        </View>
      </View>

      <Modal
        visible={fullscreen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={styles.fullscreen}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle} numberOfLines={1}>
              {photo?.label ? `${photo.label} Timetable` : 'Class Timetable'}
            </Text>
            <Pressable onPress={() => setFullscreen(false)} style={styles.closeBtn} accessibilityLabel="Close">
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
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, minWidth: 0 },
  schoolName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 2,
  },
  title: { fontSize: 18, fontWeight: '800', color: STUDENT.text },
  subtitle: { marginTop: 2, fontSize: 12, color: STUDENT.textMuted },
  body: { padding: 12 },
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
    paddingTop: 48,
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
