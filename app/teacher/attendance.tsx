import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import AttendanceTrackerView from './_components/AttendanceTrackerView';
import { TEACHER, TEACHER_SPACING, TEACHER_TYPO } from '../../src/theme/teacher';

export default function TeacherAttendanceScreen() {
  useBackNavigation('/teacher/dashboard', false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <LinearGradient
          colors={[...TEACHER.headerGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={TEACHER.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Attendance Tracker</Text>
        <View style={styles.backBtn} />
      </View>
      <View style={styles.body}>
        <AttendanceTrackerView />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so AppBackground's artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
    overflow: 'hidden',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...TEACHER_TYPO.section, fontSize: 18, color: TEACHER.text },
  body: { flex: 1, padding: TEACHER_SPACING.lg },
});
