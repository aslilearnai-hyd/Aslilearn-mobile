import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  type BillingPayload,
  type PaymentRow,
  type SubscriptionRow,
  fetchBillingData,
  formatDate,
  formatInr,
  getStatusBadgeStyle,
} from '../../../src/lib/subscription-management';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import SchoolOrdersView from './SchoolOrdersView';

type MainTab = 'school-orders' | 'payments' | 'subscriptions';

function StatusBadge({ status }: { status: string }) {
  const style = getStatusBadgeStyle(status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
      <Text style={[styles.statusBadgeText, { color: style.text }]}>{status}</Text>
    </View>
  );
}

function PaymentCard({ payment }: { payment: PaymentRow }) {
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowCardHeader}>
        <Text style={styles.rowCardDate}>{formatDate(payment.createdAt)}</Text>
        <StatusBadge status={payment.status} />
      </View>
      <Text style={styles.rowCardAmount}>{formatInr(payment.amount)}</Text>
      <Text style={styles.rowCardId} numberOfLines={1}>
        {payment.id}
      </Text>
      <View style={styles.rowCardMeta}>
        <Text style={styles.rowCardMetaText}>Method: {payment.method || '—'}</Text>
      </View>
      <View style={styles.customerBlock}>
        <Text style={styles.customerEmail}>{payment.email || '—'}</Text>
        <Text style={styles.customerContact}>{payment.contact || '—'}</Text>
      </View>
    </View>
  );
}

function SubscriptionCard({ subscription }: { subscription: SubscriptionRow }) {
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowCardHeader}>
        <Text style={styles.rowCardId} numberOfLines={1}>
          {subscription.id}
        </Text>
        <StatusBadge status={subscription.status} />
      </View>
      <View style={styles.subGrid}>
        <View style={styles.subGridItem}>
          <Text style={styles.subGridLabel}>Plan</Text>
          <Text style={styles.subGridValue} numberOfLines={1}>
            {subscription.planId}
          </Text>
        </View>
        <View style={styles.subGridItem}>
          <Text style={styles.subGridLabel}>Customer</Text>
          <Text style={styles.subGridValue} numberOfLines={1}>
            {subscription.customerId}
          </Text>
        </View>
      </View>
      <View style={styles.periodBlock}>
        <Text style={styles.periodLabel}>Current Period</Text>
        <Text style={styles.periodValue}>{formatDate(subscription.currentStart)}</Text>
        <Text style={styles.periodArrow}>→ {formatDate(subscription.currentEnd)}</Text>
      </View>
      <Text style={styles.paidLeft}>
        Paid / Left: {subscription.paidCount ?? '—'} / {subscription.remainingCount ?? '—'}
      </Text>
    </View>
  );
}

