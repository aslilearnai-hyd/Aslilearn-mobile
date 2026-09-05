import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Image,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';
import { API_BASE_URL } from '../../../src/lib/api-config';
import {
  AdminScreenShell,
  AdminSectionHeader,
  AdminGlassCard,
  AdminEmptyState,
  AdminSkeletonList,
  AdminFAB,
  AdminModalShell,
  AdminScalePressable,
  useAdminTheme,
} from '../_ui';

interface Event {
  _id?: string;
  id?: string;
  name: string;
  date: string;
  startDate?: string;
  endDate?: string;
  type?: 'event' | 'exam';
  examType?: string;
  examId?: string;
  photo?: string;
  description?: string;
}

function asArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.events)) return payload.events;
  return [];
}

function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseEventDateKey(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return toLocalDateKey(new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function resolvePhotoUrl(photo?: string): string | undefined {
  if (!photo) return undefined;
  if (photo.startsWith('http') || photo.startsWith('//')) return photo;
  if (photo.startsWith('/')) return `${API_BASE_URL}${photo}`;
  return `${API_BASE_URL}/${photo}`;
}

function formatDisplayDate(value?: string): string {
  const key = parseEventDateKey(value);
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EVENT_COLORS = ['#10b981', '#06B6D4', '#ec4899', '#818CF8', '#14B8A6', '#ef4444'];

export default function CalendarView() {
  const { colors, spacing, radius } = useAdminTheme();
  const { width: screenWidth } = useWindowDimensions();
  const calendarCellSize = useMemo(() => {
    const maxGridWidth = screenWidth >= 768 ? 392 : Math.max(280, screenWidth - 48);
    return Math.max(34, Math.floor(maxGridWidth / 7));
  }, [screenWidth]);
  const calendarGridWidth = calendarCellSize * 7;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  const [eventForm, setEventForm] = useState({
    name: '',
    date: '',
    photo: null as string | null,
    photoUrl: '',
    description: '',
  });

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const [eventsRes, examsRes] = await Promise.all([
        api.get('/api/admin/events'),
        api.get('/api/admin/exams/viewable'),
      ]);

      const calendarEvents: Event[] = [];
      const baseEvents = asArray(eventsRes?.data);
      calendarEvents.push(
        ...baseEvents.map((event: any) => ({
          ...event,
          type: 'event' as const,
          startDate: event.date,
          endDate: event.date,
        }))
      );

      const exams = asArray(examsRes?.data);
      calendarEvents.push(
        ...exams.map((exam: any) => ({
          id: `exam-${exam._id}`,
          examId: exam._id,
          name: exam.title,
          date: exam.startDate,
          startDate: exam.startDate,
          endDate: exam.endDate,
          description: exam.description,
          type: 'exam' as const,
          examType: exam.examType,
        }))
      );

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days: Date[] = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  const getEventsForDate = useCallback(
    (date: Date) => {
      const dateStr = toLocalDateKey(date);
      return events.filter((event) => {
        const start = parseEventDateKey(event.startDate || event.date);
        const end = parseEventDateKey(event.endDate || event.date);
        return dateStr >= start && dateStr <= end;
      });
    },
    [events]
  );

  const monthlyEvents = useMemo(() => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startMs = monthStart.getTime();
    const endMs = monthEnd.getTime();

    return events
      .filter((event) => {
        const eventStart = new Date(parseEventDateKey(event.startDate || event.date)).getTime();
        const eventEnd = new Date(parseEventDateKey(event.endDate || event.date)).getTime();
        return eventStart <= endMs && eventEnd >= startMs;
      })
      .sort((a, b) => {
        const aTime = new Date(parseEventDateKey(a.startDate || a.date)).getTime();
        const bTime = new Date(parseEventDateKey(b.startDate || b.date)).getTime();
        return aTime - bTime;
      });
  }, [events, currentDate]);

  const monthlyEventsByDate = useMemo(() => {
    const grouped = monthlyEvents.reduce<Record<string, Event[]>>((acc, event) => {
      const key = parseEventDateKey(event.startDate || event.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [monthlyEvents]);

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const isCurrentMonth = (date: Date) =>
    date.getMonth() === currentDate.getMonth() &&
    date.getFullYear() === currentDate.getFullYear();

  const getEventColor = (event: Event, index: number) => {
    if (event.type === 'exam') return colors.primary;
    return EVENT_COLORS[index % EVENT_COLORS.length];
  };

  const openAddEvent = (date: Date) => {
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDate(normalizedDate);
    setEventForm({
      name: '',
      date: toLocalDateKey(normalizedDate),
      photo: null,
      photoUrl: '',
      description: '',
    });
    setIsEditMode(false);
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventSubmit = async () => {
    if (!eventForm.name.trim() || !eventForm.date) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', eventForm.name.trim());
      formData.append('date', eventForm.date);
      formData.append('description', eventForm.description || '');

      if (eventForm.photo) {
        formData.append('photo', {
          uri: eventForm.photo,
          type: 'image/jpeg',
          name: 'photo.jpg',
        } as any);
      }

      const eventId = editingEvent?._id || editingEvent?.id;
      const url = isEditMode && eventId
        ? `/api/admin/events/${eventId}`
        : '/api/admin/events';

      await api.request({
        url,
        method: isEditMode ? 'put' : 'post',
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Success', isEditMode ? 'Event updated successfully' : 'Event created successfully');
      setIsEventModalOpen(false);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      console.error('Error saving event:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save event');
    }
  };

  const handleDeleteEvent = (event: Event) => {
    if (event.type === 'exam') return;

    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const eventId = event._id || event.id;
            await api.delete(`/api/admin/events/${eventId}`);
            Alert.alert('Success', 'Event deleted successfully');
            setIsViewModalOpen(false);
            fetchEvents();
          } catch {
            Alert.alert('Error', 'Failed to delete event');
          }
        },
      },
    ]);
  };

  const handleEditEvent = (event: Event) => {
    if (event.type === 'exam') return;
    setEditingEvent(event);
    setIsEditMode(true);
    setEventForm({
      name: event.name,
      date: parseEventDateKey(event.date),
      photo: null,
      photoUrl: resolvePhotoUrl(event.photo) || '',
      description: event.description || '',
    });
    setSelectedDate(new Date(parseEventDateKey(event.date)));
    setIsViewModalOpen(false);
    setIsEventModalOpen(true);
  };

  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsViewModalOpen(true);
  };

  const resetForm = () => {
    setEventForm({
      name: '',
      date: selectedDate ? toLocalDateKey(selectedDate) : '',
      photo: null,
      photoUrl: '',
      description: '',
    });
    setIsEditMode(false);
    setEditingEvent(null);
  };

  if (isLoading && !refreshing) {
    return <AdminSkeletonList count={4} />;
  }

  return (
    <>
    <AdminScreenShell refreshing={refreshing} onRefresh={onRefresh}>
      <AdminSectionHeader
        icon="calendar"
        title="Calendar"
        subtitle="Manage and view your events"
        action={
          <AdminScalePressable
            onPress={() => setCurrentDate(new Date())}
            style={[styles.todayButton, { borderColor: colors.surfaceBorder, borderRadius: radius.sm, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.todayButtonText, { color: colors.text }]}>Today</Text>
          </AdminScalePressable>
        }
      />

      <AdminGlassCard noAnimation style={{ marginBottom: spacing.md }}>
        <View style={styles.calendarNav}>
          <AdminScalePressable
            onPress={() =>
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
            }
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </AdminScalePressable>
          <Text style={[styles.monthText, { color: colors.text }]}>
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <AdminScalePressable
            onPress={() =>
              setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
            }
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </AdminScalePressable>
        </View>

        <View style={[styles.miniGrid, { width: calendarGridWidth, alignSelf: 'center' }]}>
          {DAY_NAMES.map((day) => (
            <View key={day} style={[styles.dayHeader, { width: calendarCellSize }]}>
              <Text style={[styles.dayHeaderText, { color: colors.textMuted }]}>{day.slice(0, 1)}</Text>
            </View>
          ))}
          {calendarDays.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);

            return (
              <Pressable
                key={`${toLocalDateKey(date)}-${index}`}
                style={[
                  styles.miniDay,
                  { width: calendarCellSize, height: calendarCellSize },
                  !isCurrentMonthDay && styles.miniDayOtherMonth,
                  isTodayDate && {
                    backgroundColor: colors.primaryMuted,
                    borderWidth: 1,
                    borderColor: colors.primary,
                    borderRadius: radius.sm,
                  },
                ]}
                onPress={() => openAddEvent(date)}
              >
                <Text
                  style={[
                    styles.miniDayNumber,
                    { color: colors.textSecondary },
                    !isCurrentMonthDay && { color: colors.textMuted },
                    isTodayDate && { color: colors.primary, fontWeight: '800' },
                  ]}
                >
                  {date.getDate()}
                </Text>
                {dayEvents.length > 0 ? (
                  <View style={styles.dotRow}>
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <View
                        key={event._id || event.id || i}
                        style={[styles.dot, { backgroundColor: getEventColor(event, i) }]}
                      />
                    ))}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </AdminGlassCard>

      <View style={styles.agendaSection}>
        <View style={styles.agendaHeader}>
          <Text style={[styles.agendaTitle, { color: colors.text }]}>This Month</Text>
          <Text style={[styles.agendaCount, { color: colors.primary }]}>{monthlyEvents.length} scheduled</Text>
        </View>

        {monthlyEventsByDate.length === 0 ? (
          <AdminEmptyState
            icon="calendar-outline"
            title="No Events This Month"
            message="No events or exams scheduled this month."
            action={
              <AdminScalePressable
                onPress={() => openAddEvent(new Date())}
                style={[styles.emptyAddBtn, { backgroundColor: colors.primary, borderRadius: radius.sm }]}
              >
                <Text style={[styles.emptyAddBtnText, { color: colors.textInverse }]}>Add Event</Text>
              </AdminScalePressable>
            }
          />
        ) : (
          monthlyEventsByDate.map(([dateKey, dayEvents]) => (
            <View key={dateKey} style={styles.agendaDayGroup}>
              <Text style={[styles.agendaDayLabel, { color: colors.primary }]}>
                {formatDisplayDate(dateKey)}
              </Text>
              {dayEvents.map((event, idx) => (
                <AdminScalePressable
                  key={event._id || event.id || `${event.name}-${idx}`}
                  onPress={() => handleViewEvent(event)}
                  style={[
                    styles.agendaItem,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <View style={[styles.agendaStripe, { backgroundColor: getEventColor(event, idx) }]} />
                  <View style={styles.agendaItemBody}>
                    <View style={styles.agendaItemTop}>
                      <View style={styles.agendaItemTitleWrap}>
                        <Text style={[styles.agendaItemTitle, { color: colors.text }]} numberOfLines={2}>
                          {event.type === 'exam' ? `Exam: ${event.name}` : event.name}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor:
                              event.type === 'exam' ? colors.primaryMuted : colors.warningMuted,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            {
                              color: event.type === 'exam' ? colors.primary : colors.warning,
                            },
                          ]}
                        >
                          {event.type === 'exam' ? 'Exam' : 'Event'}
                        </Text>
                      </View>
                    </View>
                    {event.description ? (
                      <Text style={[styles.agendaItemDesc, { color: colors.textMuted }]} numberOfLines={2}>
                        {event.description}
                      </Text>
                    ) : null}
                    {event.endDate &&
                    parseEventDateKey(event.endDate) !== parseEventDateKey(event.startDate || event.date) ? (
                      <Text style={[styles.agendaItemRange, { color: colors.primary }]}>
                        {formatDisplayDate(event.startDate || event.date)} – {formatDisplayDate(event.endDate)}
                      </Text>
                    ) : null}
                  </View>
                </AdminScalePressable>
              ))}
            </View>
          ))
        )}
      </View>
    </AdminScreenShell>

    <AdminFAB onPress={() => openAddEvent(new Date())} icon="add" />

    <AdminModalShell
      visible={isEventModalOpen}
      title={isEditMode ? 'Edit Event' : 'Add Event'}
      onClose={() => { setIsEventModalOpen(false); resetForm(); }}
      noAnimation
    >
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 400 }}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Event Name *</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
            value={eventForm.name}
            onChangeText={(text) => setEventForm({ ...eventForm, name: text })}
            placeholder="Enter Event Name"
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date * (YYYY-MM-DD)</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
            value={eventForm.date}
            onChangeText={(text) => setEventForm({ ...eventForm, date: text })}
            placeholder="2026-06-07"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
            value={eventForm.description}
            onChangeText={(text) => setEventForm({ ...eventForm, description: text })}
            placeholder="Enter Event Description"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>
        <View style={styles.modalActions}>
          <AdminScalePressable
            onPress={() => { setIsEventModalOpen(false); resetForm(); }}
            style={[styles.button, { backgroundColor: colors.bgElevated, borderRadius: radius.sm }]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
          </AdminScalePressable>
          <AdminScalePressable
            onPress={handleEventSubmit}
            style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius.sm }]}
          >
            <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
              {isEditMode ? 'Update Event' : 'Create Event'}
            </Text>
          </AdminScalePressable>
        </View>
      </ScrollView>
    </AdminModalShell>

    <AdminModalShell
      visible={isViewModalOpen}
      title={selectedEvent?.name || 'Event'}
      onClose={() => setIsViewModalOpen(false)}
    >
      <ScrollView style={{ maxHeight: 440 }}>
        {selectedEvent?.photo ? (
          <Image source={{ uri: resolvePhotoUrl(selectedEvent.photo) }} style={[styles.viewPhoto, { borderRadius: radius.sm }]} />
        ) : null}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
          <Text style={[styles.viewText, { color: colors.text }]}>
            {formatDisplayDate(selectedEvent?.startDate || selectedEvent?.date)}
          </Text>
        </View>
        {selectedEvent?.endDate &&
        parseEventDateKey(selectedEvent.endDate) !== parseEventDateKey(selectedEvent.startDate || selectedEvent.date) ? (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>End Date</Text>
            <Text style={[styles.viewText, { color: colors.text }]}>{formatDisplayDate(selectedEvent.endDate)}</Text>
          </View>
        ) : null}
        {selectedEvent?.type === 'exam' ? (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
            <Text style={[styles.viewText, { color: colors.text }]}>
              Exam ({selectedEvent.examType || 'scheduled'})
            </Text>
          </View>
        ) : null}
        {selectedEvent?.description ? (
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <Text style={[styles.viewText, { color: colors.text }]}>{selectedEvent.description}</Text>
          </View>
        ) : null}
        {selectedEvent?.type !== 'exam' ? (
          <View style={styles.modalActions}>
            <AdminScalePressable
              onPress={() => selectedEvent && handleEditEvent(selectedEvent)}
              style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius.sm }]}
            >
              <Ionicons name="create" size={20} color={colors.textInverse} />
              <Text style={[styles.editButtonText, { color: colors.textInverse }]}>Edit</Text>
            </AdminScalePressable>
            <AdminScalePressable
              onPress={() => selectedEvent && handleDeleteEvent(selectedEvent)}
              style={[styles.button, { backgroundColor: colors.danger, borderRadius: radius.sm }]}
            >
              <Ionicons name="trash" size={20} color={colors.textInverse} />
              <Text style={[styles.deleteButtonText, { color: colors.textInverse }]}>Delete</Text>
            </AdminScalePressable>
          </View>
        ) : null}
      </ScrollView>
    </AdminModalShell>

    <AdminModalShell
      visible={isUrlModalOpen}
      title="Enter Image URL"
      onClose={() => setIsUrlModalOpen(false)}
    >
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Image URL</Text>
        <TextInput
          style={[styles.input, { borderColor: colors.inputBorder, color: colors.text, backgroundColor: colors.inputBg }]}
          value={imageUrlInput}
          onChangeText={setImageUrlInput}
          placeholder="https://..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>
      <View style={styles.modalActions}>
        <AdminScalePressable
          onPress={() => { setIsUrlModalOpen(false); setImageUrlInput(''); }}
          style={[styles.button, { backgroundColor: colors.bgElevated, borderRadius: radius.sm }]}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
        </AdminScalePressable>
        <AdminScalePressable
          onPress={() => {
            if (imageUrlInput.trim()) {
              setEventForm({ ...eventForm, photoUrl: imageUrlInput.trim() });
            }
            setIsUrlModalOpen(false);
            setImageUrlInput('');
          }}
          style={[styles.button, { backgroundColor: colors.primary, borderRadius: radius.sm }]}
        >
          <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>Add URL</Text>
        </AdminScalePressable>
      </View>
    </AdminModalShell>
    </>
  );
}

