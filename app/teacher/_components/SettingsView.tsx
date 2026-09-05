import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import teacherService from '../../../src/services/api/teacherService';
import { GlassPanel } from '../../../src/components/ui';
import { TeacherShimmer } from '../../../src/components/teacher';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, TEACHER_TYPO } from '../../../src/theme/teacher';

type Profile = {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  qualifications: string;
  schoolName: string;
};

const emptyProfile: Profile = {
  fullName: '',
  email: '',
  phone: '',
  department: '',
  qualifications: '',
  schoolName: '',
};

export default function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teacherService.teacherProfile();
      const data = res.data?.fullName ? res.data : res.data?.user || res.data || {};
      setProfile({
        fullName: String(data.fullName || ''),
        email: String(data.email || ''),
        phone: String(data.phone || ''),
        department: String(data.department || ''),
        qualifications: String(data.qualifications || ''),
        schoolName: String(data.schoolName || ''),
      });
    } catch {
      setProfile(emptyProfile);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const saveDetails = async () => {
    setSaving(true);
    try {
      await teacherService.updateProfile({
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
        department: profile.department.trim(),
        qualifications: profile.qualifications.trim(),
      });
      Alert.alert('Saved', 'Your teacher details were saved.');
    } catch (error: any) {
      Alert.alert('Update failed', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Passwords do not match', 'New password and confirmation must be the same.');
      return;
    }
    setChangingPassword(true);
    try {
      await teacherService.changePassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      Alert.alert('Password updated', 'Use your new password the next time you sign in.');
    } catch (error: any) {
      Alert.alert('Password change failed', error?.message || 'Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <TeacherShimmer variant="card" count={2} />;
  }

  return (
    <View style={styles.root}>
      <GlassPanel style={styles.card} radius={TEACHER_RADIUS.lg} tone="medium">
        <View style={styles.cardHead}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-outline" size={18} color={TEACHER.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Teacher details</Text>
            <Text style={styles.sub}>Update your name, phone, and classroom info.</Text>
          </View>
        </View>
        {profile.schoolName ? (
          <Text style={styles.school}>{profile.schoolName}</Text>
        ) : null}
        <Field
          label="Full name"
          value={profile.fullName}
          onChangeText={(fullName) => setProfile((prev) => ({ ...prev, fullName }))}
        />
        <Field label="Email" value={profile.email} editable={false} />
        <Field
          label="Phone"
          value={profile.phone}
          onChangeText={(phone) => setProfile((prev) => ({ ...prev, phone }))}
          keyboardType="phone-pad"
        />
        <Field
          label="Department"
          value={profile.department}
          onChangeText={(department) => setProfile((prev) => ({ ...prev, department }))}
        />
        <Field
          label="Qualifications"
          value={profile.qualifications}
          onChangeText={(qualifications) => setProfile((prev) => ({ ...prev, qualifications }))}
          multiline
        />
        <Pressable style={styles.primaryBtn} onPress={() => void saveDetails()} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Save details</Text>
          )}
        </Pressable>
      </GlassPanel>

      <GlassPanel style={styles.card} radius={TEACHER_RADIUS.lg} tone="medium">
        <View style={styles.cardHead}>
          <View style={styles.iconWrap}>
            <Ionicons name="key-outline" size={18} color={TEACHER.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Password</Text>
            <Text style={styles.sub}>Reset your password for this teacher account.</Text>
          </View>
        </View>
        <Field
          label="Current password"
          value={passwordForm.currentPassword}
          onChangeText={(currentPassword) => setPasswordForm((prev) => ({ ...prev, currentPassword }))}
          secureTextEntry
        />
        <Field
          label="New password"
          value={passwordForm.newPassword}
          onChangeText={(newPassword) => setPasswordForm((prev) => ({ ...prev, newPassword }))}
          secureTextEntry
        />
        <Field
          label="Confirm new password"
          value={passwordForm.confirmPassword}
          onChangeText={(confirmPassword) => setPasswordForm((prev) => ({ ...prev, confirmPassword }))}
          secureTextEntry
        />
        <Pressable
          style={styles.primaryBtn}
          onPress={() => void changePassword()}
          disabled={changingPassword}
        >
          {changingPassword ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Update password</Text>
          )}
        </Pressable>
      </GlassPanel>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  editable = true,
  secureTextEntry,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText?: (text: string) => void;
  editable?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'phone-pad';
  multiline?: boolean;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, multiline && styles.inputRowMultiline, !editable && styles.inputDisabled]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline, !editable && styles.inputTextDisabled]}
          value={value}
          onChangeText={onChangeText}
          editable={editable}
          secureTextEntry={isPassword && !passwordVisible}
          keyboardType={keyboardType}
          multiline={multiline}
          autoCapitalize={isPassword ? 'none' : 'sentences'}
          autoCorrect={false}
          placeholderTextColor={TEACHER.textMuted}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setPasswordVisible((prev) => !prev)}
            style={styles.eyeBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={passwordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={TEACHER.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: TEACHER_SPACING.lg },
  card: { padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...TEACHER_TYPO.section, fontSize: 18, color: TEACHER.text },
  sub: { marginTop: 2, fontSize: 12, fontWeight: '600', color: TEACHER.textMuted },
  school: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '700',
    color: TEACHER.primaryDark,
  },
  field: { marginBottom: 12 },
  fieldLabel: { marginBottom: 6, fontSize: 12, fontWeight: '800', color: TEACHER.textSecondary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingRight: 4,
  },
  inputRowMultiline: { alignItems: 'flex-start' },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: TEACHER.text,
  },
  eyeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputDisabled: { backgroundColor: '#F8FAFC' },
  inputTextDisabled: { color: TEACHER.textMuted },
  primaryBtn: {
    marginTop: 4,
    backgroundColor: TEACHER.primaryDark,
    borderRadius: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
