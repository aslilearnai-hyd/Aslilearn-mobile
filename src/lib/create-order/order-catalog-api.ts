import api from '../../services/api/api';
import type { ProductBundle } from './types';

function parseMessage(json: Record<string, unknown>, status: number, fallback: string) {
  const message = json.message ?? json.error;
  if (typeof message === 'string' && message.trim()) return message;
  return `${fallback} (${status})`;
}

function normalizeBundle(raw: Record<string, unknown>): ProductBundle {
  return {
    id: String(raw.id ?? raw.catalogId ?? ''),
    name: String(raw.name ?? ''),
    classLabel: String(raw.classLabel ?? ''),
    price: Number(raw.price) || 0,
  };
}

export async function fetchOrderCatalog(): Promise<ProductBundle[]> {
  const response = await api.get('/api/super-admin/order-catalog');
  const json = response?.data ?? {};
  if (json.success === false) {
    throw new Error(parseMessage(json, response.status, 'Failed to load catalog'));
  }
  const rows = Array.isArray(json.data) ? json.data : [];
  return rows.map((row: Record<string, unknown>) => normalizeBundle(row));
}

export async function createCatalogProduct(
  product: ProductBundle & { isCustom?: boolean },
): Promise<{ success: boolean; message?: string; data?: ProductBundle }> {
  try {
    const response = await api.post('/api/super-admin/order-catalog', {
      id: product.id,
      name: product.name,
      classLabel: product.classLabel,
      price: product.price,
      isCustom: product.isCustom ?? product.id.startsWith('custom-'),
    });
    const json = response?.data ?? {};
    if (json.success !== false) {
      return {
        success: true,
        message: json.message || 'Product added to catalog',
        data: json.data ? normalizeBundle(json.data) : product,
      };
    }
    return { success: false, message: parseMessage(json, response.status, 'Failed to add product') };
  } catch (e: any) {
    return { success: false, message: e?.friendlyMessage || e?.message || 'Failed to add product' };
  }
}

export async function updateCatalogProduct(
  id: string,
  patch: Partial<Pick<ProductBundle, 'name' | 'classLabel' | 'price'>>,
): Promise<{ success: boolean; message?: string; data?: ProductBundle }> {
  try {
    const response = await api.put(`/api/super-admin/order-catalog/${encodeURIComponent(id)}`, patch);
    const json = response?.data ?? {};
    if (json.success !== false) {
      return {
        success: true,
        message: json.message || 'Product updated',
        data: json.data ? normalizeBundle(json.data) : undefined,
      };
    }
    return { success: false, message: parseMessage(json, response.status, 'Failed to update product') };
  } catch (e: any) {
    return { success: false, message: e?.friendlyMessage || e?.message || 'Failed to update product' };
  }
}

export async function deleteCatalogProduct(
  id: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await api.delete(`/api/super-admin/order-catalog/${encodeURIComponent(id)}`);
    const json = response?.data ?? {};
    if (json.success !== false) {
      return { success: true, message: json.message || 'Product deleted' };
    }
    return { success: false, message: parseMessage(json, response.status, 'Failed to delete product') };
  } catch (e: any) {
    return { success: false, message: e?.friendlyMessage || e?.message || 'Failed to delete product' };
  }
}
