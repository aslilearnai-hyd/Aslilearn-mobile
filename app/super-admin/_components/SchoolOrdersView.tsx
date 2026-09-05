import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  deleteOrder,
  fetchOrders,
  type SavedOrder,
} from '../../../src/lib/create-order/create-order-api';
import { formatInr } from '../../../src/lib/create-order/types';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';

type StatusFilter = 'all' | 'confirmed' | 'draft';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: SavedOrder['status'] }) {
  const confirmed = status === 'confirmed';
  return (
    <View style={[styles.badge, confirmed ? styles.badgeConfirmed : styles.badgeDraft]}>
      <Text style={[styles.badgeText, confirmed ? styles.badgeTextConfirmed : styles.badgeTextDraft]}>
        {confirmed ? 'Confirmed' : 'Draft'}
      </Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent ? { color: accent } : null]}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

export default function SchoolOrdersView({
  embedded = false,
  onRegisterRefresh,
}: {
  embedded?: boolean;
  onRegisterRefresh?: (fn: (isRefresh?: boolean) => Promise<void>) => void;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedOrder, setSelectedOrder] = useState<SavedOrder | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to Load Orders');
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    onRegisterRefresh?.(load);
  }, [load, onRegisterRefresh]);

  const stats = useMemo(() => {
    const confirmed = orders.filter((o) => o.status === 'confirmed');
    const drafts = orders.filter((o) => o.status === 'draft');
    const revenue = confirmed.reduce((s, o) => s + (o.computed.grandTotal || 0), 0);
    return { total: orders.length, confirmed: confirmed.length, drafts: drafts.length, revenue };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.schoolName.toLowerCase().includes(q) ||
        o.brand.toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const filters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: stats.total },
    { id: 'confirmed', label: 'Confirmed', count: stats.confirmed },
    { id: 'draft', label: 'Drafts', count: stats.drafts },
  ];

  const handleDelete = (order: SavedOrder) => {
    Alert.alert(
      'Delete Order?',
      `${order.orderNumber} for ${order.schoolName} will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!order.id) return;
              setDeleting(true);
              const result = await deleteOrder(order.id);
              setDeleting(false);
              if (result.success) {
                setSelectedOrder(null);
                await load(true);
                Alert.alert('Deleted', result.message || 'Order Removed');
              } else {
                Alert.alert('Error', result.message || 'Could Not Delete Order');
              }
            })();
          },
        },
      ],
    );
  };

  if (loading && orders.length === 0) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading School Orders…</Text>
      </View>
    );
  }

  const orderList = filtered.length === 0 ? (
    <View style={styles.emptyBox}>
      <Ionicons name="bag-outline" size={40} color="#fdba74" />
      <Text style={styles.emptyTitle}>
        {orders.length === 0 ? 'No Orders Yet' : 'No Matching Orders'}
      </Text>
      <Text style={styles.emptyDesc}>
        {orders.length === 0
          ? 'Create your first school order to track products and payments.'
          : 'Try a different search or filter.'}
      </Text>
      {orders.length === 0 && (
        <TouchableOpacity
          style={styles.createBtnInline}
          onPress={() => router.push('/super-admin/create-order')}
        >
          <Text style={styles.createBtnText}>Create Order</Text>
        </TouchableOpacity>
      )}
    </View>
  ) : (
    filtered.map((order) => (
      <Pressable
        key={order.id}
        style={styles.orderCard}
        onPress={() => setSelectedOrder(order)}
      >
        <View style={styles.orderCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.orderMeta}>
              {formatDate(order.createdAt)} · {order.products.length} item
              {order.products.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <StatusBadge status={order.status} />
        </View>
        <Text style={styles.schoolName}>{order.schoolName}</Text>
        <Text style={styles.brand}>{order.brand}</Text>
        <View style={styles.orderFooter}>
          <Text style={styles.orderTotal}>{formatInr(order.computed.grandTotal)}</Text>
          {order.computed.balance > 0 && (
            <Text style={styles.orderBalance}>Bal {formatInr(order.computed.balance)}</Text>
          )}
          <View style={styles.orderActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push(`/super-admin/create-order?editId=${order.id}`)}
            >
              <Ionicons name="pencil" size={18} color="#ea580c" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(order)}>
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    ))
  );

  const body = (
    <>
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/super-admin/create-order')}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.createBtnText}>Create Order</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => void load(true)}>
          <Ionicons name="refresh" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Total orders" value={stats.total} />
        <StatCard label="Confirmed" value={stats.confirmed} accent="#059669" hint="Live Orders" />
        <StatCard label="Drafts" value={stats.drafts} accent="#d97706" hint="Pending Review" />
        <StatCard label="Revenue" value={formatInr(stats.revenue)} accent="#ea580c" hint="Confirmed Total" />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={styles.filterRow}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, statusFilter === f.id && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.id)}
          >
            <Text style={[styles.filterChipText, statusFilter === f.id && styles.filterChipTextActive]}>
              {f.label} ({f.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#5B6779" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search Orders…"
          placeholderTextColor="#5B6779"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {embedded ? (
        <View style={styles.listContent}>{orderList}</View>
      ) : (
        <ScrollView
          style={styles.listScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}
          contentContainerStyle={styles.listContent}
        >
          {orderList}
        </ScrollView>
      )}
    </>
  );

  return (
    <>
      {body}

      <Modal visible={Boolean(selectedOrder)} animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
        {selectedOrder && (
          <View style={styles.detailModal}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{selectedOrder.orderNumber}</Text>
                <Text style={styles.detailSub}>{selectedOrder.schoolName}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedOrder(null)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.detailBody} contentContainerStyle={{ paddingBottom: 24 }}>
              <StatusBadge status={selectedOrder.status} />
              <View style={styles.detailGrid}>
                <Text style={styles.detailLabel}>Brand</Text>
                <Text style={styles.detailValue}>{selectedOrder.brand}</Text>
                <Text style={styles.detailLabel}>Order type</Text>
                <Text style={styles.detailValue}>{selectedOrder.financial.orderType || '—'}</Text>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{selectedOrder.financial.category || '—'}</Text>
                <Text style={styles.detailLabel}>Grand total</Text>
                <Text style={styles.detailValue}>{formatInr(selectedOrder.computed.grandTotal)}</Text>
                <Text style={styles.detailLabel}>Balance</Text>
                <Text style={[styles.detailValue, { color: '#d97706' }]}>
                  {formatInr(selectedOrder.computed.balance)}
                </Text>
              </View>
              <Text style={styles.productsTitle}>Products ({selectedOrder.products.length})</Text>
              {selectedOrder.products.map((p) => (
                <View key={p.id} style={styles.productRow}>
                  <Text style={styles.productName}>{p.name}</Text>
                  <Text style={styles.productMeta}>
                    Qty {p.qty} · {formatInr(p.price * p.qty)}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.detailFooter}>
              <TouchableOpacity
                style={styles.detailBtnOutline}
                disabled={deleting}
                onPress={() => handleDelete(selectedOrder)}
              >
                <Text style={styles.detailBtnDangerText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailBtnPrimary}
                onPress={() => {
                  setSelectedOrder(null);
                  router.push(`/super-admin/create-order?editId=${selectedOrder.id}`);
                }}
              >
                <Text style={styles.detailBtnPrimaryText}>Edit Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ea580c',
    paddingVertical: 12,
    borderRadius: 10,
  },
  createBtnInline: {
    marginTop: 16,
    backgroundColor: '#ea580c',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827', marginTop: 4 },
  statHint: { fontSize: 10, color: '#5B6779', marginTop: 2 },
  filterRow: { paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  filterChipTextActive: { color: '#fff' },
  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, minWidth: 0, height: 44, fontSize: 15, color: '#111827', paddingRight: 8 },
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48 },
  emptyBox: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginTop: 12 },
  emptyDesc: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 6, lineHeight: 20 },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  orderCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  orderNumber: { fontFamily: 'monospace', fontSize: 14, fontWeight: '700', color: '#111827' },
  orderMeta: { fontSize: 11, color: '#5B6779', marginTop: 2 },
  schoolName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  brand: { fontSize: 12, color: '#5B6779', marginTop: 2 },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  orderTotal: { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1 },
  orderBalance: { fontSize: 12, color: '#d97706', fontWeight: '600' },
  orderActions: { flexDirection: 'row', gap: 4 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeConfirmed: { backgroundColor: '#d1fae5' },
  badgeDraft: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextConfirmed: { color: '#047857' },
  badgeTextDraft: { color: '#b45309' },
  detailModal: { flex: 1, backgroundColor: '#FFFFFF' },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#ea580c',
    gap: 12,
  },
  detailTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  detailSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  detailBody: { flex: 1, padding: 16 },
  detailGrid: { marginTop: 16, gap: 8 },
  detailLabel: { fontSize: 11, color: '#5B6779', fontWeight: '600', textTransform: 'uppercase' },
  detailValue: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 },
  productsTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginTop: 8, marginBottom: 8 },
  productRow: {
    padding: 12,
    backgroundColor: 'rgba(255,247,237,0.55)',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  productName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  productMeta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  detailFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: 28,
  },
  detailBtnOutline: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  detailBtnDangerText: { color: '#dc2626', fontWeight: '700' },
  detailBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#ea580c',
    alignItems: 'center',
  },
  detailBtnPrimaryText: { color: '#fff', fontWeight: '700' },
});
