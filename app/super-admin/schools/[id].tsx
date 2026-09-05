import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { isUnlimitedPortalAccess } from '../../../src/lib/school-management';

function resolveLogoUrl(logoUrl?: string): string | null {
  if (!logoUrl) return null;
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `${API_BASE_URL}${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}`;
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function SchoolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ students: 0, teachers: 0 });
  const [billing, setBilling] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/super-admin/admins/${id}/school-detail`);
        const json = response?.data;
        if (!json?.success) throw new Error(json?.message || 'Failed to Load School');
        setProfile(json.data.profile);
        setStats(json.data.stats || { students: 0, teachers: 0 });
        setBilling(json.data.billing);
      } catch (err: any) {
        setError(err?.friendlyMessage || err?.message || 'Could Not Load School');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const logo = resolveLogoUrl(profile?.schoolLogo);
  const sd = profile?.schoolDetails || {};

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
          <Text style={styles.backText}>School Management</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>Loading School Details…</Text>
        </View>
      ) : error || !profile ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error || 'School Not Found'}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              {logo ? (
                <Image source={{ uri: logo }} style={styles.logo} resizeMode="contain" />
              ) : (
                <Ionicons name="school" size={32} color="#ea580c" />
              )}
            </View>
            <View style={styles.heroText}>
              <Text style={styles.title}>{profile.schoolName || profile.name}</Text>
              <Text style={styles.email}>{profile.email}</Text>
              <View style={styles.heroBadges}>
                {profile.board ? <Text style={styles.chip}>{profile.board}</Text> : null}
                {profile.state ? <Text style={styles.chip}>{profile.state}</Text> : null}
                <Text style={[styles.chip, styles.chipStatus]}>{profile.status || '—'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>On Platform</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{stats.students}</Text>
                <Text style={styles.statLbl}>Students</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{stats.teachers}</Text>
                <Text style={styles.statLbl}>Teachers</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administrator</Text>
            <DetailRow label="Name" value={profile.name} />
            <DetailRow label="Email" value={profile.email} />
            <DetailRow label="Contact Person" value={profile.contactPerson} />
            <DetailRow label="Phone" value={profile.phone} />
            <DetailRow
              label="Joined"
              value={profile.joinDate ? new Date(profile.joinDate).toLocaleString() : undefined}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address & School</Text>
            <DetailRow label="Door No." value={sd.doorNo} />
            <DetailRow label="Street" value={sd.street} />
            <DetailRow label="Area" value={sd.area} />
            <DetailRow label="City" value={sd.city} />
            <DetailRow label="District" value={sd.district} />
            <DetailRow label="State" value={sd.state || profile.state} />
            <DetailRow label="PIN" value={profile.pin} />
            <DetailRow label="Medium" value={sd.medium} />
            <DetailRow
              label="Classes"
              value={
                sd.classesFrom || sd.classesTo
                  ? `${sd.classesFrom || '—'} – ${sd.classesTo || '—'}`
                  : undefined
              }
            />
            <DetailRow label="Total Strength" value={sd.totalStrength} />
            <DetailRow label="School Type" value={sd.schoolType} />
            <DetailRow label="Place" value={profile.place} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vidya AI Chatbot Access</Text>
            <View style={styles.accessRow}>
              <Text style={styles.accessLabel}>Teachers</Text>
              <Text style={styles.accessValue}>
                {profile.vidyaEnabledForTeachers !== false ? 'On' : 'Off'}
              </Text>
            </View>
            <View style={styles.accessRow}>
              <Text style={styles.accessLabel}>Students</Text>
              <Text style={styles.accessValue}>
                {profile.vidyaEnabledForStudents !== false ? 'On' : 'Off'}
              </Text>
            </View>
            <Text style={styles.accessHint}>
              AI tools remain available when the chatbot is off. Edit the school to change access.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Portal Access</Text>
            {isUnlimitedPortalAccess(profile.permissions) ? (
              <Text style={styles.accessFull}>Full portal access — all modules enabled.</Text>
            ) : (
              <>
                <Text style={styles.accessLimited}>Limited access — enabled modules:</Text>
                {(profile.permissions || []).map((p: string) => (
                  <Text key={p} style={styles.permItem}>• {p}</Text>
                ))}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription & Billing</Text>
            {!billing?.razorpayConfigured ? (
              <Text style={styles.billingNote}>Razorpay is not configured on the server.</Text>
            ) : null}
            {billing?.razorpayError ? (
              <Text style={styles.billingError}>{billing.razorpayError}</Text>
            ) : null}
            <Text style={styles.subHeading}>Subscriptions ({billing?.subscriptions?.length || 0})</Text>
            {(billing?.subscriptions || []).length === 0 ? (
              <Text style={styles.muted}>No matching subscriptions.</Text>
            ) : (
              billing.subscriptions.map((s: any) => (
                <View key={s.id} style={styles.billingRow}>
                  <Text style={styles.billingId}>{s.id}</Text>
                  <Text style={styles.muted}>{s.status} · {s.planId}</Text>
                </View>
              ))
            )}
            <Text style={[styles.subHeading, { marginTop: 12 }]}>Payments ({billing?.payments?.length || 0})</Text>
            {(billing?.payments || []).length === 0 ? (
              <Text style={styles.muted}>No matching payments.</Text>
            ) : (
              billing.payments.map((p: any) => (
                <View key={p.id} style={styles.billingRow}>
                  <Text style={styles.billingId}>{p.amount} {p.currency}</Text>
                  <Text style={styles.muted}>{p.status} · {p.method}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  topBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#FFFFFF' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#64748b' },
  errorText: { color: '#dc2626', textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 50, height: 50 },
  heroText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  email: { fontSize: 13, color: '#64748b', marginTop: 4 },
  heroBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', color: '#475569' },
  chipStatus: { backgroundColor: 'rgba(255,247,237,0.55)', borderColor: '#fed7aa', color: '#c2410c' },
  statsCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  statsTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 24 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  statLbl: { fontSize: 12, color: '#64748b' },
  section: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
  detailRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  detailLabel: { width: 110, fontSize: 13, color: '#64748b' },
  detailValue: { flex: 1, fontSize: 13, color: '#0f172a' },
  accessFull: { fontSize: 13, color: '#065f46', backgroundColor: '#d1fae5', padding: 10, borderRadius: 8 },
  accessLimited: { fontSize: 13, color: '#92400e', backgroundColor: '#fef3c7', padding: 10, borderRadius: 8, marginBottom: 8 },
  permItem: { fontSize: 13, color: '#334155', marginLeft: 4, marginTop: 4 },
  accessRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  accessLabel: { fontSize: 13, color: '#64748b' },
  accessValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  accessHint: { fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 17 },
  billingNote: { fontSize: 12, color: '#92400e', backgroundColor: 'rgba(255,251,235,0.55)', padding: 10, borderRadius: 8, marginBottom: 8 },
  billingError: { fontSize: 12, color: '#b91c1c', backgroundColor: '#fee2e2', padding: 10, borderRadius: 8, marginBottom: 8 },
  subHeading: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 6 },
  muted: { fontSize: 12, color: '#5B6779' },
  billingRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  billingId: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
});
