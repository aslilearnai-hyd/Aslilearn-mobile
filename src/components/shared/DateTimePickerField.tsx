import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Same format as web `datetime-local` input: YYYY-MM-DDTHH:mm */
export function formatDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseDateTimeLocal(value?: string): Date {
  if (!value?.trim()) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDisplay(value?: string): string {
  if (!value?.trim()) return 'Select date & time';
  const date = parseDateTimeLocal(value);
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  placeholder?: string;
};

export default function DateTimePickerField({
  label,
  value,
  onChange,
  minimumDate,
  placeholder = 'Select date & time',
}: Props) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseDateTimeLocal(value));
  const display = useMemo(() => (value?.trim() ? formatDisplay(value) : placeholder), [value, placeholder]);

  const commit = (date: Date) => {
    onChange(formatDateTimeLocal(date));
  };

  const openAndroidPicker = (initial: Date) => {
    DateTimePickerAndroid.open({
      value: initial,
      mode: 'date',
      minimumDate,
      onChange: (event: DateTimePickerEvent, pickedDate?: Date) => {
        if (event.type === 'dismissed' || !pickedDate) return;
        DateTimePickerAndroid.open({
          value: pickedDate,
          mode: 'time',
          is24Hour: true,
          onChange: (timeEvent: DateTimePickerEvent, pickedTime?: Date) => {
            if (timeEvent.type === 'dismissed' || !pickedTime) return;
            commit(pickedTime);
          },
        });
      },
    });
  };

  const openPicker = () => {
    const initial = parseDateTimeLocal(value);
    if (Platform.OS === 'android') {
      openAndroidPicker(initial);
      return;
    }
    setDraft(initial);
    setIosOpen(true);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={styles.field}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${display}`}
        accessibilityHint="Opens the date and time picker"
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color="#6b7280"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={[styles.fieldText, !value?.trim() && styles.placeholder]} numberOfLines={2}>
          {display}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color="#9ca3af"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable
            style={styles.overlay}
            onPress={() => setIosOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={`Close ${label} picker`}
          >
            <Pressable
              style={styles.sheet}
              onPress={(e) => e.stopPropagation()}
              accessibilityViewIsModal
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{label}</Text>
                <Pressable
                  onPress={() => setIosOpen(false)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={`Close ${label} picker`}
                >
                  <Ionicons name="close" size={22} color="#6b7280" />
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="datetime"
                display="spinner"
                minimumDate={minimumDate}
                onChange={(_event, date) => {
                  if (date) setDraft(date);
                }}
              />
              <Pressable
                style={styles.doneBtn}
                onPress={() => {
                  commit(draft);
                  setIosOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Confirm ${label}`}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fieldText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  placeholder: {
    color: '#9ca3af',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  doneBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: '#f97316',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
