import { apiFetch } from './api-config';

export type PlanPackage = 'board' | 'iit' | 'both';

export type PlanOption = {
  amountInr: number;
  listPriceInr?: number;
  discountPercent?: number;
  period: 'month' | 'year';
  label: string;
};

export type PackOptions = { month: PlanOption | null; year: PlanOption | null };

export type BillingCatalog = {
  student: Record<PlanPackage, PackOptions>;
  teacher: Record<PlanPackage, PackOptions>;
};

export type BillingConfigResponse = {
  success: boolean;
  configured: boolean;
  keyId: string;
  plans: BillingCatalog;
  message?: string;
};

export type CheckoutOrderResponse = {
  success: boolean;
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  plan?: PlanOption & { packageType?: string; role?: string };
  prefill?: { name?: string; email?: string; contact?: string };
  message?: string;
};

export type VerifyPaymentResponse = {
  success: boolean;
  message?: string;
  redirect?: string;
  subscriptionStatus?: string;
  paidPackage?: string;
  subscriptionExpiresAt?: string;
  subscriptionPeriod?: string;
  receipt?: import('./individual-subscription').SubscriptionReceipt;
};

export async function getIndividualReceipt(): Promise<{ success: boolean; receipt: import('./individual-subscription').SubscriptionReceipt }> {
  const res = await apiFetch('/api/billing/individual/receipt');
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Could not load receipt.');
  return json;
}

export async function getBillingConfig(): Promise<BillingConfigResponse> {
  const res = await apiFetch('/api/billing/config');
  const json = (await res.json()) as BillingConfigResponse;
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Could not load plans.');
  }
  return json;
}

export async function createIndividualOrder(body: {
  packageType: PlanPackage | 'school';
  period: 'month' | 'year';
  classLabel: string;
  track: string;
}): Promise<CheckoutOrderResponse> {
  const res = await apiFetch('/api/billing/individual/order', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as CheckoutOrderResponse;
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Could not start payment.');
  }
  return json;
}

export async function getSchoolStudentPlan(): Promise<any> {
  const res = await apiFetch('/api/billing/student-school-plan');
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Could not load student plan.');
  return json;
}

export async function verifyIndividualPayment(body: Record<string, unknown>): Promise<VerifyPaymentResponse> {
  const res = await apiFetch('/api/billing/individual/verify', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as VerifyPaymentResponse;
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Could not confirm payment.');
  }
  return json;
}

export async function persistStudentPlanBeforePay(
  userId: string,
  body: {
    classNumber: string;
    iitCategories: string[];
    interestedCourses: string[];
  },
): Promise<void> {
  const res = await apiFetch(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || 'Could not save your plan.');
  }
}
