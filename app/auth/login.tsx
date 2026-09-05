import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  useWindowDimensions,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  type TextInput as TextInputType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { storageDeleteItem, storageGetItem, storageSetItem } from '../../src/lib/safe-storage';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { API_BASE_URL } from '../../src/services/api/api';
import { useAuth } from '../../src/context/AuthContext';
import { useKeyboardDockLift } from '../../src/hooks/useKeyboardDockLift';
import { GlassPanel } from '../../src/components/ui';
import AppBackground from '../../src/components/ui/AppBackground';
import { COLORS, FONT, RADIUS, SPACING } from '../../src/theme';

/**
 * Auth palette for the light pastel background. The app-wide <AppBackground>
 * supplies the artwork, so everything here is derived for dark-on-light.
 *
 * `accent` is the role-neutral brand violet used for fills, borders and icons.
 * `accentText` is the darker step used whenever the violet carries *text* on a
 * light surface — #6366F1 only reaches ~4.4:1 on white, which misses 4.5:1.
 */
const PALETTE = {
  accent: '#6366F1',
  accentText: '#4338CA',
  link: '#4F46E5',
  text: '#0f172a',
  muted: '#5B6779',
  hairline: 'rgba(15,23,42,0.10)',
};

function ShimmerButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  const shimmer = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-200, 320]) }],
  }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={btnStyle}>
      <Pressable
        disabled={loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: loading, busy: loading }}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15 });
        }}
        onPress={onPress}
        style={({ pressed }) => [styles.signInWrap, pressed && !loading && { opacity: 0.95 }]}
      >
        <LinearGradient
          colors={['#4F46E5', '#4338CA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.signInGradient}
        >
          {!loading ? (
            <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none">
              <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          ) : null}
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.signInInner}>
              <Ionicons name="flash" size={20} color="#fff" />
              <Text style={styles.signInText}>{label}</Text>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

type FieldProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secure?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  keyboardType?: 'email-address' | 'default';
  delay?: number;
  inputRef?: RefObject<TextInputType | null>;
  onSubmitEditing?: () => void;
  onFocusField?: () => void;
};