export default function SubscriptionManagementView() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<BillingPayload | null>(null);
  const [error, setError] = useState('');
  const [mainTab, setMainTab] = useState<MainTab>('school-orders');
  const [schoolOrdersRefreshing, setSchoolOrdersRefreshing] = useState(false);
  const schoolOrdersRefreshRef = useRef<((isRefresh?: boolean) => Promise<void>) | null>(null);

  const loadBilling = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setError('');
      const payload = await fetchBillingData();
      setData(payload);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load billing data';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab !== 'school-orders') {
      void loadBilling();
    }
  }, [loadBilling, mainTab]);

  const handleRefresh = useCallback(async () => {
    if (mainTab === 'school-orders') {
      const refreshOrders = schoolOrdersRefreshRef.current;
      if (refreshOrders) {
        setSchoolOrdersRefreshing(true);
        try {
          await refreshOrders(true);
        } finally {
          setSchoolOrdersRefreshing(false);
        }
      }
      return;
    }
    await loadBilling(true);
  }, [loadBilling, mainTab]);

  const openRazorpayDashboard = () => {
    Linking.openURL('https://dashboard.razorpay.com/').catch(() => {
      Alert.alert('Error', 'Could not open Razorpay dashboard.');
    });
  };

  const tabs: { id: MainTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = useMemo(
    () => [
      { id: 'school-orders', label: 'School Orders', icon: 'bag-outline' },
      { id: 'payments', label: 'Payments', icon: 'card-outline' },
      { id: 'subscriptions', label: 'Subscriptions', icon: 'repeat' as const },
    ],
    [],
  );

  const isPullRefreshing = mainTab === 'school-orders' ? schoolOrdersRefreshing : refreshing;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      refreshControl={
        <RefreshControl refreshing={isPullRefreshing} onRefresh={() => void handleRefresh()} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments & Subscriptions</Text>
        <Text style={styles.headerSubtitle}>
          Manage school orders, Razorpay payments, and subscriptions.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={styles.mainTabsScroll}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.mainTab, mainTab === tab.id && styles.mainTabActive]}
            onPress={() => setMainTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={mainTab === tab.id ? '#fff' : '#6b7280'}
            />
            <Text style={[styles.mainTabText, mainTab === tab.id && styles.mainTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {mainTab === 'school-orders' ? (
        <SchoolOrdersView
          embedded
          onRegisterRefresh={(fn) => {
            schoolOrdersRefreshRef.current = fn;
          }}
        />
      ) : loading && !data ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading Payments & Subscriptions...</Text>
        </View>
      ) : (
        <>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => void loadBilling(true)}
              disabled={loading}
            >
              <Ionicons name="refresh" size={18} color="#374151" />
              <Text style={styles.actionButtonText}>{loading ? 'Loading...' : 'Refresh'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={openRazorpayDashboard}>
              <Ionicons name="open-outline" size={18} color="#374151" />
              <Text style={styles.actionButtonText}>Razorpay</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorAlert}>
              <Ionicons name="alert-circle" size={20} color="#dc2626" />
              <Text style={styles.errorAlertText}>{error}</Text>
            </View>
          ) : null}

          {data && (
            <>
              {!data.razorpayConfigured && (
                <View style={styles.warningAlert}>
                  <Ionicons name="warning" size={20} color="#92400e" />
                  <View style={styles.alertTextBlock}>
                    <Text style={styles.alertTitle}>Razorpay Not Connected</Text>
                    <Text style={styles.alertDesc}>
                      Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your server .env, then restart
                      the API.
                    </Text>
                  </View>
                </View>
              )}

              {data.razorpayError ? (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={20} color="#dc2626" />
                  <View style={styles.alertTextBlock}>
                    <Text style={styles.alertTitle}>Razorpay Error</Text>
                    <Text style={styles.errorAlertText}>{data.razorpayError}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#6ee7b7', '#059669']}
                    style={styles.statCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="cash" size={28} color="#fff" />
                    <Text style={styles.statCardLabel}>Captured Revenue</Text>
                    <Text style={styles.statCardValue}>{formatInr(data.summary.capturedAmountInr)}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#7dd3fc', '#0284c7']}
                    style={styles.statCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="card" size={28} color="#fff" />
                    <Text style={styles.statCardLabel}>Payments</Text>
                    <Text style={styles.statCardValue}>{data.summary.paymentsListed}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#c4b5fd', '#7c3aed']}
                    style={styles.statCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="repeat" size={28} color="#fff" />
                    <Text style={styles.statCardLabel}>Subscriptions</Text>
                    <Text style={styles.statCardValue}>{data.summary.subscriptionsListed}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#fdba74', '#fb923c']}
                    style={styles.statCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="checkmark-circle" size={28} color="#fff" />
                    <Text style={styles.statCardLabel}>Active</Text>
                    <Text style={styles.statCardValue}>{data.summary.activeSubscriptions}</Text>
                  </LinearGradient>
                </View>
              </View>

              {mainTab === 'payments' ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recent Payments</Text>
                  {data.payments.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>No payments returned from Razorpay.</Text>
                    </View>
                  ) : (
                    data.payments.map((payment) => <PaymentCard key={payment.id} payment={payment} />)
                  )}
                </View>
              ) : (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Subscriptions</Text>
                  {data.subscriptions.length === 0 ? (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>No subscriptions yet.</Text>
                    </View>
                  ) : (
                    data.subscriptions.map((subscription) => (
                      <SubscriptionCard key={subscription.id} subscription={subscription} />
                    ))
                  )}
                </View>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 18 },
  mainTabsScroll: { paddingHorizontal: 16, gap: 8, paddingVertical: 12 },
  mainTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mainTabActive: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
  mainTabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  mainTabTextActive: { color: '#fff' },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: { marginTop: 16, fontSize: 14, color: '#6b7280' },
  headerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#FFFFFF',
  },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  warningAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,251,235,0.55)',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  alertTextBlock: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 4 },
  alertDesc: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  errorAlertText: { flex: 1, fontSize: 13, color: '#991b1b', lineHeight: 18 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
  },
  statCardGradient: { padding: 14, minHeight: 110 },
  statCardLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 8, marginBottom: 4 },
  statCardValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  section: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  emptyBox: {
    padding: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  rowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  rowCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  rowCardDate: { fontSize: 12, color: '#6b7280', flex: 1 },
  rowCardAmount: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 4 },
  rowCardId: { fontSize: 11, fontFamily: 'monospace', color: '#374151', marginBottom: 8 },
  rowCardMeta: { marginBottom: 8 },
  rowCardMetaText: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize' },
  customerBlock: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  customerEmail: { fontSize: 13, color: '#111827' },
  customerContact: { fontSize: 12, color: '#5B6779', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  subGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  subGridItem: { flex: 1 },
  subGridLabel: { fontSize: 11, color: '#5B6779', marginBottom: 2 },
  subGridValue: { fontSize: 12, fontFamily: 'monospace', color: '#374151' },
  periodBlock: { marginBottom: 8 },
  periodLabel: { fontSize: 11, color: '#5B6779', marginBottom: 4 },
  periodValue: { fontSize: 12, color: '#111827' },
  periodArrow: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  paidLeft: { fontSize: 13, color: '#374151', fontWeight: '600' },
});