const styles = StyleSheet.create({
  todayButton: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  todayButtonText: { fontSize: 14, fontWeight: '600' },
  calendarNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthText: { fontSize: 18, fontWeight: '700' },
  miniGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayHeader: { alignItems: 'center', paddingVertical: 4 },
  dayHeaderText: { fontSize: 11, fontWeight: '700' },
  miniDay: { alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  miniDayOtherMonth: { opacity: 0.35 },
  miniDayNumber: { fontSize: 13, fontWeight: '600' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  agendaSection: { gap: 12 },
  agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  agendaTitle: { fontSize: 18, fontWeight: '700' },
  agendaCount: { fontSize: 12, fontWeight: '600' },
  emptyAddBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  emptyAddBtnText: { fontWeight: '700' },
  agendaDayGroup: { gap: 8 },
  agendaDayLabel: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  agendaItem: { flexDirection: 'row', borderWidth: 1 },
  agendaStripe: { width: 4 },
  agendaItemBody: { flex: 1, minWidth: 0, padding: 12, gap: 4 },
  agendaItemTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  agendaItemTitleWrap: { flex: 1, minWidth: 0 },
  agendaItemTitle: { fontSize: 15, fontWeight: '700' },
  typeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  agendaItemDesc: { fontSize: 13, lineHeight: 18 },
  agendaItemRange: { fontSize: 12, marginTop: 2 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  viewPhoto: { width: '100%', height: 220, marginBottom: 16 },
  viewText: { fontSize: 16, lineHeight: 24 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 8 },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  submitButtonText: { fontSize: 16, fontWeight: '600' },
  editButtonText: { fontSize: 16, fontWeight: '600' },
  deleteButtonText: { fontSize: 16, fontWeight: '600' },
});
