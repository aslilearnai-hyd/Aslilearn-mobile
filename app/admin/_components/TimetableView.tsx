import { storageGetItem } from '../../../src/lib/safe-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { API_BASE_URL } from '../../../src/lib/api-config';
import {
  AdminScreenShell,
  AdminGlassCard,
  AdminEmptyState,
} from '../_ui';

type ClassOption = { _id: string; classNumber: string; section: string; label?: string };
type Photo = {
  _id: string;
  classId: string;
  label: string;
  imageUrl: string;
  updatedAt?: string;
};

function classLabel(c: ClassOption): string {
  return (
    c.label ||
    `${String(c.classNumber || '').trim()}${String(c.section || '').trim().toUpperCase()}`
  );
}

function resolveUrl(imageUrl?: string): string {
  const raw = String(imageUrl || '').trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
}

export default function TimetableView() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [pendingAsset, setPendingAsset] = useState<{
    uri: string;
    name: string;
    mimeType?: string;
  } | null>(null);

  const selectedClass = useMemo(
    () => classes.find((c) => c._id === selectedClassId) || null,
    [classes, selectedClassId]
  );
  const existing = useMemo(
    () => photos.find((p) => p.classId === selectedClassId) || null,
    [photos, selectedClassId]
  );

  const authHeaders = useCallback(async () => {
    const token = await storageGetItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = await authHeaders();
      const [classRes, photoRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/timetable/photo-classes`, { headers: { ...headers } }),
        fetch(`${API_BASE_URL}/api/timetable/photos`, { headers: { ...headers } }),
      ]);
      const classJson = await classRes.json();
      const photoJson = await photoRes.json();
      const classRows: ClassOption[] = Array.isArray(classJson?.data) ? classJson.data : [];
      const photoRows: Photo[] = Array.isArray(photoJson?.data) ? photoJson.data : [];
      setClasses(classRows);
      setPhotos(photoRows);
      if (!selectedClassId && classRows[0]?._id) setSelectedClassId(String(classRows[0]._id));
    } catch {
      setClasses([]);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, selectedClassId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const savePhoto = async () => {
    if (!selectedClassId || !pendingAsset) {
      Alert.alert('Missing Info', 'Select a class and choose a photo first.');
      return;
    }
    try {
      setUploading(true);
      const headers = await authHeaders();
      const form = new FormData();
      form.append('classId', selectedClassId);
      form.append('image', {
        uri: pendingAsset.uri,
        name: pendingAsset.name,
        type: pendingAsset.mimeType || 'image/jpeg',
      } as any);
      const res = await fetch(`${API_BASE_URL}/api/timetable/photo`, {
        method: 'POST',
        headers: { ...headers },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Upload failed');
      Alert.alert('Saved', json?.message || 'Timetable photo saved');
      setPendingAsset(null);
      setPreviewUri(null);
      await load();
    } catch (error: any) {
      Alert.alert('Upload Failed', error?.message || 'Could not save photo');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!selectedClassId || !existing) return;
    try {
      const headers = await authHeaders();
      const res = await fetch(
        `${API_BASE_URL}/api/timetable/photo?classId=${encodeURIComponent(selectedClassId)}`,
        { method: 'DELETE', headers: { ...headers } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Delete failed');
      Alert.alert('Removed', 'Timetable photo removed');
      await load();
    } catch (error: any) {
      Alert.alert('Delete Failed', error?.message || 'Could not remove photo');
    }
  };

  const displayUri = previewUri || (existing ? resolveUrl(existing.imageUrl) : '');

  return (
    <AdminScreenShell>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#0ea5e9" />
      ) : (
        <View style={styles.content}>
          <Text style={styles.pageTitle}>Timetable Photos</Text>
          <Text style={styles.pageSub}>
            Upload One Photo Per Class &amp; Section (e.g. 6A)
          </Text>
          <AdminGlassCard>
            <Text style={styles.label}>Class &amp; Section</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {classes.map((c) => {
                const active = c._id === selectedClassId;
                return (
                  <Pressable
                    key={c._id}
                    onPress={() => {
                      setSelectedClassId(c._id);
                      setPendingAsset(null);
                      setPreviewUri(null);
                    }}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {classLabel(c)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {classes.length === 0 ? (
              <AdminEmptyState title="No Classes" message="Create classes first, then upload photos." />
            ) : (
              <>
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
                </View>

                {displayUri ? (
                  <Image source={{ uri: displayUri }} style={styles.preview} resizeMode="contain" />
                ) : (
                  <Pressable style={styles.drop} onPress={() => void pickPhoto()}>
                    <Ionicons name="camera-outline" size={28} color="#38bdf8" />
                    <Text style={styles.dropTitle}>
                      {selectedClass
                        ? `Upload ${classLabel(selectedClass)} Timetable`
                        : 'Select a class'}
                    </Text>
                  </Pressable>
                )}

                {existing && !pendingAsset ? (
                  <Pressable style={styles.removeBtn} onPress={() => void removePhoto()}>
                    <Ionicons name="trash-outline" size={16} color="#e11d48" />
                    <Text style={styles.removeText}>Remove Photo</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </AdminGlassCard>

          <Text style={styles.sectionTitle}>Uploaded</Text>
          {photos.length === 0 ? (
            <Text style={styles.muted}>No photos yet.</Text>
          ) : (
            <View style={styles.grid}>
              {photos.map((p) => (
                <Pressable
                  key={p._id}
                  style={styles.thumb}
                  onPress={() => setSelectedClassId(p.classId)}
                >
                  <Image source={{ uri: resolveUrl(p.imageUrl) }} style={styles.thumbImg} />
                  <Text style={styles.thumbLabel}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </AdminScreenShell>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24, gap: 16 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  pageSub: { fontSize: 13, color: '#64748b', marginTop: -8 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  chipRow: { marginBottom: 12 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  chipActive: { backgroundColor: '#e0f2fe' },
  chipText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#0369a1' },
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
  preview: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  drop: {
    minHeight: 180,
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
  removeBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  removeText: { color: '#e11d48', fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  muted: { color: '#64748b', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: {
    width: '47%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  thumbImg: { width: '100%', height: 100, backgroundColor: '#f8fafc' },
  thumbLabel: { padding: 8, fontWeight: '700', color: '#0f172a' },
});
