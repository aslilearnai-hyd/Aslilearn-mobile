import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import ScheduleView from '../dashboard/_components/ScheduleView';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import StudentScreenHeader from '../../src/components/student/StudentScreenHeader';
import { STUDENT_SPACING } from '../../src/theme/student';

export default function StudentScheduleScreen() {
  useBackNavigation('/dashboard', false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <StudentScreenHeader
        title="Study Schedule"
        onBack={() => router.back()}
        rightLabel="Timetable"
        onRightPress={() => router.push('/student/timetable')}
      />
      <View style={styles.body}>
        <ScheduleView />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  body: { flex: 1, paddingHorizontal: STUDENT_SPACING.lg },
});