function PremiumField({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  secure,
  showPassword,
  onTogglePassword,
  keyboardType = 'default',
  delay = 0,
  inputRef,
  onSubmitEditing,
  onFocusField,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useSharedValue(0);

  useEffect(() => {
    focusAnim.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused, focusAnim]);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: focused ? PALETTE.accent : '#D8DEE9',
    shadowOpacity: interpolate(focusAnim.value, [0, 1], [0, 0.12]),
  }));

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(delay)} style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Animated.View style={[styles.fieldBox, borderStyle]}>
        <LinearGradient
          colors={focused ? ['#EEF2FF', '#ECFEFF'] : ['#F1F5F9', '#F1F5F9']}
          style={styles.fieldIconPill}
        >
          <Ionicons name={icon} size={18} color={focused ? PALETTE.accentText : PALETTE.muted} />
        </LinearGradient>
        <TextInput
          ref={inputRef}
          style={styles.fieldInput}
          placeholder={placeholder}
          placeholderTextColor={PALETTE.muted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setFocused(true);
            onFocusField?.();
          }}
          onBlur={() => setFocused(false)}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={secure ? 'password' : keyboardType === 'email-address' ? 'email' : 'username'}
          textContentType={secure ? 'password' : 'username'}
          secureTextEntry={secure && !showPassword}
          underlineColorAndroid="transparent"
          selectionColor={PALETTE.accent}
          returnKeyType={secure ? 'go' : 'next'}
          blurOnSubmit={Boolean(secure)}
          onSubmitEditing={onSubmitEditing}
        />
        {onTogglePassword ? (
          <Pressable
            onPress={onTogglePassword}
            style={styles.eyeBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={PALETTE.muted}
            />
          </Pressable>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

export default function Login() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { signIn } = useAuth();
  const { keyboardLift, keyboardOpen, captureBaseline } = useKeyboardDockLift();
  const scrollRef = useRef<ScrollView>(null);
  const cardWidth = useMemo(() => Math.min(width - 28, 440), [width]);
  const logoWidth = useMemo(
    () => (keyboardOpen ? Math.min(width * 0.28, 96) : Math.min(width * 0.52, 200)),
    [width, keyboardOpen],
  );
  const logoHeight = useMemo(() => logoWidth * 0.92, [logoWidth]);

  const [showForm, setShowForm] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const emailInputRef = useRef<TextInputType>(null);
  const passwordInputRef = useRef<TextInputType>(null);
  const credentialsRef = useRef({ email: '', password: '' });
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    credentialsRef.current = formData;
  }, [formData]);

  useEffect(() => {
    return () => {
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const load = async () => {
      try {
        const email = await storageGetItem('rememberedEmail');
        // Passwords are never persisted. Remove values left by older builds.
        await storageDeleteItem('rememberedPassword');
        if (email) {
          const next = { email, password: '' };
          credentialsRef.current = next;
          setFormData(next);
          setRememberMe(true);
        }
      } catch {
        /* ignore */
      }
    };
    load();
  }, [showForm]);

  // Keep active fields (and Sign In) above the keyboard on edge-to-edge Android.
  useEffect(() => {
    if (!keyboardOpen) return;
    const id = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'ios' ? 60 : 120);
    return () => clearTimeout(id);
  }, [keyboardOpen, keyboardLift]);

  const ensureFieldVisible = () => {
    captureBaseline();
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'ios' ? 80 : 160);
  };

  const redirectByRole = (role: string) => {
    const normalized = String(role || '')
      .trim()
      .toLowerCase()
      .replace(/_/g, '-');
    if (normalized === 'super-admin') router.replace('/super-admin-dashboard');
    else if (normalized === 'admin') router.replace('/admin/dashboard');
    else if (normalized === 'teacher') router.replace('/teacher/dashboard');
    else router.replace('/dashboard');
  };

  const handleForgotPassword = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Alert.alert('Forgot Password', 'Please contact admin to reset your password.');
  };

  const handleCreateAccount = () => {
    Haptics.selectionAsync().catch(() => {});
    router.push('/auth/register');
  };

  const submitLogin = async () => {
    setError('');
    // Prefer live refs so Android IME can flush the last typed character before we read state.
    const emailRaw = String(credentialsRef.current.email || formData.email || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '');
    const password = credentialsRef.current.password || formData.password;
    if (!emailRaw || !password) {
      setError('Please enter both email/student ID and password.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    // Bare student ids (1724) → 1724@example.com
    const email = emailRaw.includes('@')
      ? emailRaw
      : /^[a-z0-9._+-]+$/i.test(emailRaw)
        ? `${emailRaw}@example.com`
        : emailRaw;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsSubmitting(true);
    try {
      const data = await signIn({ email, password });
      if (rememberMe) {
        await storageSetItem('rememberedEmail', email);
        await storageDeleteItem('rememberedPassword');
      } else {
        await storageDeleteItem('rememberedEmail');
        await storageDeleteItem('rememberedPassword');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const u = data?.user;
      if ((u?.isIndividualAccount || u?.isSchoolManagedSubscription) && u?.paymentRequired) {
        router.replace('/auth/subscribe');
        return;
      }
      redirectByRole(u?.role || 'student');
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const fallback = `Cannot connect to server. Please check network and server status.\n${API_BASE_URL}`;
      const msg = err?.friendlyMessage || err?.message || fallback;
      setError(msg);
      // Stale "Remember me" passwords often cause Invalid credentials after a reset.
      if (/invalid credentials/i.test(String(msg))) {
        try {
          await storageDeleteItem('rememberedPassword');
        } catch {
          /* ignore */
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    // Blur first so Android commits any pending IME composition (last password char).
    emailInputRef.current?.blur();
    passwordInputRef.current?.blur();
    Keyboard.dismiss();
    if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
    submitTimerRef.current = setTimeout(() => {
      submitTimerRef.current = null;
      void submitLogin();
    }, 80);
  };

  return (
    <AppBackground>
    <View style={styles.root}>
      {/* the app-wide pastel artwork is the page background now, so no local gradient */}
      <StatusBar style="dark" />

      {showForm ? (
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[
                styles.scroll,
                keyboardOpen && styles.scrollKeyboardOpen,
                keyboardLift > 0 && { paddingBottom: SPACING.xl + keyboardLift },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            >
              <Animated.View
                entering={FadeInDown.duration(500)}
                style={[styles.brandHeader, keyboardOpen && styles.brandHeaderCompact]}
              >
                <Image
                  source={require('../../assets/logo-transparent.png')}
                  style={{ width: logoWidth, height: logoHeight }}
                  resizeMode="contain"
                  accessibilityLabel="ASLI Learn logo"
                />
              </Animated.View>

              {/* Glass card */}
              <Animated.View entering={FadeInDown.duration(600).delay(120).springify()} style={{ width: cardWidth }}>
                <GlassPanel
                  style={[styles.card, keyboardOpen && styles.cardKeyboardOpen]}
                  radius={28}
                  tone="strong"
                >
                  <View style={[styles.cardTop, keyboardOpen && styles.cardTopCompact]}>
                    <Text style={[styles.cardTitle, keyboardOpen && styles.cardTitleCompact]}>
                      Welcome Back
                    </Text>
                  </View>

                  {error ? (
                    <Animated.View entering={FadeIn.duration(250)} style={styles.errorBox}>
                      <View style={styles.errorIconWrap}>
                        <Ionicons name="alert-circle" size={18} color="#B91C1C" />
                      </View>
                      <Text style={styles.errorMsg}>{error}</Text>
                    </Animated.View>
                  ) : null}

                  <View style={styles.form}>
                    <PremiumField
                      label="Email or Student ID"
                      icon="mail-outline"
                      placeholder="Email or student ID"
                      value={formData.email}
                      onChangeText={(email) => {
                        credentialsRef.current = { ...credentialsRef.current, email };
                        setFormData((p) => ({ ...p, email }));
                      }}
                      keyboardType="default"
                      delay={180}
                      inputRef={emailInputRef}
                      onFocusField={ensureFieldVisible}
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                    />
                    <PremiumField
                      label="Password"
                      icon="lock-closed-outline"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChangeText={(password) => {
                        credentialsRef.current = { ...credentialsRef.current, password };
                        setFormData((p) => ({ ...p, password }));
                      }}
                      secure
                      showPassword={showPassword}
                      onTogglePassword={() => setShowPassword((v) => !v)}
                      delay={260}
                      inputRef={passwordInputRef}
                      onFocusField={ensureFieldVisible}
                      onSubmitEditing={handleSubmit}
                    />

                    <Animated.View entering={FadeInDown.duration(450).delay(340)} style={styles.optionsRow}>
                      <Pressable
                        style={styles.rememberRow}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: rememberMe }}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setRememberMe((v) => !v);
                        }}
                      >
                        <LinearGradient
                          colors={rememberMe ? ['#4F46E5', '#4338CA'] : ['#FFFFFF', '#FFFFFF']}
                          style={[styles.checkbox, rememberMe && styles.checkboxOn]}
                        >
                          {rememberMe ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                        </LinearGradient>
                        <Text style={styles.rememberLabel}>Remember me</Text>
                      </Pressable>
                      <Pressable onPress={handleForgotPassword} hitSlop={8} accessibilityRole="button">
                        <Text style={styles.forgotLink}>Forgot password?</Text>
                      </Pressable>
                    </Animated.View>

                    <Animated.View entering={FadeInDown.duration(450).delay(420)}>
                      <ShimmerButton
                        label={isSubmitting ? 'Signing in...' : 'Sign In'}
                        loading={isSubmitting}
                        onPress={handleSubmit}
                      />
                    </Animated.View>
                  </View>

                  {!keyboardOpen ? (
                    <>
                      <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                      </View>

                      <Pressable
                        style={styles.registerBtn}
                        accessibilityRole="button"
                        onPress={handleCreateAccount}
                      >
                        <Ionicons name="person-add-outline" size={18} color={PALETTE.accentText} />
                        <Text style={styles.registerBtnText}>Create a free account</Text>
                      </Pressable>
                    </>
                  ) : null}
                </GlassPanel>
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      ) : null}
    </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  // transparent so the app-wide pastel artwork shows behind the glass card
  root: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
  },
  scrollKeyboardOpen: {
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  brandHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: SPACING.md,
    width: '100%',
  },
  brandHeaderCompact: {
    marginBottom: SPACING.xs,
  },
  card: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  cardKeyboardOpen: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  cardTop: {
    marginBottom: SPACING.xl,
  },
  cardTopCompact: {
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: PALETTE.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  cardTitleCompact: {
    fontSize: 22,
    marginBottom: 0,
  },
  cardSubtitle: {
    fontSize: FONT.base,
    color: PALETTE.muted,
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorIconWrap: {
    marginTop: 1,
  },
  errorMsg: {
    flex: 1,
    color: '#991B1B',
    fontSize: FONT.sm,
    lineHeight: 18,
  },
  form: {
    gap: SPACING.lg,
  },
  fieldWrap: {
    gap: SPACING.sm,
  },
  fieldLabel: {
    fontSize: FONT.sm,
    fontWeight: FONT.semibold,
    color: PALETTE.text,
    marginLeft: 2,
  },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.lg + 2,
    borderWidth: 1.5,
    borderColor: '#D8DEE9',
    height: 56,
    paddingRight: SPACING.md,
    // Avoid overflow:'hidden' — clips the last glyph on Android TextInput.
    shadowColor: PALETTE.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  fieldIconPill: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
    marginRight: SPACING.sm,
  },
  fieldInput: {
    flex: 1,
    alignSelf: 'stretch',
    fontSize: FONT.lg,
    color: COLORS.text,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    paddingLeft: 0,
    paddingRight: 8,
    margin: 0,
    backgroundColor: 'transparent',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  eyeBtn: {
    padding: SPACING.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.25)',
  },
  checkboxOn: {
    borderColor: 'transparent',
  },
  rememberLabel: {
    fontSize: FONT.base,
    color: PALETTE.text,
    fontWeight: FONT.medium,
  },
  forgotLink: {
    fontSize: FONT.base,
    color: PALETTE.link,
    fontWeight: FONT.bold,
  },
  signInWrap: {
    borderRadius: RADIUS.lg + 2,
    overflow: 'hidden',
    marginTop: SPACING.xs,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  signInGradient: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    opacity: 0.9,
  },
  signInInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  signInText: {
    color: '#fff',
    fontSize: FONT.lg,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
    gap: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: PALETTE.hairline,
  },
  dividerText: {
    fontSize: FONT.sm,
    color: PALETTE.muted,
    fontWeight: FONT.medium,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    height: 52,
    borderRadius: RADIUS.lg + 2,
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },
  registerBtnText: {
    fontSize: FONT.md,
    fontWeight: FONT.bold,
    color: PALETTE.accentText,
  },
});
