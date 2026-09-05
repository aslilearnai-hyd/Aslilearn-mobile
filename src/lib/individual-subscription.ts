export type SubscriptionReceipt = {
  status?: string;
  statusLabel?: string;
  paidPackage?: string | null;
  paidPackageLabel?: string | null;
  subscriptionPeriod?: string | null;
  subscriptionPeriodLabel?: string | null;
  planLabel?: string | null;
  period?: string | null;
  periodLabel?: string | null;
  amountInr?: number | null;
  lastPaymentAmountInr?: number | null;
  paidOn?: string | null;
  lastPaidAt?: string | null;
  validUntil?: string | null;
  subscriptionExpiresAt?: string | null;
  paymentReference?: string | null;
  paymentMethod?: string | null;
  razorpayOrderId?: string | null;
  recentPayments?: SubscriptionPayment[];
  recentPaymentCount?: number | null;
};

export type SubscriptionPayment = {
  paidAt?: string | null;
  amountInr?: number | null;
  packageType?: string | null;
  packageLabel?: string | null;
  period?: string | null;
  periodLabel?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  razorpayOrderId?: string | null;
  validUntil?: string | null;
  status?: string | null;
  source?: string | null;
};

export function formatInr(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

export function formatReceiptDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function receiptFromUser(user: Record<string, unknown> | null | undefined): SubscriptionReceipt | null {
  if (!user?.isIndividualAccount && !user?.isSchoolManagedSubscription) return null;
  return {
    status: String(user.subscriptionStatus || ''),
    statusLabel:
      user.subscriptionStatus === 'active'
        ? 'Active'
        : user.trialActive
          ? 'Trial'
          : user.paymentRequired
            ? 'Payment due'
            : 'Trial',
    paidPackage: (user.paidPackage as string) || null,
    paidPackageLabel: (user.paidPackageLabel as string) || null,
    subscriptionPeriod: (user.subscriptionPeriod as string) || null,
    subscriptionPeriodLabel: (user.subscriptionPeriodLabel as string) || null,
    amountInr: (user.lastPaymentAmountInr as number) ?? null,
    lastPaymentAmountInr: (user.lastPaymentAmountInr as number) ?? null,
    paidOn: (user.lastPaidAt as string) || null,
    lastPaidAt: (user.lastPaidAt as string) || null,
    validUntil: (user.subscriptionExpiresAt as string) || null,
    subscriptionExpiresAt: (user.subscriptionExpiresAt as string) || null,
    paymentReference: (user.paymentReference as string) || null,
    paymentMethod: (user.paymentMethod as string) || null,
    razorpayOrderId: (user.razorpayOrderId as string) || null,
    planLabel: (user.paidPackageLabel as string) || null,
    periodLabel: (user.subscriptionPeriodLabel as string) || null,
    recentPayments: Array.isArray(user.recentPayments) ? (user.recentPayments as SubscriptionPayment[]) : [],
    recentPaymentCount: Number(user.recentPaymentCount || 0),
  };
}

export function showTrialUpgrade(user: Record<string, unknown> | null | undefined) {
  return Boolean((user?.isIndividualAccount || user?.isSchoolManagedSubscription) && user?.canSubscribeEarly && user?.trialActive);
}

export function showActiveReceipt(user: Record<string, unknown> | null | undefined) {
  return Boolean(
    (user?.isIndividualAccount || user?.isSchoolManagedSubscription) &&
      user?.subscriptionStatus === 'active' &&
      (user?.subscriptionExpiresAt || user?.lastPaidAt),
  );
}
