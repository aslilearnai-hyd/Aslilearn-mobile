import api from '../services/api/api';

export type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  email: string;
  contact: string;
  createdAt: string | null;
  description?: string;
  orderId?: string | null;
};

export type SubscriptionRow = {
  id: string;
  status: string;
  planId: string;
  customerId: string;
  currentStart: string | null;
  currentEnd: string | null;
  paidCount?: number;
  remainingCount?: number;
};

export type BillingPayload = {
  razorpayConfigured: boolean;
  razorpayError: string | null;
  summary: {
    paymentsListed: number;
    subscriptionsListed: number;
    capturedAmountInr: number;
    activeSubscriptions: number;
  };
  payments: PaymentRow[];
  subscriptions: SubscriptionRow[];
};

export function emptyBillingPayload(): BillingPayload {
  return {
    razorpayConfigured: false,
    razorpayError: null,
    summary: {
      paymentsListed: 0,
      subscriptionsListed: 0,
      capturedAmountInr: 0,
      activeSubscriptions: 0,
    },
    payments: [],
    subscriptions: [],
  };
}

/** Handles legacy array responses and partial objects from the API. */
export function normalizeBillingPayload(raw: unknown): BillingPayload {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyBillingPayload();
  }
  const r = raw as Partial<BillingPayload> & { summary?: Partial<BillingPayload['summary']> };
  const s = r.summary;
  return {
    razorpayConfigured: Boolean(r.razorpayConfigured),
    razorpayError: r.razorpayError ?? null,
    summary: {
      paymentsListed: Number(s?.paymentsListed ?? 0),
      subscriptionsListed: Number(s?.subscriptionsListed ?? 0),
      capturedAmountInr: Number(s?.capturedAmountInr ?? 0),
      activeSubscriptions: Number(s?.activeSubscriptions ?? 0),
    },
    payments: Array.isArray(r.payments) ? r.payments : [],
    subscriptions: Array.isArray(r.subscriptions) ? r.subscriptions : [],
  };
}

export function formatInr(n: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export type StatusBadgeStyle = {
  bg: string;
  text: string;
};

export function getStatusBadgeStyle(status: string): StatusBadgeStyle {
  const s = (status || '').toLowerCase();
  if (s === 'captured' || s === 'active' || s === 'authenticated') {
    return { bg: '#059669', text: '#fff' };
  }
  if (s === 'failed' || s === 'cancelled' || s === 'halted') {
    return { bg: '#fee2e2', text: '#991b1b' };
  }
  if (s === 'authorized' || s === 'created' || s === 'pending') {
    return { bg: '#e5e7eb', text: '#374151' };
  }
  return { bg: '#f9fafb', text: '#374151' };
}

export async function fetchBillingData(): Promise<BillingPayload> {
  const response = await api.get('/api/super-admin/subscriptions');
  const json = response?.data;
  if (json?.success === false) {
    throw new Error(json.message || 'Invalid response');
  }
  const raw = json?.data ?? json;
  return normalizeBillingPayload(raw);
}
