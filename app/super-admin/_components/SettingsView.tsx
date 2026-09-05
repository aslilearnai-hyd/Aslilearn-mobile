import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchCurrentUser } from '../../../src/lib/vidya-admin';
import { GlassPanel } from '../../../src/components/ui';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import api, { API_BASE_URL } from '../../../src/services/api/api';
import type { SuperAdminView } from './SuperAdminNavDrawer';

const VIDYA_PREFS_KEY = 'superAdminVidyaPrefs';

type ExplainDepth = 'concise' | 'balanced' | 'detailed';

type SettingsViewProps = {
  onNavigate: (view: SuperAdminView) => void;
};

const QUICK_LINKS: { view: SuperAdminView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { view: 'vidya-ai', label: 'Vidya AI Preferences', icon: 'sparkles-outline' },
  { view: 'calendar', label: 'School Calendar', icon: 'calendar-outline' },
  { view: 'exams', label: 'Exam Management', icon: 'document-text-outline' },
  { view: 'admins', label: 'School Management', icon: 'shield-outline' },
  { view: 'subjects-and-content', label: 'Subject & Content', icon: 'list-outline' },
  { view: 'edu-ott-live', label: 'Edu OTT Live', icon: 'radio-outline' },
  { view: 'analytics', label: 'Analytics', icon: 'stats-chart-outline' },
  { view: 'subscriptions', label: 'Subscriptions', icon: 'card-outline' },
];

const DEPTH_OPTIONS: { value: ExplainDepth; label: string }[] = [
  { value: 'concise', label: 'Concise — Short Answers' },
  { value: 'balanced', label: 'Balanced — Recommended' },
  { value: 'detailed', label: 'Detailed — Step-By-Step' },
];

