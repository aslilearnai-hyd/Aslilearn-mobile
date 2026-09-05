import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  type TextInputProps,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { GlassPanel } from '../../src/components/ui';
import AppBackground from '../../src/components/ui/AppBackground';
import authService from '../../src/services/api/authService';
import { API_BASE_URL } from '../../src/services/api/api';
import {
  CURRICULUM_BOARD_OPTIONS,
  INDIVIDUAL_CLASS_OPTIONS,
  INDIVIDUAL_COURSE_OPTIONS,
  INDIVIDUAL_SUBJECT_OPTIONS,
  INDIVIDUAL_TRIAL_DAYS,
  IIT_CATEGORY_FALLBACK,
  formatIitCategoryLabel,
} from '../../src/lib/individual-signup';

type RoleType = 'student' | 'teacher';

const ACCENT = '#4F46E5';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as RoleType,
    schoolName: '',
    phone: '',
    classNumber: '',
    curriculumBoard: 'CBSE',
    interestedCourses: [] as string[],
    interestedSubjects: [] as string[],
    iitCategories: [] as string[],
  });
  const [iitCodes, setIitCodes] = useState<string[]>([...IIT_CATEGORY_FALLBACK]);
  const [iitLabelMap, setIitLabelMap] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/product-categories`);
        const json = await res.json();
        if (!res.ok || !json.success || cancelled) return;
        const rows = Array.isArray(json.data) ? json.data : [];
        const active = rows.filter((r: { isActive?: boolean }) => r.isActive !== false);
        if (active.length) {
          setIitCodes(active.map((r: { code: string }) => r.code));
          setIitLabelMap(
            Object.fromEntries(
              rows.map((r: { code: string; label?: string }) => [
                r.code,
                r.label || formatIitCategoryLabel(r.code),
              ]),
            ),
          );
        }
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleInList = useCallback(
    (key: 'interestedCourses' | 'interestedSubjects' | 'iitCategories', value: string) => {
      setFormData((prev) => {
        const list = prev[key];
        const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
        return { ...prev, [key]: next };
      });
    },
    [],
  );

  const handleSubmit = async () => {
    setError('');

    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (!formData.schoolName.trim()) {
      setError('School name is required');
      return;
    }
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    if (formData.role === 'student' && !formData.classNumber) {
      setError('Please select your class');
      return;
    }
    if (formData.interestedCourses.length === 0) {
      setError('Select at least one course you are interested in');
      return;
    }
    if (formData.interestedSubjects.length === 0) {
      setError('Select at least one subject');
      return;
    }

    setIsLoading(true);
    try {
      const data = await authService.register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        schoolName: formData.schoolName.trim(),
        phone: phoneDigits,
        classNumber: formData.classNumber,
        curriculumBoard: formData.curriculumBoard,
        interestedCourses: formData.interestedCourses,
        interestedSubjects: formData.interestedSubjects,
        iitCategories: formData.iitCategories,
        accountSource: 'mobile_register',
      });
      setSuccessMessage(
        data?.message ||
          `Account created. Your ${INDIVIDUAL_TRIAL_DAYS}-day free trial has started.`,
      );
      setSuccess(true);
      setTimeout(() => router.replace('/auth/login'), 2500);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.friendlyMessage ||
        err?.message ||
        'Registration failed. Please try again.';
      setError(String(msg));
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/auth/login');
  }, [router]);

  if (success) {
    return (
      <AppBackground>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <StatusBar style="dark" />
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color="#059669" />
            </View>
            <Text style={styles.successTitle}>Account created</Text>
            <Text style={styles.successText}>{successMessage}</Text>
            <Text style={styles.successHint}>
              After {INDIVIDUAL_TRIAL_DAYS} days you will be asked to subscribe to continue.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => router.replace('/auth/login')}
            >
              <Text style={styles.successButtonText}>Go to Sign In</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={goToLogin}
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>

          <GlassPanel style={styles.card} radius={24} tone="strong">
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="sparkles" size={28} color="#fff" />
              </View>
              <Text style={styles.title}>Individual signup</Text>
              <Text style={styles.subtitle}>
                Teachers and students — start a free {INDIVIDUAL_TRIAL_DAYS}-day trial. We store your
                profile so we can match products, class, and subjects.
              </Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.fieldBlock}>
                <Text style={styles.label}>I am a *</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.role}
                    onValueChange={(value) =>
                      setFormData((p) => ({ ...p, role: value as RoleType }))
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Student" value="student" />
                    <Picker.Item label="Teacher" value="teacher" />
                  </Picker>
                </View>
              </View>

              <LabeledInput
                icon="person-outline"
                label="Full name *"
                placeholder="Your full name"
                value={formData.fullName}
                onChangeText={(fullName) => setFormData((p) => ({ ...p, fullName }))}
                autoCapitalize="words"
              />

              <LabeledInput
                icon="school-outline"
                label="School name *"
                placeholder="School / coaching name"
                value={formData.schoolName}
                onChangeText={(schoolName) => setFormData((p) => ({ ...p, schoolName }))}
                autoCapitalize="words"
              />

              <LabeledInput
                icon="call-outline"
                label="Phone *"
                placeholder="10-digit mobile"
                value={formData.phone}
                onChangeText={(phone) =>
                  setFormData((p) => ({
                    ...p,
                    phone: phone.replace(/\D/g, '').slice(0, 10),
                  }))
                }
                keyboardType="number-pad"
              />

              <LabeledInput
                icon="mail-outline"
                label="Email *"
                placeholder="you@example.com"
                value={formData.email}
                onChangeText={(email) => setFormData((p) => ({ ...p, email }))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>
                  Class {formData.role === 'student' ? '*' : '(optional)'}
                </Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.classNumber || ''}
                    onValueChange={(classNumber) =>
                      setFormData((p) => ({ ...p, classNumber }))
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Select class" value="" />
                    {INDIVIDUAL_CLASS_OPTIONS.map((c) => (
                      <Picker.Item key={c} label={c} value={c} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>Curriculum board *</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.curriculumBoard}
                    onValueChange={(curriculumBoard) =>
                      setFormData((p) => ({ ...p, curriculumBoard }))
                    }
                    style={styles.picker}
                  >
                    {CURRICULUM_BOARD_OPTIONS.map((b) => (
                      <Picker.Item key={b} label={b} value={b} />
                    ))}
                  </Picker>
                </View>
              </View>

              <ChipSection
                title="Course interested in *"
                hint="Select one or more pathways."
                options={[...INDIVIDUAL_COURSE_OPTIONS]}
                selected={formData.interestedCourses}
                onToggle={(v) => toggleInList('interestedCourses', v)}
                activeTone="orange"
              />

              <ChipSection
                title="IIT product tracks (optional)"
                hint="Pick the product tracks you want access to. Leave empty for general curriculum only."
                options={iitCodes}
                selected={formData.iitCategories}
                onToggle={(v) => toggleInList('iitCategories', v)}
                activeTone="sky"
                labelFor={(code) => `IIT ${formatIitCategoryLabel(code, iitLabelMap)}`}
              />

              <ChipSection
                title="Subjects *"
                hint="Which subjects do you want to study or teach?"
                options={[...INDIVIDUAL_SUBJECT_OPTIONS]}
                selected={formData.interestedSubjects}
                onToggle={(v) => toggleInList('interestedSubjects', v)}
                activeTone="emerald"
              />

              <LabeledInput
                icon="lock-closed-outline"
                label="Password *"
                placeholder="At least 6 characters"
                value={formData.password}
                onChangeText={(password) => setFormData((p) => ({ ...p, password }))}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                rightIcon={showPassword ? 'eye-outline' : 'eye-off-outline'}
                onRightPress={() => setShowPassword((v) => !v)}
              />

              <LabeledInput
                icon="lock-closed-outline"
                label="Confirm password *"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChangeText={(confirmPassword) =>
                  setFormData((p) => ({ ...p, confirmPassword }))
                }
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                rightIcon={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                onRightPress={() => setShowConfirmPassword((v) => !v)}
              />

              <Text style={styles.trialNote}>
                By creating an account you get {INDIVIDUAL_TRIAL_DAYS} days free. After that,
                payment is required to continue using ASLILEARN individually.
              </Text>

              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
                accessibilityRole="button"
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Start {INDIVIDUAL_TRIAL_DAYS}-day free trial
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Text style={styles.footerLink} onPress={goToLogin}>
                  Sign in
                </Text>
              </Text>
            </View>
          </GlassPanel>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </AppBackground>
  );
}

function LabeledInput({
  icon,
  label,
  rightIcon,
  onRightPress,
  ...inputProps
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
} & TextInputProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={20} color={ACCENT} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, rightIcon ? { paddingRight: 8 } : null]}
          placeholderTextColor="#5B6779"
          {...inputProps}
        />
        {rightIcon ? (
          <TouchableOpacity
            onPress={onRightPress}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.eyeButton}
          >
            <Ionicons name={rightIcon} size={20} color="#5B6779" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function ChipSection({
  title,
  hint,
  options,
  selected,
  onToggle,
  activeTone,
  labelFor,
}: {
  title: string;
  hint: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  activeTone: 'orange' | 'sky' | 'emerald';
  labelFor?: (value: string) => string;
}) {
  const toneStyles =
    activeTone === 'orange'
      ? { border: '#FDBA74', bg: '#FFF7ED', text: '#9A3412' }
      : activeTone === 'sky'
        ? { border: '#7DD3FC', bg: '#F0F9FF', text: '#0C4A6E' }
        : { border: '#6EE7B7', bg: '#ECFDF5', text: '#065F46' };

  return (
    <View style={styles.chipSection}>
      <Text style={styles.chipTitle}>{title}</Text>
      <Text style={styles.chipHint}>{hint}</Text>
      <View style={styles.chipWrap}>
        {options.map((opt) => {
          const checked = selected.includes(opt);
          return (
            <Pressable
              key={opt}
              onPress={() => onToggle(opt)}
              style={[
                styles.chip,
                checked && {
                  borderColor: toneStyles.border,
                  backgroundColor: toneStyles.bg,
                },
              ]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
            >
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={18}
                color={checked ? toneStyles.text : '#64748B'}
              />
              <Text style={[styles.chipText, checked && { color: toneStyles.text }]}>
                {labelFor ? labelFor(opt) : opt}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 48,
    paddingBottom: 40,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#5B6779',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    textAlign: 'center',
  },
  form: {
    gap: 14,
  },
  fieldBlock: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    paddingHorizontal: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  eyeButton: {
    padding: 4,
  },
  pickerWrapper: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    overflow: 'hidden',
  },
  picker: {
    height: 52,
    color: '#0f172a',
  },
  chipSection: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.10)',
    backgroundColor: 'rgba(248,250,252,0.9)',
    padding: 14,
    gap: 6,
  },
  chipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  chipHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  trialNote: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(15,23,42,0.10)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#5B6779',
  },
  footerLink: {
    color: ACCENT,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    color: '#5B6779',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  successHint: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 28,
    textAlign: 'center',
  },
  successButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
