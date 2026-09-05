import type { FinancialDetails, School, SelectedProduct } from './types';
import type { SavedOrder } from './create-order-api';

export function savedOrderToEditState(order: SavedOrder) {
  const f = order.financial;
  const selectedSchool: School = {
    id: order.adminId,
    schoolId: order.schoolId,
    name: order.schoolName,
    city: '—',
    brand: order.brand,
  };
  const selectedProducts: SelectedProduct[] = order.products.map((p) => ({ ...p }));
  const financial: FinancialDetails = {
    orderType: (f.orderType || '') as FinancialDetails['orderType'],
    category: (f.category || '') as FinancialDetails['category'],
    paymentTerms: f.paymentTerms || '',
    paymentDueDate: f.paymentDueDate || '',
    notes: f.notes || '',
    documentUri: null,
    documentPreviewUrl: f.documentUrl || null,
    documentName: f.documentName,
    itemDiscount: f.itemDiscount || 0,
    specialDiscount: f.specialDiscount || 0,
    advanceReceived: f.advanceReceived || 0,
  };
  return { selectedSchool, selectedProducts, financial };
}
