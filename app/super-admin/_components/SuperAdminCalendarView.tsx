import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassPanel } from '../../../src/components/ui';
import api from '../../../src/services/api/api';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import {
  type CalendarEventRecord,
  type CalendarAdmin,
  type QuickAddFormState,
  type ExamCalendarPrefill,
  MONTH_NAMES,
  DAY_NAMES,
  TYPE_STYLES,
  emptyQuickAddForm,
  buildCalendarDays,
  buildEventsByDateKey,
  filterMonthlyEvents,
  groupMonthlyEventsByDate,
  mapAdminFromApi,
  sortAdmins,
  buildExamPrefill,
  fetchCalendarEvents,
  createCalendarEvent,
  resolveEventSchoolLabel,
} from '../../../src/lib/super-admin-calendar';

type Props = {
  onNavigateToExams?: (prefill: ExamCalendarPrefill) => void;
};

type PickerProps = {
  visible: boolean;
  title: string;
  options: { value: string; label: string }[];
  onSelect: (value: string) => void;
  onClose: () => void;
};

function OptionPicker({ visible, title, options, onSelect, onClose }: PickerProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {options.map((item) => (
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

export default function SuperAdminCalendarView({ onNavigateToExams }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEventRecord[]>([]);
  const [admins, setAdmins] = useState<CalendarAdmin[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventRecord | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [jumpDate, setJumpDate] = useState('');

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddDate, setQuickAddDate] = useState<Date | null>(null);
  const [quickAddForm, setQuickAddForm] = useState<QuickAddFormState>(emptyQuickAddForm());
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      setIsLoadingAdmins(true);
      const response = await api.get('/api/super-admin/admins');
      const data = response?.data;
      const list = Array.isArray(data) ? data : data?.data || [];
      setAdmins(
        list
          .map((admin: Record<string, unknown>) => mapAdminFromApi(admin))
          .filter((a: CalendarAdmin) => a.id)
      );
    } catch {
      Alert.alert('Error', 'Failed to fetch schools.');
      setAdmins([]);
    } finally {
      setIsLoadingAdmins(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    try {
      setIsLoadingEvents(true);
      const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      const list = await fetchCalendarEvents(month, selectedSchoolId);
      setEvents(list);
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || 'Failed to load calendar.');
      setEvents([]);
    } finally {
      setIsLoadingEvents(false);
      setRefreshing(false);
    }
  }, [currentDate, selectedSchoolId]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const calendarDays = useMemo(() => buildCalendarDays(currentDate), [currentDate]);
  const eventsByDateKey = useMemo(
    () => buildEventsByDateKey(events, calendarDays),
    [events, calendarDays]
  );
  const monthlyEvents = useMemo(
    () => filterMonthlyEvents(events, currentDate),
    [events, currentDate]
  );
  const monthlyEventsByDate = useMemo(
    () => groupMonthlyEventsByDate(monthlyEvents),
    [monthlyEvents]
  );

  const sortedAdmins = useMemo(() => sortAdmins(admins), [admins]);
  const selectedAdmin = sortedAdmins.find((a) => (a.id || a._id) === selectedSchoolId);
  const selectedSchoolLabel =
    selectedAdmin?.schoolName || selectedAdmin?.name || selectedAdmin?.email || '';

  const schoolOptions = useMemo(
    () => [
      { value: 'all', label: 'All Schools' },
      ...sortedAdmins.map((a) => ({
        value: a.id || a._id || '',
        label: a.schoolName || a.name || a.email,
      })),
    ],
    [sortedAdmins]
  );

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();
  const isCurrentMonth = (date: Date) =>
    date.getMonth() === currentDate.getMonth() &&
    date.getFullYear() === currentDate.getFullYear();

  const goToPreviousMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());
  const goToDate = () => {
    if (!jumpDate) return;
    const [y, m, d] = jumpDate.split('-').map(Number);
    if (!y || !m || !d) return;
    setCurrentDate(new Date(y, m - 1, d));
  };

  const openQuickAdd = (date: Date) => {
    setQuickAddDate(date);
    setQuickAddForm(emptyQuickAddForm(date));
    setQuickAddOpen(true);
  };

  const handleViewEvent = (event: CalendarEventRecord) => {
    setSelectedEvent(event);
    setIsViewOpen(true);
  };

  const goToExamWithDate = (date: Date) => {
    const prefill = buildExamPrefill(date, selectedSchoolId);
    onNavigateToExams?.(prefill);
    setQuickAddOpen(false);
  };

  const saveCustomEvent = async () => {
    if (selectedSchoolId === 'all') {
      Alert.alert('Select school', 'Please select a specific school before adding events.');
      return;
    }
    if (!quickAddForm.title.trim() || !quickAddForm.date) {
      Alert.alert('Validation', 'Event title and date are required.');
      return;
    }
    setIsSavingCustom(true);
    try {
      const [yy, mm, dd] = quickAddForm.date.split('-').map(Number);
      const [startHour, startMinute] = quickAddForm.startTime.split(':').map(Number);
      const [endHour, endMinute] = quickAddForm.endTime.split(':').map(Number);
      const start = new Date(yy, mm - 1, dd, startHour || 0, startMinute || 0, 0, 0);
      const end = new Date(yy, mm - 1, dd, endHour || 0, endMinute || 0, 0, 0);
      if (end <= start) {
        Alert.alert('Invalid time range', 'End time must be later than start time.');
        setIsSavingCustom(false);
        return;
      }
      const priorityLabel =
        quickAddForm.priority.charAt(0).toUpperCase() + quickAddForm.priority.slice(1);
      const composedDescription = [`Priority: ${priorityLabel}`, quickAddForm.notes.trim()]
        .filter(Boolean)
        .join('\n\n');
      const data = await createCalendarEvent({
        title: quickAddForm.title.trim(),
        schoolId: selectedSchoolId,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        eventKind: quickAddForm.category,
        description: composedDescription,
      });
      if (data?.success) {
        Alert.alert('Saved', 'Event added to calendar.');
        setQuickAddOpen(false);
        setQuickAddDate(null);
        loadEvents();
      } else {
        Alert.alert('Error', data?.message || 'Failed to save event.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.friendlyMessage || err?.response?.data?.message || 'Failed to save event.');
    } finally {
      setIsSavingCustom(false);
    }
  };

  const isLoading = isLoadingAdmins || isLoadingEvents;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      nestedScrollEnabled
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>School Calendar</Text>
          <Text style={styles.subtitle}>
            Exams, holidays, and events by school. Exams sync from Exam Management.
          </Text>
        </View>
        <Pressable style={styles.todayBtn} onPress={goToToday}>
          <Text style={styles.todayBtnText}>Today</Text>
        </Pressable>
      </View>

      <GlassPanel style={styles.card} radius={12} tone="medium">
        <View style={styles.schoolFilterRow}>
          <Ionicons name="business-outline" size={20} color="#6b7280" />
          <View style={{ flex: 1 }}>
            <Text style={styles.formLabel}>School filter</Text>
            <Pressable style={styles.pickerField} onPress={() => setSchoolPickerOpen(true)}>
              <Text style={styles.pickerValue}>
                {schoolOptions.find((o) => o.value === selectedSchoolId)?.label || 'All Schools'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#5B6779" />
            </Pressable>
          </View>
        </View>
        <View style={styles.legendRow}>
          {(Object.keys(TYPE_STYLES) as Array<keyof typeof TYPE_STYLES>).map((type) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: TYPE_STYLES[type].dot }]} />
              <Text style={styles.legendText}>{TYPE_STYLES[type].label}</Text>
            </View>
          ))}
        </View>
        {selectedSchoolId !== 'all' && selectedAdmin && (
          <View style={styles.filteredSchoolBox}>
            <Text style={styles.filteredSchoolTitle}>
              Filtered school: {selectedAdmin.schoolName || selectedAdmin.name}
            </Text>
            <Text style={styles.filteredSchoolEmail}>{selectedAdmin.email}</Text>
          </View>
        )}
      </GlassPanel>

      <GlassPanel style={styles.card} radius={12} tone="medium">
        <View style={styles.monthNav}>
          <Pressable
            style={styles.navBtn}
            onPress={goToPreviousMonth}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={20} color="#374151" />
          </Pressable>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <Pressable
            style={styles.navBtn}
            onPress={goToNextMonth}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={20} color="#374151" />
          </Pressable>
        </View>
        <View style={styles.jumpRow}>
          <TextInput
            style={styles.jumpInput}
            value={jumpDate}
            onChangeText={setJumpDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#5B6779"
          />
          <Pressable style={styles.jumpBtn} onPress={goToDate}>
            <Text style={styles.jumpBtnText}>Go</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>Loading calendar…</Text>
          </View>
        ) : (
          <>
            <View style={styles.gridWrap}>
              <View style={styles.dayHeaderRow}>
                {DAY_NAMES.map((day) => (
                  <Text key={day} style={styles.dayHeader}>{day.slice(0, 2)}</Text>
                ))}
              </View>
              <View style={styles.grid}>
                {Array.from({ length: 6 }, (_, rowIndex) => (
                  <View key={`week-row-${rowIndex}`} style={styles.gridRow}>
                    {calendarDays.slice(rowIndex * 7, rowIndex * 7 + 7).map((date, colIndex) => {
                  const index = rowIndex * 7 + colIndex;
                  const dayEvents = eventsByDateKey[date.toDateString()] || [];
                  const inMonth = isCurrentMonth(date);
                  const today = isToday(date);
                  return (
                    <View
                      key={index}
                      style={[
                        styles.dayCell,
                        !inMonth && styles.dayCellMuted,
                        today && styles.dayCellToday,
                      ]}
                    >
                      <View style={styles.dayCellTop}>
                        <Text style={[styles.dayNumber, today && styles.dayNumberToday, !inMonth && styles.dayNumberMuted]}>
                          {date.getDate()}
                        </Text>
                        <Pressable
                          style={styles.addDayBtn}
                          onPress={() => openQuickAdd(date)}
                          accessibilityRole="button"
                          accessibilityLabel={`Add event on ${date.toDateString()}`}
                        >
                          <Ionicons name="add" size={14} color="#64748b" />
                        </Pressable>
                      </View>
                      {dayEvents.slice(0, 2).map((ev) => {
                        const st = TYPE_STYLES[ev.type] || TYPE_STYLES.custom;
                        return (
                          <Pressable
                            key={ev.id}
                            style={[styles.eventPill, { backgroundColor: st.bar }]}
                            onPress={() => handleViewEvent(ev)}
                          >
                            <Text style={styles.eventPillText} numberOfLines={1}>{ev.title}</Text>
                          </Pressable>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <Text style={styles.moreText}>+{dayEvents.length - 2}</Text>
                      )}
                    </View>
                  );
                })}
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sectionDivider} />
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming This Month</Text>
              <Text style={styles.sectionCount}>{monthlyEvents.length} scheduled</Text>
            </View>
            {monthlyEventsByDate.length === 0 ? (
              <Text style={styles.emptyText}>No events or exams scheduled this month.</Text>
            ) : (
              monthlyEventsByDate.map(([dateKey, dayEvents]) => (
                <GlassPanel key={dateKey} style={styles.dayGroup} radius={10} tone="medium">
                  <Text style={styles.dayGroupTitle}>
                    {new Date(dateKey).toLocaleDateString(undefined, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  {dayEvents.map((event) => {
                    const style = TYPE_STYLES[event.type] || TYPE_STYLES.custom;
                    return (
                      <Pressable key={event.id} style={styles.listEvent} onPress={() => handleViewEvent(event)}>
                        <View style={styles.listEventTop}>
                          <View style={styles.listEventTitleWrap}>
                            <Text style={styles.listEventTitle} numberOfLines={2}>{event.title}</Text>
                          </View>
                          <View style={[styles.typeBadge, { backgroundColor: style.dot }]}>
                            <Text style={styles.typeBadgeText}>{style.label}</Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </GlassPanel>
              ))
            )}

            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>This Month Events</Text>
            {monthlyEvents.length === 0 ? (
              <Text style={styles.emptyText}>No events or exams scheduled this month.</Text>
            ) : (
              monthlyEvents.map((event) => {
                const start = new Date(event.startDate);
                const end = new Date(event.endDate);
                const isRange = start.toDateString() !== end.toDateString();
                const style = TYPE_STYLES[event.type] || TYPE_STYLES.custom;
                return (
                  <GlassPanel key={`flat-${event.id}`} style={styles.flatEvent} radius={10} tone="medium">
                    {/* Padding rides on the Pressable so the tap target stays the full card. */}
                    <Pressable style={styles.flatEventInner} onPress={() => handleViewEvent(event)}>
                      <View style={styles.listEventTop}>
                        <View style={styles.listEventTitleWrap}>
                          <Text style={styles.listEventTitle} numberOfLines={2}>{event.title}</Text>
                        </View>
                        <View style={[styles.typeBadge, { backgroundColor: style.dot }]}>
                          <Text style={styles.typeBadgeText}>{style.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.flatEventDate}>
                        {start.toLocaleDateString()}
                        {isRange ? ` - ${end.toLocaleDateString()}` : ''}
                      </Text>
                    </Pressable>
                  </GlassPanel>
                );
              })
            )}
          </>
        )}
      </GlassPanel>

      {/* Quick Add Modal */}
      <Modal visible={quickAddOpen} animationType="slide" onRequestClose={() => setQuickAddOpen(false)}>
        <View style={styles.formModalWrap}>
          <View style={styles.formModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.formModalTitle}>Add Event</Text>
              <Text style={styles.formModalSubtitle}>
                {quickAddDate?.toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <Pressable
              onPress={() => setQuickAddOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close add event"
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          <ScrollView style={styles.formModalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.quickAddTopRow}>
              <Text style={styles.formHint}>Fill event details and save to calendar.</Text>
              <Pressable
                style={styles.examInsteadBtn}
                onPress={() => quickAddDate && goToExamWithDate(quickAddDate)}
              >
                <Ionicons name="book-outline" size={16} color="#2563eb" />
                <Text style={styles.examInsteadText}>Add Exam Instead</Text>
              </Pressable>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Event title *</Text>
              <TextInput
                style={styles.formInput}
                value={quickAddForm.title}
                onChangeText={(v) => setQuickAddForm((p) => ({ ...p, title: v }))}
                placeholder="Enter event title"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date *</Text>
              <TextInput
                style={styles.formInput}
                value={quickAddForm.date}
                onChangeText={(v) => setQuickAddForm((p) => ({ ...p, date: v }))}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Start time</Text>
                <TextInput
                  style={styles.formInput}
                  value={quickAddForm.startTime}
                  onChangeText={(v) => setQuickAddForm((p) => ({ ...p, startTime: v }))}
                  placeholder="09:00"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>End time</Text>
                <TextInput
                  style={styles.formInput}
                  value={quickAddForm.endTime}
                  onChangeText={(v) => setQuickAddForm((p) => ({ ...p, endTime: v }))}
                  placeholder="10:00"
                />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Priority</Text>
              <Pressable style={styles.pickerField} onPress={() => setPriorityPickerOpen(true)}>
                <Text style={styles.pickerValue}>
                  {quickAddForm.priority.charAt(0).toUpperCase() + quickAddForm.priority.slice(1)}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#5B6779" />
              </Pressable>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <Pressable style={styles.pickerField} onPress={() => setCategoryPickerOpen(true)}>
                <Text style={styles.pickerValue}>
                  {quickAddForm.category === 'school_event'
                    ? 'School Event'
                    : quickAddForm.category.charAt(0).toUpperCase() + quickAddForm.category.slice(1)}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#5B6779" />
              </Pressable>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Notes / Content</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={quickAddForm.notes}
                onChangeText={(v) => setQuickAddForm((p) => ({ ...p, notes: v }))}
                multiline
                numberOfLines={4}
                placeholder="Type any notes or custom content here..."
              />
            </View>
            {selectedSchoolId === 'all' && (
              <Text style={styles.warnText}>Select a specific school first to save custom events.</Text>
            )}
          </ScrollView>
          <View style={styles.formModalFooter}>
            <Pressable style={styles.cancelButton} onPress={() => setQuickAddOpen(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.submitButton} onPress={saveCustomEvent} disabled={isSavingCustom}>
              {isSavingCustom ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Save Event</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* View Event Modal */}
      <Modal visible={isViewOpen} transparent animationType="slide" onRequestClose={() => setIsViewOpen(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { maxHeight: '85%' }]}>
            {selectedEvent && (
              <>
                <Text style={styles.viewTitle}>{selectedEvent.title}</Text>
                <Text style={styles.viewSubtitle}>
                  {TYPE_STYLES[selectedEvent.type]?.label} ·{' '}
                  {selectedEvent.type === 'exam' ? 'Linked exam' : 'Calendar entry'}
                </Text>
                <ScrollView style={{ marginTop: 12 }}>
                  <Text style={styles.viewLabel}>Start</Text>
                  <Text style={styles.viewValue}>
                    {new Date(selectedEvent.startDate).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </Text>
                  <Text style={styles.viewLabel}>End</Text>
                  <Text style={styles.viewValue}>
                    {new Date(selectedEvent.endDate).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </Text>
                  {selectedEvent.description ? (
                    <>
                      <Text style={styles.viewLabel}>Description</Text>
                      <Text style={styles.viewValue}>{selectedEvent.description}</Text>
                    </>
                  ) : null}
                  {selectedEvent.meta?.subject ? (
                    <Text style={styles.viewMeta}>
                      Subject: <Text style={{ fontWeight: '700' }}>{selectedEvent.meta.subject}</Text>
                    </Text>
                  ) : null}
                  {selectedEvent.type === 'exam' && (
                    <Text style={styles.viewMeta}>
                      School{selectedEvent.meta?.schoolNames && selectedEvent.meta.schoolNames.length > 1 ? 's' : ''}:{' '}
                      <Text style={{ fontWeight: '700' }}>
                        {resolveEventSchoolLabel(
                          selectedEvent,
                          sortedAdmins,
                          selectedSchoolId,
                          selectedSchoolLabel
                        )}
                      </Text>
                    </Text>
                  )}
                  <View style={styles.readOnlyRow}>
                    <Ionicons name="eye-outline" size={16} color="#6b7280" />
                    <Text style={styles.readOnlyText}>Read-only</Text>
                  </View>
                </ScrollView>
              </>
            )}
            <Pressable style={styles.pickerClose} onPress={() => setIsViewOpen(false)}>
              <Text style={styles.pickerCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <OptionPicker
        visible={schoolPickerOpen}
        title="School filter"
        options={schoolOptions}
        onSelect={setSelectedSchoolId}
        onClose={() => setSchoolPickerOpen(false)}
      />
      <OptionPicker
        visible={priorityPickerOpen}
        title="Priority"
        options={[
          { value: 'low', label: 'Low' },
          { value: 'medium', label: 'Medium' },
          { value: 'high', label: 'High' },
        ]}
        onSelect={(v) => setQuickAddForm((p) => ({ ...p, priority: v as QuickAddFormState['priority'] }))}
        onClose={() => setPriorityPickerOpen(false)}
      />
      <OptionPicker
        visible={categoryPickerOpen}
        title="Category"
        options={[
          { value: 'custom', label: 'Custom' },
          { value: 'holiday', label: 'Holiday' },
          { value: 'school_event', label: 'School Event' },
        ]}
        onSelect={(v) => setQuickAddForm((p) => ({ ...p, category: v as QuickAddFormState['category'] }))}
        onClose={() => setCategoryPickerOpen(false)}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Transparent: the shared app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  todayBtn: { borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  todayBtnText: { fontWeight: '600', color: '#374151' },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  schoolFilterRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  pickerField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#fed7aa', padding: 12 },
  pickerValue: { fontSize: 15, color: '#111827', flex: 1 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6b7280' },
  filteredSchoolBox: { marginTop: 12, backgroundColor: 'rgba(255,247,237,0.55)', borderRadius: 10, padding: 12 },
  filteredSchoolTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
  filteredSchoolEmail: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  monthTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  jumpRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  jumpInput: { flex: 1, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  jumpBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  jumpBtnText: { fontWeight: '600', color: '#374151' },
  loadingBox: { alignItems: 'center', paddingVertical: 48 },
  loadingText: { marginTop: 12, color: '#6b7280' },
  gridWrap: { marginBottom: 12 },
  dayHeaderRow: { flexDirection: 'row' },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#6b7280', paddingVertical: 4 },
  grid: {},
  gridRow: { flexDirection: 'row' },
  dayCell: { flex: 1, minHeight: 72, borderWidth: 1, borderColor: '#e5e7eb', padding: 4, backgroundColor: '#FFFFFF' },
  dayCellMuted: { backgroundColor: '#f9fafb', opacity: 0.7 },
  dayCellToday: { borderColor: '#f97316', borderWidth: 2 },
  dayCellTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayNumber: { fontSize: 12, fontWeight: '600', color: '#374151' },
  dayNumberToday: { color: '#ea580c', fontWeight: '800' },
  dayNumberMuted: { color: '#5B6779' },
  addDayBtn: { padding: 2 },
  eventPill: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, marginTop: 2 },
  eventPillText: { fontSize: 8, color: '#fff', fontWeight: '600' },
  moreText: { fontSize: 8, color: '#6b7280', marginTop: 2 },
  sectionDivider: { height: 1, backgroundColor: '#e0f2fe', marginVertical: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0c4a6e' },
  sectionCount: { fontSize: 12, color: '#0284c7' },
  emptyText: { fontSize: 13, color: '#6b7280' },
  dayGroup: { borderRadius: 10, borderWidth: 1, borderColor: '#e0f2fe', padding: 10, marginBottom: 10 },
  dayGroupTitle: { fontSize: 12, fontWeight: '700', color: '#0369a1', marginBottom: 8 },
  listEvent: { backgroundColor: '#f0f9ff', borderRadius: 8, padding: 10, marginBottom: 6 },
  listEventTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  listEventTitleWrap: { flex: 1, minWidth: 0 },
  listEventTitle: { fontSize: 14, fontWeight: '600', color: '#0c4a6e' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  flatEvent: { borderRadius: 10, borderWidth: 1, borderColor: '#e0f2fe', marginBottom: 8 },
  flatEventInner: { padding: 12 },
  flatEventDate: { fontSize: 12, color: '#0284c7', marginTop: 4 },
  formModalWrap: { flex: 1, backgroundColor: '#FFFFFF' },
  formModalHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  formModalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  formModalSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  formModalBody: { flex: 1, padding: 20 },
  formModalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  quickAddTopRow: { gap: 10, marginBottom: 12 },
  formHint: { fontSize: 13, color: '#64748b' },
  examInsteadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFFFFF' },
  examInsteadText: { color: '#2563eb', fontWeight: '600', fontSize: 13 },
  formGroup: { marginBottom: 14 },
  formInput: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, fontSize: 15, color: '#111827' },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 10 },
  warnText: { fontSize: 12, color: '#b45309', marginTop: 4 },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  submitButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#f97316', alignItems: 'center' },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  viewTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  viewSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  viewLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 4 },
  viewValue: { fontSize: 14, color: '#111827' },
  viewMeta: { fontSize: 13, color: '#4b5563', marginTop: 10 },
  readOnlyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  readOnlyText: { fontSize: 13, color: '#6b7280' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  pickerTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pickerItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerItemText: { fontSize: 16, color: '#111827' },
  pickerClose: { marginTop: 12, padding: 14, alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12 },
  pickerCloseText: { fontWeight: '600', color: '#374151' },
});
