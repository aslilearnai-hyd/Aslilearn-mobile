import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SubjectPickerModalProps = {
  visible: boolean;
  subjects: string[];
  selected: string;
  onSelect: (subject: string) => void;
  onClose: () => void;
  accentColor?: string;
};

export default function SubjectPickerModal({
  visible,
  subjects,
  selected,
  onSelect,
  onClose,
  accentColor = '#3b82f6',
}: SubjectPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close subject picker"
      >
        <Pressable
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
        >
          <Text style={styles.title}>Select subject</Text>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {subjects.map((subject) => {
              const active = subject === selected;
              return (
                <Pressable
                  key={subject}
                  style={[styles.row, active && { borderColor: accentColor, backgroundColor: `${accentColor}14` }]}
                  onPress={() => {
                    onSelect(subject);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={subject}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.rowText, active && { color: accentColor, fontWeight: '700' }]}>
                    {subject}
                  </Text>
                  {active ? <Ionicons name="checkmark-circle" size={18} color={accentColor} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '55%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  rowText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
});
