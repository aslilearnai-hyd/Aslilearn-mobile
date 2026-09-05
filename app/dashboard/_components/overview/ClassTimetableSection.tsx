import { storageGetItem } from '../../../../src/lib/safe-storage';
import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '../../../../src/lib/api-config';
import { GlassPanel } from '../../../../src/components/ui';
import { STUDENT, STUDENT_RADIUS } from '../../../../src/theme/student';

type PhotoPayload = {
  label?: string;
  imageUrl?: string;
};

function ClassTimetableSectionComponent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState<PhotoPayload | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = await storageGetItem('authToken');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/timetable/photo`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!res.ok) {
          setPhoto(null);
          setImageUrl('');
          return;
        }
        const data = await res.json();
        const next = data?.data || null;
        setPhoto(next);
        setImageUrl(
          next?.imageUrl
            ? `${API_BASE_URL}/api/timetable/photo/file?token=${encodeURIComponent(token)}`
            : '',
        );
      } catch {
        setPhoto(null);
        setImageUrl('');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <View style={styles.wrap}>
      <GlassPanel style={styles.gridCard} radius={STUDENT_RADIUS.card} tone="strong">
        <Text style={styles.title}>
          Class Timetable{photo?.label ? ` · ${photo.label}` : ''}
        </Text>
        {loading ? (
          <ActivityIndicator color={STUDENT.accent} style={{ padding: 24 }} />
        ) : imageUrl ? (
          <Pressable onPress={() => router.push('/student/timetable')} accessibilityRole="button">
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
            <Text style={styles.hint}>Tap To View In App</Text>
          </Pressable>
        ) : (
          <Text style={styles.empty}>
            No timetable photo yet. Ask your school admin or teacher to upload it.
          </Text>
        )}
      </GlassPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8 },
  gridCard: { padding: 12 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: STUDENT.text,
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  hint: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    color: STUDENT.textMuted,
  },
  empty: {
    paddingVertical: 28,
    textAlign: 'center',
    fontSize: 13,
    color: STUDENT.textMuted,
  },
});

export default memo(ClassTimetableSectionComponent);
