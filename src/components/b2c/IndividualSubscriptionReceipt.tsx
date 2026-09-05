import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SPACING } from '../../theme';
import { formatInr, formatReceiptDate, type SubscriptionReceipt } from '../../lib/individual-subscription';

export function IndividualSubscriptionReceiptCard({
  receipt,
  compact = false,
}: {
  receipt: SubscriptionReceipt;
  compact?: boolean;
}) {
  const amount = receipt.amountInr ?? receipt.lastPaymentAmountInr;
  const paidOn = receipt.paidOn || receipt.lastPaidAt;
  const validUntil = receipt.validUntil || receipt.subscriptionExpiresAt;
  const recentPayments = Array.isArray(receipt.recentPayments) ? receipt.recentPayments.slice(0, 5) : [];

  return (
    <View style={[styles.card, compact && styles.compact]}>
      <View style={styles.header}>
        <Ionicons name="receipt-outline" size={20} color={COLORS.secondary} />
        <Text style={styles.title}>Subscription receipt</Text>
        {receipt.statusLabel ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{receipt.statusLabel}</Text>
          </View>
        ) : null}
      </View>
      <Row label="Plan" value={receipt.planLabel || receipt.paidPackageLabel || '—'} />
      <Row label="Billing" value={receipt.periodLabel || receipt.subscriptionPeriodLabel || '—'} />
      <Row label="Amount paid" value={formatInr(amount)} highlight />
      <Row label="Paid on" value={formatReceiptDate(paidOn)} />
      <Row label="Valid until" value={formatReceiptDate(validUntil)} highlight />
      {receipt.paymentReference ? (
        <Row label="Payment ID" value={receipt.paymentReference} mono />
      ) : null}
      {recentPayments.length > 0 ? (
        <View style={styles.paymentsSection}>
          <Text style={styles.paymentsTitle}>Recent payments</Text>
          {recentPayments.map((payment, index) => (
            <View
              key={`${payment.paymentReference || payment.razorpayOrderId || 'payment'}-${index}`}
              style={styles.paymentItem}
            >
              <View style={styles.paymentItemTop}>
                <Text style={styles.paymentPlan}>{payment.packageLabel || receipt.planLabel || 'Plan'}</Text>
                <Text style={styles.paymentAmount}>{formatInr(payment.amountInr)}</Text>
              </View>
              <Text style={styles.paymentMeta}>
                {(payment.periodLabel || 'Subscription') + ' · ' + formatReceiptDate(payment.paidAt)}
              </Text>
              <Text style={styles.paymentMeta}>Renews till {formatReceiptDate(payment.validUntil)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Row({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[styles.rowValue, highlight && styles.rowHighlight, mono && styles.mono]}
        numberOfLines={mono ? 1 : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

export function TrialUpgradeBanner({
  daysLeft,
  trialEndsAt,
}: {
  daysLeft?: number | null;
  trialEndsAt?: string | null;
}) {
  const router = useRouter();
  const days = daysLeft ?? 0;
  return (
    <Pressable style={styles.banner} onPress={() => router.push('/auth/subscribe')}>
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>
          {days <= 2 ? 'Trial ending soon — subscribe now' : 'Subscribe anytime during your trial'}
        </Text>
        <Text style={styles.bannerBody}>
          {days > 0
            ? `${days} day${days === 1 ? '' : 's'} left${trialEndsAt ? ` · ends ${formatReceiptDate(trialEndsAt)}` : ''}. Pay now to keep access without interruption.`
            : 'Choose Boards, IIT, or both and get your payment receipt with renewal date.'}
        </Text>
      </View>
      <View style={styles.bannerBtn}>
        <Text style={styles.bannerBtnText}>View plans</Text>
        <Ionicons name="chevron-forward" size={16} color="#fff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: '#fff',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  compact: { padding: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.text },
  badge: {
    backgroundColor: '#DCFCE7',
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#166534' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowLabel: { fontSize: 13, color: COLORS.textMuted },
  rowValue: { fontSize: 13, fontWeight: '600', color: COLORS.text, flexShrink: 1, textAlign: 'right' },
  rowHighlight: { color: COLORS.secondary, fontWeight: '800' },
  mono: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  paymentsSection: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 8,
  },
  paymentsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  paymentItem: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    padding: 10,
    gap: 2,
  },
  paymentItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentPlan: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.text },
  paymentAmount: { fontSize: 13, fontWeight: '800', color: COLORS.secondary },
  paymentMeta: { fontSize: 11, color: COLORS.textMuted },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  bannerTitle: { fontSize: 14, fontWeight: '800', color: '#9A3412' },
  bannerBody: { marginTop: 4, fontSize: 12, lineHeight: 17, color: '#C2410C' },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
