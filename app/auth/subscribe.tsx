import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import GlassPanel from '../../src/components/ui/GlassPanel';
import IndividualPlanCheckout from '../../src/components/b2c/IndividualPlanCheckout';
import SchoolStudentPlanCheckout from '../../src/components/b2b/SchoolStudentPlanCheckout';
import { IndividualSubscriptionReceiptCard } from '../../src/components/b2c/IndividualSubscriptionReceipt';
import { receiptFromUser, showActiveReceipt } from '../../src/lib/individual-subscription';
import { useAuth } from '../../src/context/AuthContext';
import { INDIVIDUAL_TRIAL_DAYS } from '../../src/lib/individual-signup';
import { COLORS, SPACING } from '../../src/theme';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';

export default function SubscribeScreen() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, signOut, refreshAuth } = useAuth();
  const [ready, setReady] = useState(false);

  const paywallLocked = Boolean(user?.paymentRequired);
  const homePath = user?.role === 'teacher' ? '/teacher/dashboard' : '/dashboard';
  useBackNavigation(homePath, paywallLocked);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    setReady(true);
  }, [isLoading, isAuthenticated, user, router]);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.secondary} />
        <Text style={styles.loadingText}>Checking subscription…</Text>
      </View>
    );
  }

  const initialTrack = Array.isArray(user?.iitCategories) ? String(user.iitCategories[0] || '') : '';
  const onTrial = Boolean(user?.trialActive && user?.canSubscribeEarly);
  const existingReceipt = receiptFromUser(user);
  const showReceipt = showActiveReceipt(user) && existingReceipt;
  const isActive = user?.subscriptionStatus === 'active' && !user?.paymentRequired;
  const schoolManaged = Boolean(user?.isSchoolManagedSubscription);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(homePath);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={goBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="card-outline" size={28} color="#C2410C" />
          </View>
          <Text style={styles.title}>{isActive ? 'Manage your plan' : schoolManaged ? 'Activate your student plan' : 'Choose Boards, IIT, or both'}</Text>
          <Text style={styles.subtitle}>
            Hi {user?.fullName || 'there'} —{' '}
            {isActive
              ? 'your subscription is active. You can review recent payments here, renew early, or upgrade to a bigger plan anytime.'
              : schoolManaged
              ? onTrial
                ? `you have ${user?.trialDaysLeft ?? 0} day${user?.trialDaysLeft === 1 ? '' : 's'} left in your school student trial. You can activate the yearly plan now.`
                : 'your school student trial has ended. Activate the yearly plan to continue.'
              : onTrial
              ? `you still have ${user?.trialDaysLeft ?? 0} day${user?.trialDaysLeft === 1 ? '' : 's'} on your trial. Subscribe now — no need to wait until expiry.`
              : `your ${INDIVIDUAL_TRIAL_DAYS}-day trial has ended. Pick a plan and pay monthly or yearly to continue.`}
          </Text>
        </View>

        <GlassPanel style={styles.trialBanner} contentStyle={styles.trialBannerInner}>
          <Ionicons name="time-outline" size={18} color="#B45309" />
          <View style={styles.trialCopy}>
            <Text style={styles.trialTitle}>{isActive ? 'Subscription status: active' : `Trial status: ${onTrial ? 'active' : 'expired'}`}</Text>
            {isActive && existingReceipt?.validUntil ? (
              <Text style={styles.trialMeta}>
                Current renewal date: {new Date(existingReceipt.validUntil).toLocaleDateString()}
              </Text>
            ) : onTrial && user?.trialDaysLeft != null ? (
              <Text style={styles.trialMeta}>{user.trialDaysLeft} day{user.trialDaysLeft === 1 ? '' : 's'} remaining</Text>
            ) : user?.trialEndsAt ? (
              <Text style={styles.trialMeta}>
                Ended on {new Date(user.trialEndsAt).toLocaleDateString()}
              </Text>
            ) : null}
          </View>
        </GlassPanel>

        {showReceipt && existingReceipt ? (
          <IndividualSubscriptionReceiptCard receipt={existingReceipt} />
        ) : null}

        {schoolManaged ? <SchoolStudentPlanCheckout user={user} onPaid={() => void refreshAuth({ silent: true })} /> : <IndividualPlanCheckout
          userId={user?._id || user?.id || null}
          role={user?.role}
          userName={user?.fullName}
          userEmail={user?.email}
          initialClass={user?.classNumber || ''}
          initialTrack={initialTrack}
          initialPackage={initialTrack ? 'both' : 'board'}
          onPaid={() => void refreshAuth({ silent: true })}
        />}

        {!schoolManaged && <Text style={styles.resourcesHint}>
          Pick Boards + IIT to see Alpha / Beta / Gamma books, quizzes, Vidya AI, and practice exams tied to that track.
        </Text>}

        <Pressable
          onPress={async () => {
            await signOut();
            router.replace('/auth/login');
          }}
          style={styles.signOut}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.textMuted} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 14 },
  scroll: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: SPACING.md,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  hero: { alignItems: 'center', marginBottom: SPACING.lg, paddingHorizontal: 4 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: {
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 420,
    paddingHorizontal: 4,
  },
  trialBanner: {
    marginBottom: SPACING.lg,
    backgroundColor: '#FFFBEB',
  },
  trialBannerInner: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
    padding: SPACING.md,
  },
  trialCopy: { flex: 1, minWidth: 0, paddingRight: 4 },
  trialTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  trialMeta: { fontSize: 12, color: '#B45309', marginTop: 4, lineHeight: 16 },
  signOut: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING.md,
  },
  signOutText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '600' },
  resourcesHint: {
    marginTop: SPACING.md,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
