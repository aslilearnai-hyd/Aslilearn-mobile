import { storageGetItem } from '../../lib/safe-storage';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../lib/api-config';
import { TEACHER, TEACHER_SPACING, glassCard } from '../../theme/teacher';

type Photo = {
  _id: string;
  label: string;
  imageUrl: string;
  updatedAt?: string | null;
};

function resolveUrl(imageUrl?: string): string {
  const raw = String(imageUrl || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
}

/** Teacher personal timetable — one photo, no class link. */
export default function TimetableView({ scrollable = true }: { scrollable?: boolean }) {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [pendingAsset, setPendingAsset] = useState<{
    uri: string;
    name: string;
    mimeType?: string;
  } | null>(null);

  const authHeaders = useCallback(async () => {
    const token = await storageGetItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await authHeaders();
      const res = await fetch(`${API_BASE_URL}/api/timetable/my-photo`, {
        headers: { ...headers },
      });
      const json = await res.json();
      setPhoto(json?.data || null);
    } catch {
      setPhoto(null);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickPhoto = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPendingAsset({
        uri: asset.uri,
        name: asset.name || 'timetable.jpg',
        mimeType: asset.mimeType || 'image/jpeg',
      });
      setPreviewUri(asset.uri);
    } catch {
      Alert.alert('Pick Failed', 'Could not open the photo picker.');
    }
  };

  const clearPending = () => {
    setPendingAsset(null);
    setPreviewUri(null);
  };

  const savePhoto = async () => {
    if (!pendingAsset) {
      Alert.alert('Choose A Photo', 'Pick a timetable image first.');
      return;
    }
    try {
      setUploading(true);
      const headers = await authHeaders();
      const form = new FormData();
      form.append('image', {
        uri: pendingAsset.uri,
        name: pendingAsset.name,
        type: pendingAsset.mimeType || 'image/jpeg',
      } as any);
      const res = await fetch(`${API_BASE_URL}/api/timetable/my-photo`, {
        method: 'POST',
        headers: { ...headers },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Upload Failed');
      Alert.alert('Saved', json?.message || 'Timetable Photo Saved');
      setPendingAsset(null);
      setPreviewUri(null);
      await load();
    } catch (error: any) {
      Alert.alert('Upload Failed', error?.message || 'Could Not Save Photo');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    Alert.alert('Remove timetable photo?', 'This will delete your saved timetable image.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setUploading(true);
              const headers = await authHeaders();
              const res = await fetch(`${API_BASE_URL}/api/timetable/my-photo`, {
                method: 'DELETE',
                headers: { ...headers },
              });
              const json = await res.json();
              if (!res.ok) throw new Error(json?.message || 'Delete failed');
              setPhoto(null);
              clearPending();
              Alert.alert('Removed', 'Timetable photo removed.');
            } catch (error: any) {
              Alert.alert('Delete failed', error?.message || 'Could not remove photo.');
            } finally {
              setUploading(false);
            }
          })();
        },
      },
    ]);
  };

  const handleRemovePress = () => {
    if (pendingAsset) {
      clearPending();
      return;
    }
    if (photo) {
      void removePhoto();
    }
  };

  const displayUri = previewUri || (photo ? resolveUrl(photo.imageUrl) : '');

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={TEACHER.primary} />
      </View>
    );
  }

  const body = (
      <View style={[glassCard, styles.card]}>
        <Text style={styles.title}>My Timetable</Text>
        <Text style={styles.sub}>Upload one timetable photo for yourself — no class needed.</Text>

        <View style={styles.actions}>
          <Pressable style={styles.btnOutline} onPress={() => void pickPhoto()}>
            <Ionicons name="image-outline" size={18} color="#0369a1" />
            <Text style={styles.btnOutlineText}>Choose Photo</Text>
          </Pressable>
          <Pressable
            style={[styles.btnPrimary, (!pendingAsset || uploading) && styles.btnDisabled]}
            disabled={!pendingAsset || uploading}
            onPress={() => void savePhoto()}
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
            <Text style={styles.btnPrimaryText}>{uploading ? 'Saving…' : 'Save'}</Text>
          </Pressable>
          {displayUri ? (
            <Pressable
              style={[styles.btnDangerCompact, uploading && styles.btnDisabled]}
              disabled={uploading}
              onPress={handleRemovePress}
              accessibilityRole="button"
              accessibilityLabel={pendingAsset ? 'Cancel selected photo' : 'Remove saved timetable photo'}
            >
              <Ionicons name="trash-outline" size={18} color="#e11d48" />
            </Pressable>
          ) : null}
        </View>

        {displayUri ? (
          <View>
            <View style={styles.previewWrap}>
              <Image source={{ uri: displayUri }} style={styles.preview} resizeMode="contain" />
              <Pressable
                style={styles.previewRemoveBtn}
                onPress={handleRemovePress}
                disabled={uploading}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={pendingAsset ? 'Cancel selected photo' : 'Remove saved timetable photo'}
              >
                <Ionicons name="close-circle" size={28} color="#e11d48" />
              </Pressable>
            </View>
            {pendingAsset ? (
              <Text style={styles.previewHint}>Preview — tap Save to keep, or Remove to cancel</Text>
            ) : (
              <Pressable
                style={[styles.btnDanger, uploading && styles.btnDisabled]}
                disabled={uploading}
                onPress={handleRemovePress}
              >
                <Ionicons name="trash-outline" size={16} color="#e11d48" />
                <Text style={styles.btnDangerText}>Remove Photo</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable style={styles.drop} onPress={() => void pickPhoto()}>
            <Ionicons name="camera-outline" size={28} color="#38bdf8" />
            <Text style={styles.dropTitle}>Upload Your Timetable Photo</Text>
          </Pressable>
        )}

      </View>
  );

  if (!scrollable) {
    return <View style={styles.content}>{body}</View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {body}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: TEACHER_SPACING.md, paddingBottom: 40, gap: 16 },
  card: { padding: 14 },
  title: { fontSize: 18, fontWeight: '700', color: TEACHER.text },
  sub: { marginTop: 4, marginBottom: 12, fontSize: 13, color: TEACHER.textMuted },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  btnOutlineText: { color: '#0369a1', fontWeight: '600' },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: '#0ea5e9',
  },
  btnDisabled: { opacity: 0.5 },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnDangerCompact: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
  },
  previewWrap: { position: 'relative' },
  preview: { width: '100%', height: 300, borderRadius: 12, backgroundColor: '#f8fafc' },
  previewRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14,
  },
  previewHint: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
    textAlign: 'center',
  },
  drop: {
    minHeight: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#7dd3fc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
  },
  dropTitle: { fontSize: 14, fontWeight: '600', color: '#334155' },
  btnDanger: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
  },
  btnDangerText: { color: '#e11d48', fontWeight: '700', fontSize: 13 },
});
