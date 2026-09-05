import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import GlassPanel from '../ui/GlassPanel';
import { COLORS, RADIUS, SPACING } from '../../theme';
import { INDIVIDUAL_CLASS_OPTIONS } from '../../lib/individual-signup';
import {
  B2C_BOARD_PRICE,
  B2C_IIT_PRICE,
  B2C_STUDENT_BOTH_PRICE,
  B2C_TEACHER_IIT_PRICE,
  B2C_TEACHER_BOTH_PRICE,
  CLASS_TRACK_MATRIX,
  IIT_TRACK_SPECS,
  classNumbersFromLabel,
  recommendedTrackForClass,
  tracksForClass,
  type IitTrackCode,
} from '../../lib/iit-track-specs';
import {
  createIndividualOrder,
  getBillingConfig,
  persistStudentPlanBeforePay,
  verifyIndividualPayment,
  type BillingCatalog,
  type PlanOption,
  type PlanPackage,
} from '../../lib/billing-api';
import type { SubscriptionReceipt } from '../../lib/individual-subscription';
import { IndividualSubscriptionReceiptCard } from './IndividualSubscriptionReceipt';
import { RazorpayCheckoutModal, type RazorpayCheckoutInput } from '../../lib/open-razorpay-checkout';

type PackOptions = { month: PlanOption | null; year: PlanOption | null };

function yearFromMonth(plan: PlanOption): PlanOption {
  const list = plan.amountInr * 12;
  return { amountInr: list, listPriceInr: list, discountPercent: 0, period: 'year', label: plan.label };
}

function packFromLegacy(plan: PlanOption): PackOptions {
  if (plan.period === 'year') return { month: null, year: plan };
  return { month: plan, year: yearFromMonth(plan) };
}

const FALLBACK: BillingCatalog = {
  student: {
    board: packFromLegacy({ amountInr: B2C_BOARD_PRICE, period: 'month', label: 'Boards' }),
    iit: packFromLegacy({ amountInr: B2C_IIT_PRICE, period: 'month', label: 'IIT Foundation' }),
    both: packFromLegacy({ amountInr: B2C_STUDENT_BOTH_PRICE, period: 'month', label: 'Boards + IIT' }),
  },
  teacher: {
    board: packFromLegacy({ amountInr: B2C_BOARD_PRICE, period: 'month', label: 'Boards' }),
    iit: packFromLegacy({ amountInr: B2C_TEACHER_IIT_PRICE, period: 'year', label: 'IIT Foundation' }),
    both: packFromLegacy({ amountInr: B2C_TEACHER_BOTH_PRICE, period: 'year', label: 'Boards + IIT' }),
  },
};

function asPack(raw: unknown): PackOptions {
  const v = raw as PackOptions & PlanOption;
  if (v && (v.month || v.year)) {
    const month = v.month || null;
    return { month, year: v.year || (month ? yearFromMonth(month) : null) };
  }
  if (v && typeof v.amountInr === 'number') return packFromLegacy(v);
  return { month: null, year: null };
}

function periodLabel(period: string) {
  return period === 'year' ? '/ year' : '/ month';
}

type Props = {
  userId?: string | null;
  role?: string;
  userName?: string;
  userEmail?: string;
  initialClass?: string;
  initialTrack?: string;
  initialPackage?: PlanPackage;
  onPaid?: () => void;
};

