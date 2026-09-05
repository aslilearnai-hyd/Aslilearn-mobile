import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import adminService from '../../src/services/api/adminService';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { ErrorState, GlassPanel, LoadingState } from '../../src/components/ui';
import { AdminScalePressable, AdminSectionHeader, AdminSkeletonStats, useAdminTheme } from './_ui';

export default function SchoolSettings() {
  const { colors, spacing, radius } = useAdminTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    schoolName: '',
    board: '',
    workingHours: '',
  });

  useBackNavigation('/admin/dashboard', false);

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await adminService.getSchoolSettings();
      const s = data?.settings || data?.data || data;
      setForm({
        schoolName: s?.schoolName || s?.name || '',
        board: s?.board || s?.curriculum || '',
        workingHours: s?.workingHours || '',
      });
    } catch (e: any) {
      setError(e?.message || 'Could not load school settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await adminService.updateSchoolSettings(form);
      Alert.alert('Saved', 'School settings updated successfully.');
    } catch (e: any) {
      setError(e?.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { key: 'schoolName' as const, label: 'School Name', icon: 'business-outline' as const, placeholder: 'Enter school name' },
    { key: 'board' as const, label: 'Board / Curriculum', icon: 'book-outline' as const, placeholder: 'e.g. CBSE, ICSE' },
    { key: 'workingHours' as const, label: 'Working Hours', icon: 'time-outline' as const, placeholder: 'e.g. 8:00 AM – 3:00 PM' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GlassPanel style={[styles.header, { borderBottomColor: colors.surfaceBorder }]} radius={0} bordered={false} tone="strong">
        <View style={styles.headerInner}>
          <AdminScalePressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.bgElevated, borderRadius: radius.full }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </AdminScalePressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>School Settings</Text>
          <View style={styles.backBtn} />
        </View>
      </GlassPanel>

      {loading ? (
        <AdminSkeletonStats />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { padding: spacing.lg }]}>
          {error ? <ErrorState message={error} onRetry={load} /> : null}

          <AdminSectionHeader
            title="General Settings"
            subtitle="Configure your school profile"
            icon="settings-outline"
          />

          {fields.map((field) => (
            <View key={field.key} style={styles.field}>
              <View style={styles.labelRow}>
                <Ionicons name={field.icon} size={16} color={colors.primary} />
                <Text style={[styles.label, { color: colors.textSecondary }]}>{field.label}</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                    borderRadius: radius.md,
                  },
                ]}
                value={form[field.key]}
                onChangeText={(v) => setForm((f) => ({ ...f, [field.key]: v }))}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ))}

          <AdminScalePressable onPress={save} disabled={saving} scaleTo={0.98}>
            <LinearGradient
              colors={[...colors.fabGradient]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.saveBtn, { borderRadius: radius.md, opacity: saving ? 0.6 : 1 }]}
            >
              {saving ? (
                <Text style={styles.saveBtnText}>Saving...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Settings</Text>
                </>
              )}
            </LinearGradient>
          </AdminScalePressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the shared app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    borderBottomWidth: 1,
  },
  // Row layout and padding move inside the frosted panel.
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { gap: 20, paddingBottom: 40 },
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
