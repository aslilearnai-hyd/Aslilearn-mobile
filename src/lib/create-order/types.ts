export type School = {
  id: string;
  schoolId: string;
  name: string;
  city: string;
  brand: string;
  state?: string;
};

export type ProductBundle = {
  id: string;
  name: string;
  classLabel: string;
  price: number;
};

export type SelectedProduct = {
  id: string;
  name: string;
  classLabel: string;
  qty: number;
  comp: number;
  price: number;
  isCustom?: boolean;
};

export type OrderType = 'Fresh' | 'Renewal' | 'Replacement';
export type OrderCategory = 'Full Adoption' | 'Partial Adoption';

export type FinancialDetails = {
  orderType: OrderType | '';
  category: OrderCategory | '';
  paymentTerms: string;
  paymentDueDate: string;
  notes: string;
  documentUri: string | null;
  documentPreviewUrl: string | null;
  documentName: string | null;
  itemDiscount: number;
  specialDiscount: number;
  advanceReceived: number;
};

export type ComputedFinancials = {
  subtotal: number;
  gst: number;
  grandTotal: number;
  balance: number;
};

export type CreateOrderState = {
  selectedSchool: School | null;
  selectedProducts: SelectedProduct[];
  financial: FinancialDetails;
  computed: ComputedFinancials;
};

export const ACADEMIC_YEAR = '2026-27';
export const GST_RATE = 0.12;

export const ORDER_TYPE_OPTIONS: OrderType[] = ['Fresh', 'Renewal', 'Replacement'];
export const CATEGORY_OPTIONS: OrderCategory[] = ['Full Adoption', 'Partial Adoption'];

export const WIZARD_STEPS = [
  { id: 1, label: 'School' },
  { id: 2, label: 'Products' },
  { id: 3, label: 'Financial' },
  { id: 4, label: 'Review' },
] as const;

export function emptyFinancial(): FinancialDetails {
  return {
    orderType: '',
    category: '',
    paymentTerms: '',
    paymentDueDate: '',
    notes: '',
    documentUri: null,
    documentPreviewUrl: null,
    documentName: null,
    itemDiscount: 0,
    specialDiscount: 0,
    advanceReceived: 0,
  };
}

export function computeFinancials(
  products: SelectedProduct[],
  itemDiscount: number,
  specialDiscount: number,
  advanceReceived: number,
): ComputedFinancials {
  const subtotal = products.reduce((sum, p) => sum + p.price * p.qty, 0);
  const discounted = Math.max(0, subtotal - itemDiscount - specialDiscount);
  const gst = discounted * GST_RATE;
  const grandTotal = discounted + gst;
  const balance = Math.max(0, grandTotal - advanceReceived);
  return { subtotal, gst, grandTotal, balance };
}

export function validateStep3Financial(state: CreateOrderState): {
  orderType?: string;
  category?: string;
  paymentDueDate?: string;
} {
  const errors: {
    orderType?: string;
    category?: string;
    paymentDueDate?: string;
  } = {};
  if (!state.financial.orderType) errors.orderType = 'Order type is required';
  if (!state.financial.category) errors.category = 'Category is required';
  if (!state.financial.paymentDueDate) errors.paymentDueDate = 'Payment due date is required';
  return errors;
}

export function formatInr(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}
