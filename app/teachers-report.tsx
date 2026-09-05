import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import TeacherDiaryFeed from '../src/components/student/TeacherDiaryFeed';
import StudentScreenHeader from '../src/components/student/StudentScreenHeader';
import { setStudentDashboardTabIntent } from '../src/lib/dashboard-tab-intent';
import { useSchoolOnlyGuard } from '../src/components/b2c/SchoolOnlyGuard';

export default function TeachersReportScreen() {
  const blocked = useSchoolOnlyGuard();
  const router = useRouter();
  const handlingBack = useRef(false);

  const goBack = useCallback(() => {
    if (handlingBack.current) return;
    handlingBack.current = true;
    setStudentDashboardTabIntent('home');
    router.replace('/dashboard');
    setTimeout(() => {
      handlingBack.current = false;
    }, 350);
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  if (blocked) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StudentScreenHeader
        title="Teachers' Report"
        subtitle="Daily class updates from teachers."
        onBack={goBack}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TeacherDiaryFeed showHeader={false} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
});
