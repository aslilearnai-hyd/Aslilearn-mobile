import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/api/api';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { AdminGridList, useAdminListLayout } from '../../admin/_ui';
import { GlassPanel } from '../../../src/components/ui';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import {
  type SchoolAdmin,
  type SchoolFormState,
  CURRICULUM_BOARD_OPTIONS,
  STATE_OPTIONS,
  SCHOOL_PORTAL_MODULE_GROUPS,
  SCHOOL_PORTAL_FEATURE_IDS,
  emptySchoolForm,
  schoolFormFromAdmin,
  mapAdminFromApi,
  buildCreatePayload,
  buildUpdatePayload,
  isUnlimitedPortalAccess,
  isValidOptionalPhone,
  curriculumDisplayLabel,
  normalizeCurriculumBoard,
  sanitizePhoneInput,
  sanitizePincodeInput,
  schoolAddressFieldError,
} from '../../../src/lib/school-management';

function resolveLogoUrl(logoUrl?: string): string | null {
  if (!logoUrl) return null;
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `${API_BASE_URL}${logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`}`;
}

type PickerProps = {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[] | string[];
  onSelect: (value: string) => void;
  onClose: () => void;
};

function OptionPicker({ visible, title, options, onSelect, onClose }: PickerProps) {
  const items = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {items.map((item) => (
              <Pressable
                key={item.value}
                style={styles.pickerItem}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={styles.pickerItemText}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.pickerClose} onPress={onClose}>
            <Text style={styles.pickerCloseText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type FormModalProps = {
  visible: boolean;
  mode: 'add' | 'edit';
  form: SchoolFormState;
  setForm: React.Dispatch<React.SetStateAction<SchoolFormState>>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

function SchoolFormModal({ visible, mode, form, setForm, submitting, onClose, onSubmit }: FormModalProps) {
  const [boardPicker, setBoardPicker] = useState(false);
  const [statePicker, setStatePicker] = useState(false);
  const [paymentPicker, setPaymentPicker] = useState(false);

  const setDetail = (key: keyof SchoolFormState['schoolDetails'], value: string) => {
    setForm((p) => ({ ...p, schoolDetails: { ...p.schoolDetails, [key]: value } }));
  };

  const toggleFeature = (id: string) => {
    setForm((p) => {
      const has = p.limitedFeatures.includes(id);
      return {
        ...p,
        limitedFeatures: has
          ? p.limitedFeatures.filter((f) => f !== id)
          : [...p.limitedFeatures, id],
      };
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.formModalWrap}>
        <View style={styles.formModalHeader}>
          <Text style={styles.formModalTitle}>{mode === 'add' ? 'Add New School' : 'Edit School'}</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color="#64748b" />
          </Pressable>
        </View>
        <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.formSection}>Administrator</Text>
          <TextInput style={styles.input} placeholder="Full Name *" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} />
          <TextInput style={styles.input} placeholder="Email *" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} />
          {mode === 'add' ? (
            <TextInput style={styles.input} placeholder="Password *" secureTextEntry value={form.password} onChangeText={(v) => setForm((p) => ({ ...p, password: v }))} />
          ) : null}

          <Text style={styles.formSection}>School</Text>
          <TextInput style={styles.input} placeholder="School Name *" value={form.schoolName} onChangeText={(v) => setForm((p) => ({ ...p, schoolName: v }))} />
          <Pressable style={styles.pickerTrigger} onPress={() => setBoardPicker(true)}>
            <Text style={styles.pickerTriggerText}>{curriculumDisplayLabel(form.board) || 'Select Curriculum Board *'}</Text>
            <Ionicons name="chevron-down" size={18} color="#64748b" />
          </Pressable>
          <Pressable style={styles.pickerTrigger} onPress={() => setStatePicker(true)}>
            <Text style={styles.pickerTriggerText}>{form.state || 'Select State *'}</Text>
            <Ionicons name="chevron-down" size={18} color="#64748b" />
          </Pressable>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Asli Prep Exclusive</Text>
            <Switch
              value={form.isAsliPrepExclusive}
              onValueChange={(v) => setForm((p) => ({ ...p, isAsliPrepExclusive: v }))}
              trackColor={{ true: '#f97316' }}
            />
          </View>

          <Text style={styles.formSection}>Contact</Text>
          <TextInput style={styles.input} placeholder="Contact Person" value={form.contactPerson} onChangeText={(v) => setForm((p) => ({ ...p, contactPerson: v }))} />
          <TextInput style={styles.input} placeholder="Phone (10 Digits)" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: sanitizePhoneInput(v) }))} maxLength={10} />
          <TextInput style={styles.input} placeholder="Secondary Contact" value={form.secondaryContactPerson} onChangeText={(v) => setForm((p) => ({ ...p, secondaryContactPerson: v }))} />
          <TextInput style={styles.input} placeholder="Secondary Phone" keyboardType="phone-pad" value={form.secondaryContactPhone} onChangeText={(v) => setForm((p) => ({ ...p, secondaryContactPhone: sanitizePhoneInput(v) }))} maxLength={10} />
          <TextInput
            style={styles.input}
            placeholder="PIN Code (6 Digits)"
            keyboardType="number-pad"
            maxLength={6}
            value={form.pin}
            onChangeText={(v) => setForm((p) => ({ ...p, pin: sanitizePincodeInput(v) }))}
          />

          <Text style={styles.formSection}>Address & details</Text>
          <TextInput style={styles.input} placeholder="Door No." value={form.schoolDetails.doorNo} onChangeText={(v) => setDetail('doorNo', v)} />
          <TextInput style={styles.input} placeholder="Street" value={form.schoolDetails.street} onChangeText={(v) => setDetail('street', v)} />
          <TextInput style={styles.input} placeholder="Area" value={form.schoolDetails.area} onChangeText={(v) => setDetail('area', v)} />
          <TextInput style={styles.input} placeholder="City *" value={form.schoolDetails.city} onChangeText={(v) => setDetail('city', v)} />
          <TextInput style={styles.input} placeholder="District *" value={form.schoolDetails.district} onChangeText={(v) => setDetail('district', v)} />
          <TextInput style={styles.input} placeholder="Medium" value={form.schoolDetails.medium} onChangeText={(v) => setDetail('medium', v)} />
          <View style={styles.row2}>
            <TextInput style={[styles.input, styles.halfInput]} placeholder="Class From" value={form.schoolDetails.classesFrom} onChangeText={(v) => setDetail('classesFrom', v)} />
            <TextInput style={[styles.input, styles.halfInput]} placeholder="Class To" value={form.schoolDetails.classesTo} onChangeText={(v) => setDetail('classesTo', v)} />
          </View>
          <TextInput style={styles.input} placeholder="Total Strength" keyboardType="number-pad" value={form.schoolDetails.totalStrength} onChangeText={(v) => setDetail('totalStrength', v)} />
          <TextInput style={styles.input} placeholder="School Type" value={form.schoolDetails.schoolType} onChangeText={(v) => setDetail('schoolType', v)} />

          <Text style={styles.formSection}>Admin portal access</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Unlimited Access (All Modules)</Text>
            <Switch
              value={form.accessMode === 'unlimited'}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  accessMode: v ? 'unlimited' : 'limited',
                  limitedFeatures: v ? [...SCHOOL_PORTAL_FEATURE_IDS] : p.limitedFeatures,
                }))
              }
              trackColor={{ true: '#f97316' }}
            />
          </View>
          {form.accessMode === 'limited' ? (
            <View style={styles.permBlock}>
              {SCHOOL_PORTAL_MODULE_GROUPS.map((group) => (
                <View key={group.category} style={{ marginBottom: 12 }}>
                  <Text style={styles.permCategory}>{group.category}</Text>
                  {group.modules.map((mod) => {
                    const checked = form.limitedFeatures.includes(mod.id);
                    return (
                      <Pressable key={mod.id} style={styles.permRow} onPress={() => toggleFeature(mod.id)}>
                        <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color="#f97316" />
                        <Text style={styles.permLabel}>{mod.title}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          ) : null}

          <Text style={styles.formSection}>Vidya AI chatbot access</Text>
          <Text style={styles.formHint}>
            Control whether teachers and students can use the Vidya AI chatbot. AI tools stay available when chat is off.
          </Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Vidya Chatbot For Teachers</Text>
            <Switch
              value={form.vidyaEnabledForTeachers}
              onValueChange={(v) => setForm((p) => ({ ...p, vidyaEnabledForTeachers: v }))}
              trackColor={{ true: '#f97316' }}
            />
          </View>
          <View style={[styles.switchRow, { marginBottom: mode === 'edit' ? 0 : 24 }]}>
            <Text style={styles.switchLabel}>Vidya Chatbot For Students</Text>
            <Switch
              value={form.vidyaEnabledForStudents}
              onValueChange={(v) => setForm((p) => ({ ...p, vidyaEnabledForStudents: v }))}
              trackColor={{ true: '#f97316' }}
            />
          </View>

          <Text style={styles.formSection}>Student subscription validation</Text>
          <Text style={styles.formHint}>Only students are billed. Teachers and school administrators are excluded.</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Require Yearly Student Subscription</Text>
            <Switch value={form.studentBillingEnabled} onValueChange={(v) => setForm((p) => ({ ...p, studentBillingEnabled: v }))} trackColor={{ true: '#4f46e5' }} />
          </View>
          {form.studentBillingEnabled ? <>
            <Pressable style={styles.pickerTrigger} onPress={() => setPaymentPicker(true)}><Text style={styles.pickerTriggerText}>Payment: {form.studentPaymentMode === 'both' ? 'Online or Offline' : form.studentPaymentMode === 'online' ? 'Online' : 'Offline'}</Text><Ionicons name="chevron-down" size={18} color="#64748b" /></Pressable>
            <TextInput style={styles.input} placeholder="Yearly Price (₹)" keyboardType="number-pad" value={form.studentAnnualPriceInr} onChangeText={(v) => setForm((p) => ({ ...p, studentAnnualPriceInr: v.replace(/\D/g, '') }))} />
            <TextInput style={styles.input} placeholder="Trial Days" keyboardType="number-pad" value={form.studentTrialDays} onChangeText={(v) => setForm((p) => ({ ...p, studentTrialDays: v.replace(/\D/g, '').slice(0, 3) }))} />
          </> : null}

          {mode === 'edit' ? (
            <View style={[styles.switchRow, { marginBottom: 24 }]}>
              <Text style={styles.switchLabel}>Active Account</Text>
              <Switch value={form.isActive} onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))} trackColor={{ true: '#f97316' }} />
            </View>
          ) : null}
        </ScrollView>
        <View style={styles.formFooter}>
          <Pressable style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, submitting && { opacity: 0.6 }]} onPress={onSubmit} disabled={submitting}>
            <Text style={styles.saveBtnText}>{submitting ? 'Saving…' : mode === 'add' ? 'Add School' : 'Update School'}</Text>
          </Pressable>
        </View>
      </View>
      <OptionPicker
        visible={boardPicker}
        title="Curriculum Board"
        options={[...CURRICULUM_BOARD_OPTIONS]}
        onSelect={(v) => setForm((p) => ({ ...p, board: v }))}
        onClose={() => setBoardPicker(false)}
      />
      <OptionPicker
        visible={paymentPicker}
        title="Student Payment Method"
        options={[{value:'online',label:'Online'},{value:'offline',label:'Offline'},{value:'both',label:'Online or Offline'}]}
        onSelect={(v) => setForm((p) => ({ ...p, studentPaymentMode: v as 'online' | 'offline' | 'both' }))}
        onClose={() => setPaymentPicker(false)}
      />
      <OptionPicker
        visible={statePicker}
        title="State"
        options={STATE_OPTIONS}
        onSelect={(v) => setForm((p) => ({ ...p, state: v }))}
        onClose={() => setStatePicker(false)}
      />
    </Modal>
  );
}

export default function SchoolManagementView() {
  const router = useRouter();
  const { isTablet, gridColumns, gridCellWidth } = useAdminListLayout();
  const [admins, setAdmins] = useState<SchoolAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<SchoolAdmin | null>(null);
  const [form, setForm] = useState<SchoolFormState>(emptySchoolForm());

  const fetchAdmins = useCallback(async () => {
    try {
      setError('');
      const response = await api.get('/api/super-admin/admins');
      const data = response?.data;
      const list = Array.isArray(data) ? data : data?.data || [];
      setAdmins(list.map(mapAdminFromApi));
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to Load Schools');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdmins();
  };

  const filteredAdmins = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return admins;
    const tokens = q
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s@.+_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
    return admins.filter((admin) => {
      const blob = [
        admin.schoolName,
        admin.name,
        admin.email,
        admin.state,
        admin.board,
        admin.curriculumBoard,
        curriculumDisplayLabel(admin.curriculumBoard),
        admin.phone,
        admin.contactPerson,
        admin.schoolDetails?.city,
        admin.schoolDetails?.district,
        admin.schoolDetails?.area,
        admin.isAsliPrepExclusive ? 'asli prep' : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s@.+_-]/g, ' ')
        .replace(/\s+/g, ' ');
      return tokens.every((token) => blob.includes(token));
    });
  }, [admins, searchQuery]);

  const totalStudents = admins.reduce((s, a) => s + (a.stats?.students || 0), 0);
  const totalTeachers = admins.reduce((s, a) => s + (a.stats?.teachers || 0), 0);

  const validateForm = (isAdd: boolean) => {
    const sd = form.schoolDetails;
    if (
      !form.name ||
      !form.email ||
      (isAdd && !form.password) ||
      !form.board ||
      !form.state ||
      !form.schoolName ||
      !sd.city?.trim() ||
      !sd.district?.trim()
    ) {
      Alert.alert('Required fields', 'Fill administrator, board, state, school name, city, and district.');
      return false;
    }
    if (!isValidOptionalPhone(form.phone) || !isValidOptionalPhone(form.secondaryContactPhone)) {
      Alert.alert('Invalid phone', 'Phone numbers must be 10 digits or empty.');
      return false;
    }
    const addressError = schoolAddressFieldError({
      schoolName: form.schoolName,
      city: sd.city,
      district: sd.district,
      pin: form.pin,
      doorNo: sd.doorNo,
      street: sd.street,
      area: sd.area,
    });
    if (addressError) {
      Alert.alert('Invalid school details', addressError);
      return false;
    }
    if (form.accessMode === 'limited' && form.limitedFeatures.length === 0) {
      Alert.alert('Portal access', 'Select at least one module or enable unlimited access.');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm(true)) return;
    setSubmitting(true);
    try {
      await api.post('/api/super-admin/admins', buildCreatePayload(form));
      setShowAdd(false);
      setForm(emptySchoolForm());
      await fetchAdmins();
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || err?.message || 'Failed to Add School');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingAdmin?.id || !validateForm(false)) return;
    setSubmitting(true);
    try {
      await api.put(`/api/super-admin/admins/${editingAdmin.id}`, buildUpdatePayload(form));
      setShowEdit(false);
      setEditingAdmin(null);
      setForm(emptySchoolForm());
      await fetchAdmins();
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || err?.message || 'Failed to Update School');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (admin: SchoolAdmin) => {
    Alert.alert('Delete School', `Remove ${admin.schoolName || admin.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/super-admin/admins/${admin.id}`);
            await fetchAdmins();
          } catch (err: any) {
            Alert.alert('Error', err?.friendlyMessage || 'Delete Failed');
          }
        },
      },
    ]);
  };

  const openEdit = (admin: SchoolAdmin) => {
    setEditingAdmin(admin);
    setForm(schoolFormFromAdmin(admin));
    setShowEdit(true);
  };

  const renderSchoolCard = (admin: SchoolAdmin) => {
    const logo = resolveLogoUrl(admin.schoolLogo);
    const boardLabel = curriculumDisplayLabel(
      normalizeCurriculumBoard(admin.curriculumBoard || admin.board)
    );
    return (
      // `strong` — school cards carry dense contact/board detail text.
      <GlassPanel style={[styles.card, isTablet && styles.cardTablet]} radius={16} tone="strong">
        <View style={styles.cardInner}>
        <View style={styles.cardTop}>
          <View style={styles.logoWrap}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logoImg} resizeMode="contain" />
            ) : (
              <Ionicons name="shield" size={22} color="#ea580c" />
            )}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {admin.schoolName || admin.name}
            </Text>
            {admin.schoolName && admin.name ? (
              <Text style={styles.cardMeta} numberOfLines={1}>
                Contact: {admin.name}
              </Text>
            ) : null}
            <Text style={styles.cardMeta} numberOfLines={1}>
              {admin.email}
            </Text>
            <View style={styles.badgeRow}>
              <Text style={[styles.badge, isUnlimitedPortalAccess(admin.permissions) ? styles.badgeGreen : styles.badgeAmber]}>
                {isUnlimitedPortalAccess(admin.permissions) ? 'Full Portal' : 'Limited'}
              </Text>
              <Text style={styles.badgeOutline} numberOfLines={1}>
                {boardLabel}
              </Text>
              {admin.isAsliPrepExclusive ? <Text style={styles.badgeOrange}>Asli Prep</Text> : null}
              {admin.state ? (
                <Text style={styles.badgeOutline} numberOfLines={1}>
                  {admin.state}
                </Text>
              ) : null}
            </View>
          </View>
          <Text style={[styles.statusPill, (admin.status || '').toLowerCase() === 'active' ? styles.statusActive : styles.statusInactive]}>
            {admin.status || 'inactive'}
          </Text>
        </View>

        <View style={styles.statRow}>
          <LinearGradient colors={['#fdba74', '#fb923c']} style={styles.statBox}>
            <Text style={styles.statNum}>{admin.stats?.students ?? 0}</Text>
            <Text style={styles.statLbl}>Students</Text>
          </LinearGradient>
          <LinearGradient colors={['#2dd4bf', '#14b8a6']} style={styles.statBox}>
            <Text style={styles.statNum}>{admin.stats?.teachers ?? 0}</Text>
            <Text style={styles.statLbl}>Teachers</Text>
          </LinearGradient>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText} numberOfLines={1}>
            Added: {admin.joinDate ? new Date(admin.joinDate).toLocaleDateString() : '—'}
          </Text>
          <View style={styles.actions}>
            <Pressable style={styles.iconBtn} onPress={() => router.push(`/super-admin/schools/${admin.id}`)}>
              <Ionicons name="eye-outline" size={18} color="#ea580c" />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => openEdit(admin)}>
              <Ionicons name="create-outline" size={18} color="#2563eb" />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => handleDelete(admin)}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </Pressable>
          </View>
        </View>
        </View>
      </GlassPanel>
    );
  };

  return (
    <>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>School Management</Text>
          <Text style={styles.headerSubtitle}>Manage Schools And Their Associated Data</Text>
          <GlassPanel style={styles.addRow} radius={14} tone="medium">
            <Pressable style={styles.addRowInner} onPress={() => { setForm(emptySchoolForm()); setShowAdd(true); }}>
              <Ionicons name="business-outline" size={18} color="#ea580c" />
              <Text style={styles.addRowText}>Add New School</Text>
              <Ionicons name="chevron-forward" size={18} color="#f97316" />
            </Pressable>
          </GlassPanel>
        </View>

        <View style={[styles.summaryRow, isTablet && styles.summaryRowTablet]}>
          <View style={isTablet ? styles.summarySlotTablet : styles.summarySlotMobile}>
            <LinearGradient colors={['#fdba74', '#fb923c']} style={styles.summaryCard}>
              <Ionicons name="shield-checkmark" size={22} color="#fff" />
              <Text style={styles.summaryLabel}>Total Schools</Text>
              <Text style={styles.summaryValue}>{admins.length}</Text>
            </LinearGradient>
          </View>
          <View style={isTablet ? styles.summarySlotTablet : styles.summarySlotMobile}>
            <LinearGradient colors={['#7dd3fc', '#38bdf8']} style={styles.summaryCard}>
              <Ionicons name="people" size={22} color="#fff" />
              <Text style={styles.summaryLabel}>Students</Text>
              <Text style={styles.summaryValue}>{totalStudents}</Text>
            </LinearGradient>
          </View>
          <View style={isTablet ? styles.summarySlotTablet : styles.summarySlotMobile}>
            <LinearGradient colors={['#2dd4bf', '#14b8a6']} style={styles.summaryCard}>
              <Ionicons name="school" size={22} color="#fff" />
              <Text style={styles.summaryLabel}>Teachers</Text>
              <Text style={styles.summaryValue}>{totalTeachers}</Text>
            </LinearGradient>
          </View>
        </View>

        <GlassPanel style={styles.searchWrap} radius={14} tone="strong">
          <View style={styles.searchWrapInner}>
            <Ionicons name="search" size={18} color="#5B6779" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by school, contact, email, state, board…"
              placeholderTextColor="#5B6779"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#5B6779" />
              </Pressable>
            ) : null}
          </View>
        </GlassPanel>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {isLoading ? (
          <ActivityIndicator size="large" color="#f97316" style={{ marginTop: 40 }} />
        ) : filteredAdmins.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="school-outline" size={56} color="#5B6779" />
            <Text style={styles.emptyText}>{searchQuery ? 'No Schools Match Your Search' : 'No Schools Yet'}</Text>
          </View>
        ) : isTablet ? (
          <View style={styles.listWrap}>
            <AdminGridList
              data={filteredAdmins}
              columns={gridColumns}
              gridCellWidth={gridCellWidth}
              keyExtractor={(item) => item.id}
              renderItem={(admin) => renderSchoolCard(admin)}
            />
          </View>
        ) : (
          filteredAdmins.map((admin) => (
            <View key={String(admin.id || admin._id || admin.email)}>
              {renderSchoolCard(admin)}
            </View>
          ))
        )}
      </ScrollView>

      <SchoolFormModal
        visible={showAdd}
        mode="add"
        form={form}
        setForm={setForm}
        submitting={submitting}
        onClose={() => setShowAdd(false)}
        onSubmit={handleCreate}
      />
      <SchoolFormModal
        visible={showEdit}
        mode="edit"
        form={form}
        setForm={setForm}
        submitting={submitting}
        onClose={() => { setShowEdit(false); setEditingAdmin(null); }}
        onSubmit={handleUpdate}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 14 },
  addRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  // Row layout and padding move inside the frosted panel.
  addRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  addRowText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#0f172a' },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  summaryRowTablet: { gap: 12 },
  summarySlotMobile: { flex: 1, minWidth: 0 },
  summarySlotTablet: { flex: 1, minWidth: 0, flexGrow: 1, flexShrink: 1 },
  summaryCard: { borderRadius: 14, padding: 12, alignItems: 'center', minHeight: 96, justifyContent: 'center', width: '100%' },
  summaryLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  searchWrap: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  // Row layout and padding move inside the frosted panel.
  searchWrapInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 10, paddingRight: 8, color: '#0f172a' },
  errorText: { color: '#dc2626', paddingHorizontal: 20, marginBottom: 8 },
  empty: { alignItems: 'center', padding: 40 },
  emptyText: { marginTop: 12, color: '#5B6779', textAlign: 'center' },
  listWrap: { paddingHorizontal: 20 },
  card: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  // Padding moves inside the frosted panel.
  cardInner: {
    padding: 14,
  },
  cardTablet: {
    marginHorizontal: 0,
    marginBottom: 0,
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: 'rgba(255,247,237,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: 40, height: 40 },
  cardInfo: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  cardMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeGreen: { backgroundColor: '#d1fae5', color: '#065f46' },
  badgeAmber: { backgroundColor: '#fef3c7', color: '#92400e' },
  badgeOutline: { fontSize: 10, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0', color: '#475569' },
  badgeOrange: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#ffedd5', color: '#c2410c' },
  statusPill: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, textTransform: 'capitalize' },
  statusActive: { backgroundColor: '#f97316', color: '#fff' },
  statusInactive: { backgroundColor: '#e2e8f0', color: '#64748b' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#fff' },
  statLbl: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    width: '100%',
    maxWidth: '100%',
  },
  dateText: { fontSize: 11, color: '#5B6779' },
  actions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  formModalWrap: { flex: 1, backgroundColor: '#FFFFFF' },
  formModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingTop: 48 },
  formModalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  formScroll: { flex: 1, paddingHorizontal: 16 },
  formSection: { fontSize: 13, fontWeight: '800', color: '#ea580c', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  formHint: { fontSize: 12, color: '#64748b', marginBottom: 10, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    marginBottom: 10,
    color: '#0f172a',
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
    marginBottom: 10,
  },
  pickerTriggerText: { fontSize: 15, color: '#0f172a' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#334155', flex: 1, marginRight: 12 },
  row2: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  permBlock: { marginBottom: 8 },
  permCategory: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 6 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  permLabel: { fontSize: 14, color: '#334155' },
  formFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingBottom: 32 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelBtnText: { fontWeight: '700', color: '#334155' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#f97316', alignItems: 'center' },
  saveBtnText: { fontWeight: '700', color: '#fff' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '70%' },
  pickerTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: '#0f172a' },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerItemText: { fontSize: 15, color: '#0f172a' },
  pickerClose: { marginTop: 12, padding: 14, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12 },
  pickerCloseText: { fontWeight: '700', color: '#334155' },
});