export default function SettingsView({ onNavigate }: SettingsViewProps) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ fullName?: string; email?: string; role?: string } | null>(
    null
  );
  const [explainDepth, setExplainDepth] = useState<ExplainDepth>('balanced');
  const [depthPickerOpen, setDepthPickerOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [user, prefsRaw] = await Promise.all([
        fetchCurrentUser().catch(() => null),
        AsyncStorage.getItem(VIDYA_PREFS_KEY),
      ]);
      setProfile(user);
      if (prefsRaw) {
        const prefs = JSON.parse(prefsRaw) as { explainDepth?: ExplainDepth };
        if (prefs.explainDepth) setExplainDepth(prefs.explainDepth);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveVidyaPrefs = async () => {
    await AsyncStorage.setItem(
      VIDYA_PREFS_KEY,
      JSON.stringify({ explainDepth, updatedAt: Date.now() })
    );
    Alert.alert('Saved', 'Vidya AI display preferences saved on this device.');
  };

  const changePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Missing Fields', 'Enter current, new, and confirm password.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      Alert.alert('Too Short', 'New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Mismatch', 'New password and confirmation must match.');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await api.post('/api/super-admin/change-password', passwordForm);
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to Change Password');
      }
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Alert.alert('Password Updated', 'Your super admin password was changed successfully.');
    } catch (err: any) {
      Alert.alert(
        'Could Not Update Password',
        err?.response?.data?.message || err?.message || 'Try Again',
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const depthLabel = DEPTH_OPTIONS.find((o) => o.value === explainDepth)?.label || 'Balanced';

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Settings</Text>
        <Text style={styles.headerSubtitle}>
          Account security, Vidya preferences, and shortcuts. Secrets stay on the server.
        </Text>
      </View>

      <GlassPanel style={styles.profileCard} radius={10} tone="medium">
        <View style={styles.profileCardInner}>
        <View style={styles.profileAvatar}>
          <Ionicons name="person" size={22} color="#f97316" />
        </View>
        <View style={styles.profileText}>
          <Text style={styles.profileName}>{profile?.fullName || profile?.email || 'Super Admin'}</Text>
          <Text style={styles.profileEmail}>{profile?.email || '—'}</Text>
            {profile?.role ? <Text style={styles.profileRole}>{profile.role}</Text> : null}
        </View>
        </View>
      </GlassPanel>

      <GlassPanel style={styles.section} radius={10} tone="medium">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionTitle}>Vidya AI Preferences</Text>
          <Text style={styles.sectionHint}>
            Model choice and API credentials are configured on the server. Set tutor display preferences here.
          </Text>
          <Pressable style={styles.pickerRow} onPress={() => setDepthPickerOpen(true)}>
            <Text style={styles.pickerLabel}>Default Explanation Depth</Text>
            <Text style={styles.pickerValue}>{depthLabel}</Text>
          </Pressable>
          <TouchableOpacity style={styles.saveButton} onPress={saveVidyaPrefs}>
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          </TouchableOpacity>
        </View>
      </GlassPanel>

      <GlassPanel style={styles.section} radius={10} tone="medium">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionTitle}>Change Password</Text>
          <Text style={styles.sectionHint}>Update the password for your logged-in super admin account.</Text>
          <Text style={styles.fieldLabel}>Current Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={passwordForm.currentPassword}
            onChangeText={(currentPassword) => setPasswordForm((p) => ({ ...p, currentPassword }))}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.fieldLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={passwordForm.newPassword}
            onChangeText={(newPassword) => setPasswordForm((p) => ({ ...p, newPassword }))}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.fieldHint}>At Least 8 Characters</Text>
          <Text style={styles.fieldLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={passwordForm.confirmPassword}
            onChangeText={(confirmPassword) => setPasswordForm((p) => ({ ...p, confirmPassword }))}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.saveButton, changingPassword && styles.saveButtonDisabled]}
            onPress={changePassword}
            disabled={changingPassword}
          >
            {changingPassword ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </GlassPanel>

      <GlassPanel style={styles.section} radius={10} tone="medium">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionTitle}>Platform Configuration</Text>
          <Text style={styles.sectionHint}>
            AI keys, JWT secrets, and database URLs are set in the backend .env — not editable here.
          </Text>
          <Text style={styles.fieldLabel}>API Base</Text>
          <Text style={styles.apiBase}>{API_BASE_URL || '—'}</Text>
        </View>
      </GlassPanel>

      <GlassPanel style={styles.section} radius={10} tone="medium">
        <View style={styles.sectionInner}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.linksGrid}>
            {QUICK_LINKS.map((link) => (
              <TouchableOpacity
                key={link.view}
                style={styles.linkButton}
                onPress={() => onNavigate(link.view)}
              >
                <Ionicons name={link.icon} size={18} color="#374151" />
                <View style={styles.linkButtonTextWrap}>
                  <Text style={styles.linkButtonText}>{link.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </GlassPanel>

      <Text style={styles.envNote}>
        Appearance stays light-only for consistent school demos. Dark mode is not enabled yet.
      </Text>

      <Modal visible={depthPickerOpen} transparent animationType="slide" onRequestClose={() => setDepthPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Explanation Depth</Text>
            {DEPTH_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={styles.modalItem}
                onPress={() => {
                  setExplainDepth(opt.value);
                  setDepthPickerOpen(false);
                }}
              >
                <Text style={styles.modalItemText}>{opt.label}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.modalClose} onPress={() => setDepthPickerOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 6 },
  headerSubtitle: { fontSize: 14, color: '#6b7280', lineHeight: 20 },
  profileCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  // Row layout and padding move inside the frosted panel.
  profileCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,247,237,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  profileEmail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  profileRole: { fontSize: 11, color: '#f97316', fontWeight: '600', marginTop: 4, textTransform: 'capitalize' },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  // Padding moves inside the frosted panel.
  sectionInner: {
    padding: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  sectionHint: { fontSize: 12, color: '#6b7280', lineHeight: 18, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginTop: 10 },
  fieldHint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  apiBase: { fontSize: 12, fontFamily: 'monospace', color: '#111827', lineHeight: 18 },
  pickerRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  pickerValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  saveButton: {
    marginTop: 12,
    backgroundColor: '#fb923c',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  linksGrid: { gap: 8 },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  linkButtonTextWrap: { flex: 1, minWidth: 0 },
  linkButtonText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  envNote: {
    fontSize: 12,
    color: '#5B6779',
    lineHeight: 18,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalItemText: { fontSize: 15, color: '#111827' },
  modalClose: { marginTop: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8 },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