export default function IndividualPlanCheckout({
  userId,
  role = 'student',
  userName,
  userEmail,
  initialClass = 'Class 6',
  initialTrack = '',
  initialPackage = 'board',
  onPaid,
}: Props) {
  const router = useRouter();
  const billingRole = String(role || '').toLowerCase() === 'teacher' ? 'teacher' : 'student';
  const [classLabel, setClassLabel] = useState(initialClass || 'Class 6');
  const [packageType, setPackageType] = useState<PlanPackage>(
    initialPackage === 'iit' || initialPackage === 'both' ? 'both' : 'board',
  );
  const classNumber = classNumbersFromLabel(classLabel) || 6;
  const allowedTracks = tracksForClass(classNumber);
  const defaultTrack = (
    allowedTracks.some((t) => t.code === initialTrack) ? initialTrack : recommendedTrackForClass(classNumber)
  ) as IitTrackCode;
  const [track, setTrack] = useState<IitTrackCode>(defaultTrack);
  const [plans, setPlans] = useState<BillingCatalog>(FALLBACK);
  const [payConfigured, setPayConfigured] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'month' | 'year'>(
    billingRole === 'teacher' && (packageType === 'iit' || packageType === 'both') ? 'year' : 'month',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [checkoutInput, setCheckoutInput] = useState<RazorpayCheckoutInput | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pendingVerify, setPendingVerify] = useState<{
    packageType: PlanPackage;
    period: 'month' | 'year';
    classLabel: string;
    track: string;
  } | null>(null);
  const [paidReceipt, setPaidReceipt] = useState<SubscriptionReceipt | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const json = await getBillingConfig();
        if (cancelled) return;
        if (json.plans) setPlans(json.plans);
        setPayConfigured(Boolean(json.configured && json.keyId));
      } catch {
        if (!cancelled) setPayConfigured(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pack = asPack(plans[billingRole][packageType]);
  const catalogPlan = pack[billingPeriod] || pack.year || pack.month;
  const price = catalogPlan?.amountInr || 0;
  const listPrice = catalogPlan?.listPriceInr || price;
  const discountPercent = catalogPlan?.discountPercent || 0;
  const period = catalogPlan?.period || billingPeriod;
  const needsIitTrack = packageType === 'iit' || packageType === 'both';
  const selectedTrack = IIT_TRACK_SPECS.find((t) => t.code === track);
  const matrix = CLASS_TRACK_MATRIX.find((row) => row.classNumber === classNumber);

  useEffect(() => {
    if (pack[billingPeriod]) return;
    setBillingPeriod(pack.year ? 'year' : 'month');
  }, [packageType, billingRole, plans, billingPeriod, pack.month, pack.year]);

  const packageOptions = useMemo(
    () =>
      (billingRole === 'student'
        ? ([
            ['board', asPack(plans.student.board)],
            ['iit', asPack(plans.student.iit)],
            ['both', asPack(plans.student.both)],
          ] as const)
        : ([
            ['board', asPack(plans.teacher.board)],
            ['both', asPack(plans.teacher.both)],
          ] as const)),
    [billingRole, plans],
  );

  const onClassChange = (value: string) => {
    setClassLabel(value);
    const n = classNumbersFromLabel(value) || 6;
    if (!tracksForClass(n).some((t) => t.code === track)) {
      setTrack(recommendedTrackForClass(n));
    }
  };

  const finishVerify = async (payment: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => {
    if (!pendingVerify) return;
    const verifyJson = await verifyIndividualPayment({
      ...payment,
      packageType: pendingVerify.packageType,
      period: pendingVerify.period,
      classLabel: pendingVerify.classLabel,
      track: pendingVerify.track,
    });
    if (verifyJson.receipt) {
      setPaidReceipt(verifyJson.receipt);
      onPaid?.();
      return;
    }
    Alert.alert('Payment successful', verifyJson.message || 'Your plan is now active.');
    onPaid?.();
    router.replace((billingRole === 'teacher' ? '/teacher/dashboard' : '/dashboard') as any);
  };

  const handlePay = async () => {
    if (!userId) {
      router.push('/auth/register');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (billingRole === 'student') {
        await persistStudentPlanBeforePay(userId, {
          classNumber: classLabel,
          iitCategories: needsIitTrack && track ? [track] : [],
          interestedCourses:
            packageType === 'board'
              ? ['Board Exams']
              : packageType === 'iit'
                ? ['IIT Foundation']
                : ['IIT Foundation', 'Board Exams'],
        });
      }
      if (!payConfigured) {
        throw new Error('Online payments are not available yet. Please contact AsliLearn.');
      }
      const orderJson = await createIndividualOrder({
        packageType,
        period: billingPeriod,
        classLabel,
        track: needsIitTrack ? track : '',
      });
      setPendingVerify({
        packageType,
        period: billingPeriod,
        classLabel,
        track: needsIitTrack ? track : '',
      });
      setCheckoutInput({
        keyId: orderJson.keyId,
        amount: orderJson.amount,
        currency: orderJson.currency || 'INR',
        orderId: orderJson.orderId,
        name: 'AsliLearn.ai',
        description: `${catalogPlan?.label || 'Plan'} · ${classLabel}`,
        prefill: {
          name: orderJson.prefill?.name || userName || '',
          email: orderJson.prefill?.email || userEmail || '',
          contact: orderJson.prefill?.contact || '',
        },
      });
      setCheckoutOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {paidReceipt ? (
        <View style={{ gap: SPACING.md }}>
          <IndividualSubscriptionReceiptCard receipt={paidReceipt} />
          <Pressable
            style={styles.payBtn}
            onPress={() =>
              router.replace((billingRole === 'teacher' ? '/teacher/dashboard' : '/dashboard') as any)
            }
          >
            <Text style={styles.payBtnText}>Continue to dashboard</Text>
          </Pressable>
        </View>
      ) : (
      <View style={styles.form}>
        <View style={styles.rateCard}>
          <Text style={styles.rateKicker}>Individual membership</Text>
          <Text style={styles.rateLine}>Boards — ₹{B2C_BOARD_PRICE} / month · ₹{B2C_BOARD_PRICE * 12} / year</Text>
          {billingRole === 'student' ? (
            <>
              <Text style={styles.rateLine}>IIT Foundation — ₹{B2C_IIT_PRICE} / month · ₹{B2C_IIT_PRICE * 12} / year</Text>
              <Text style={styles.rateLine}>Boards + IIT — ₹{B2C_STUDENT_BOTH_PRICE} / month · ₹{B2C_STUDENT_BOTH_PRICE * 12} / year</Text>
            </>
          ) : (
            <Text style={styles.rateLine}>Boards + IIT teacher plan — billed yearly</Text>
          )}
        </View>

        <Text style={styles.label}>Class</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={classLabel} onValueChange={onClassChange} style={styles.picker}>
            {INDIVIDUAL_CLASS_OPTIONS.filter((c) => (classNumbersFromLabel(c) || 0) <= 10).map((c) => (
              <Picker.Item key={c} label={c} value={c} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Package</Text>
        <View style={styles.packageRow}>
          {packageOptions.map(([id, packOpt]) => {
            const shown = packOpt.month || packOpt.year;
            const selected = packageType === id;
            return (
              <Pressable
                key={id}
                onPress={() => setPackageType(id)}
                style={[styles.packageBtn, selected && styles.packageBtnActive]}
              >
                <Text style={[styles.packageTitle, selected && styles.packageTitleActive]} numberOfLines={2}>
                  {shown?.label || id}
                </Text>
                <Text style={styles.packagePrice}>
                  {shown ? `₹${shown.amountInr} ${periodLabel(shown.period)}` : '—'}
                </Text>
                {packOpt.year && packOpt.month ? (
                  <Text style={styles.packageYear}>
                    ₹{packOpt.year.amountInr} / year
                    {packOpt.year.discountPercent ? ` · ${packOpt.year.discountPercent}% off` : ''}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {pack.month && pack.year ? (
          <>
            <Text style={styles.label}>Pay monthly or yearly</Text>
            <View style={styles.periodRow}>
              <Pressable
                onPress={() => setBillingPeriod('month')}
                style={[styles.periodBtn, billingPeriod === 'month' && styles.periodBtnActive]}
              >
                <Text style={[styles.periodLabel, billingPeriod === 'month' && styles.periodLabelActive]}>
                  Monthly
                </Text>
                <Text style={styles.periodPrice}>₹{pack.month.amountInr} / month</Text>
              </Pressable>
              <Pressable
                onPress={() => setBillingPeriod('year')}
                style={[styles.periodBtn, billingPeriod === 'year' && styles.periodBtnActive]}
              >
                <Text style={[styles.periodLabel, billingPeriod === 'year' && styles.periodLabelActive]}>
                  Yearly{pack.year.discountPercent ? ` · ${pack.year.discountPercent}% off` : ''}
                </Text>
                <Text style={styles.periodPrice}>₹{pack.year.amountInr} / year</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        {needsIitTrack ? (
          <>
            <Text style={styles.label}>IIT material for {classLabel}</Text>
            {matrix ? (
              <Text style={styles.hint}>
                Recommended: {IIT_TRACK_SPECS.find((t) => t.code === matrix.recommended)?.name}.
              </Text>
            ) : null}
            {IIT_TRACK_SPECS.map((spec) => {
              const allowed = spec.classNumbers.includes(classNumber);
              const selected = track === spec.code;
              return (
                <Pressable
                  key={spec.code}
                  disabled={!allowed}
                  onPress={() => allowed && setTrack(spec.code)}
                  style={[
                    styles.trackCard,
                    { backgroundColor: spec.colors.bg, borderColor: spec.colors.border },
                    selected && allowed && { borderColor: spec.colors.selected, borderWidth: 2 },
                    !allowed && { opacity: 0.45 },
                  ]}
                >
                  <Text style={[styles.trackBadge, { color: spec.colors.badge }]}>{spec.classes}</Text>
                  <Text style={styles.trackBook}>{spec.book}</Text>
                  <Text style={styles.trackHeadline}>{spec.headline}</Text>
                  <Text style={styles.trackForWhom}>{spec.forWhom}</Text>
                  {!allowed ? (
                    <Text style={styles.trackUnavailable}>Not offered for {classLabel}. Choose a class in {spec.classes}.</Text>
                  ) : null}
                  {selected && allowed ? (
                    <Ionicons name="checkmark-circle" size={20} color={spec.colors.selected} style={styles.trackCheck} />
                  ) : null}
                </Pressable>
              );
            })}
          </>
        ) : (
          <Text style={styles.hint}>
            Boards covers school-syllabus videos, notes, quizzes and practice exams. Add IIT Foundation anytime
            for Asli Prep Alpha / Beta books and the tools tied to them.
          </Text>
        )}

        {selectedTrack && needsIitTrack ? (
          <GlassPanel style={styles.summary} contentStyle={styles.summaryInner}>
            <Text style={styles.summaryTitle}>What you get on {selectedTrack.book}</Text>
            {selectedTrack.points.map((item) => (
              <View key={item} style={styles.pointRow}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.pointText}>{item}</Text>
              </View>
            ))}
          </GlassPanel>
        ) : null}

        <GlassPanel style={styles.summary} contentStyle={styles.summaryInner}>
          <Text style={styles.summaryKicker}>Your plan</Text>
          {pack.month && pack.year ? (
            <View style={styles.planPeriodToggle}>
              {(['month', 'year'] as const).map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setBillingPeriod(p)}
                  style={[styles.planPeriodChip, billingPeriod === p && styles.planPeriodChipActive]}
                >
                  <Text style={[styles.planPeriodChipText, billingPeriod === p && styles.planPeriodChipTextActive]}>
                    {p === 'year'
                      ? `Yearly${pack.year?.discountPercent ? ` · ${pack.year.discountPercent}% off` : ''}`
                      : 'Monthly'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={styles.summaryPrice}>
            ₹{price}
            <Text style={styles.summaryPeriod}> {periodLabel(period)}</Text>
          </Text>
          {discountPercent > 0 && listPrice > price ? (
            <Text style={styles.discount}>
              <Text style={styles.strike}>₹{listPrice}</Text> {discountPercent}% yearly discount
            </Text>
          ) : null}
          <Text style={styles.summaryMeta}>
            {classLabel}
            {needsIitTrack && selectedTrack ? ` · ${selectedTrack.book}` : ' · Boards'}
            {packageType === 'both' ? ' + Boards' : ''}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            onPress={() => void handlePay()}
            disabled={saving}
            style={[styles.payBtn, saving && { opacity: 0.7 }]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payBtnText}>Pay with Razorpay</Text>
            )}
          </Pressable>
        </GlassPanel>
      </View>
      )}

      <RazorpayCheckoutModal
        visible={checkoutOpen}
        input={checkoutInput}
        onClose={() => {
          setCheckoutOpen(false);
          setCheckoutInput(null);
        }}
        onComplete={async (result) => {
          if (result.ok) {
            setSaving(true);
            try {
              await finishVerify(result);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not confirm payment.');
            } finally {
              setSaving(false);
            }
            return;
          }
          if (!result.cancelled) setError(result.message);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  form: { paddingBottom: SPACING.md, gap: SPACING.md },
  rateCard: {
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
  },
  rateKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  rateLine: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  hint: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  pickerWrap: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: '#fff',
    overflow: 'hidden',
    minHeight: 52,
    justifyContent: 'center',
  },
  picker: { width: '100%', color: COLORS.text },
  packageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  packageBtn: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: '#fff',
  },
  packageBtnActive: { borderColor: COLORS.secondary, backgroundColor: '#F0F9FF' },
  packageTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  packageTitleActive: { color: '#0C4A6E' },
  packagePrice: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, fontWeight: '600' },
  packageYear: { fontSize: 11, color: '#047857', marginTop: 4, fontWeight: '600' },
  periodRow: { flexDirection: 'row', gap: SPACING.sm },
  periodBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: '#fff',
  },
  periodBtnActive: { borderColor: COLORS.secondary, backgroundColor: '#F0F9FF' },
  periodLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  periodLabelActive: { color: COLORS.secondary },
  periodPrice: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  trackCard: {
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    position: 'relative',
  },
  trackBadge: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  trackBook: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  trackHeadline: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  trackForWhom: { fontSize: 12, color: COLORS.textMuted, marginTop: 8, lineHeight: 17 },
  trackUnavailable: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginTop: 8 },
  trackCheck: { position: 'absolute', top: 12, right: 12 },
  summary: { marginTop: SPACING.sm },
  summaryInner: { padding: SPACING.md },
  planPeriodToggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    padding: 3,
    gap: 4,
  },
  planPeriodChip: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  planPeriodChipActive: { backgroundColor: '#fff' },
  planPeriodChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  planPeriodChipTextActive: { color: COLORS.secondary },
  summaryKicker: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  summaryPrice: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  summaryPeriod: { fontSize: 14, fontWeight: '500', color: COLORS.textMuted },
  discount: { fontSize: 12, color: '#047857', marginTop: 4 },
  strike: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  summaryMeta: { fontSize: 14, color: COLORS.textSecondary, marginTop: 6 },
  pointRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 6 },
  pointText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  error: { fontSize: 12, color: COLORS.danger, marginTop: SPACING.sm },
  payBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
