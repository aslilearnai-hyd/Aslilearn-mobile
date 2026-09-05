import api, { API_BASE_URL } from '../../services/api/api';
import type { CreateOrderState, SelectedProduct } from './types';
import { ACADEMIC_YEAR } from './types';

export type OrderFinancial = {
  orderType: string;
  category: string;
  paymentTerms: string;
  paymentDueDate: string;
  notes: string;
  documentName: string | null;
  documentUrl?: string | null;
  itemDiscount: number;
  specialDiscount: number;
  advanceReceived: number;
};

export type SavedOrder = {
  id: string;
  orderNumber: string;
  schoolId: string;
  adminId: string;
  schoolName: string;
  brand: string;
  academicYear: string;
  products: SelectedProduct[];
  financial: OrderFinancial;
  computed: CreateOrderState['computed'];
  status: 'draft' | 'confirmed';
  createdAt: string;
  updatedAt: string;
};

function parseMessage(json: Record<string, unknown>, status: number, fallback: string) {
  const message = json.message ?? json.error;
  if (typeof message === 'string' && message.trim()) return message;
  return `${fallback} (${status})`;
}

function normalizeSavedOrder(raw: Record<string, unknown>): SavedOrder {
  const rawId = raw.id ?? raw._id;
  const id =
    typeof rawId === 'string'
      ? rawId
      : rawId != null
        ? String(rawId)
        : '';
  return { ...(raw as unknown as SavedOrder), id };
}

function buildPayload(state: CreateOrderState, status: 'draft' | 'confirmed') {
  const { documentUri, documentPreviewUrl, ...financialRest } = state.financial;
  void documentUri;
  const documentUrl =
    documentPreviewUrl && !documentPreviewUrl.startsWith('file:')
      ? documentPreviewUrl
      : null;

  return {
    schoolId: state.selectedSchool!.schoolId,
    adminId: state.selectedSchool!.id,
    schoolName: state.selectedSchool!.name,
    brand: state.selectedSchool!.brand,
    academicYear: ACADEMIC_YEAR,
    products: state.selectedProducts,
    financial: {
      ...financialRest,
      documentName: state.financial.documentName,
      documentUrl,
    },
    computed: state.computed,
    status,
  };
}

export async function fetchOrders(status?: 'draft' | 'confirmed'): Promise<SavedOrder[]> {
  const qs = status ? `?status=${status}` : '';
  const response = await api.get(`/api/super-admin/orders${qs}`);
  const json = response?.data ?? {};
  if (json.success === false) {
    throw new Error(parseMessage(json, response.status, 'Failed to load orders'));
  }
  const rows = Array.isArray(json.data) ? json.data : [];
  return rows.map((row: Record<string, unknown>) => normalizeSavedOrder(row));
}

export async function fetchOrderById(id: string): Promise<SavedOrder> {
  const response = await api.get(`/api/super-admin/orders/${encodeURIComponent(id)}`);
  const json = response?.data ?? {};
  if (json.success === false) {
    throw new Error(parseMessage(json, response.status, 'Order not found'));
  }
  return normalizeSavedOrder(json.data as Record<string, unknown>);
}

export async function saveOrderDraft(
  state: CreateOrderState,
  orderId?: string,
): Promise<{ success: boolean; message?: string; data?: SavedOrder }> {
  const payload = buildPayload(state, 'draft');
  try {
    const response = orderId
      ? await api.put(`/api/super-admin/orders/${encodeURIComponent(orderId)}`, payload)
      : await api.post('/api/super-admin/orders/draft', payload);
    const json = response?.data ?? {};
    if (json.success !== false) {
      return {
        success: true,
        message: json.message || (orderId ? 'Draft updated' : 'Draft saved'),
        data: json.data ? normalizeSavedOrder(json.data) : undefined,
      };
    }
    return { success: false, message: parseMessage(json, response.status, 'Failed to save draft') };
  } catch (e: any) {
    return { success: false, message: e?.friendlyMessage || e?.message || 'Failed to save draft' };
  }
}

export async function confirmOrder(
  state: CreateOrderState,
  orderId?: string,
): Promise<{ success: boolean; message?: string; data?: SavedOrder }> {
  const payload = buildPayload(state, 'confirmed');
  try {
    const response = orderId
      ? await api.put(`/api/super-admin/orders/${encodeURIComponent(orderId)}`, payload)
      : await api.post('/api/super-admin/orders', payload);
    const json = response?.data ?? {};
    if (json.success !== false) {
      return {
        success: true,
        message: json.message || (orderId ? 'Order updated' : 'Order confirmed'),
        data: json.data ? normalizeSavedOrder(json.data) : undefined,
      };
    }
    return { success: false, message: parseMessage(json, response.status, 'Failed to confirm order') };
  } catch (e: any) {
    return { success: false, message: e?.friendlyMessage || e?.message || 'Failed to confirm order' };
  }
}

export async function deleteOrder(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await api.delete(`/api/super-admin/orders/${encodeURIComponent(id)}`);
    const json = response?.data ?? {};
    if (json.success !== false) {
      return { success: true, message: json.message || 'Order deleted' };
    }
    return { success: false, message: parseMessage(json, response.status, 'Failed to delete order') };
  } catch (e: any) {
    return { success: false, message: e?.friendlyMessage || e?.message || 'Failed to delete order' };
  }
}

export async function uploadOrderDocument(asset: {
  uri: string;
  name: string;
  mimeType?: string | null;
}): Promise<{ url: string; name: string }> {
  const formData = new FormData();
  formData.append('document', {
    uri: asset.uri,
    name: asset.name,
    type: asset.mimeType || 'application/octet-stream',
  } as unknown as Blob);

  const response = await api.post('/api/super-admin/orders/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const json = response?.data ?? {};
  if (json.data?.url) {
    const url = String(json.data.url).startsWith('http')
      ? json.data.url
      : `${API_BASE_URL}${json.data.url.startsWith('/') ? '' : '/'}${json.data.url}`;
    return { url, name: asset.name };
  }
  throw new Error(json.message || 'Upload failed');
}
