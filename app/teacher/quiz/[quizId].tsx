import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { TEACHER } from '../../../src/theme/teacher';

/** Teacher platform Quiz was removed — send users back to the dashboard. */
export default function TeacherPlatformQuizTakeScreen() {
  useEffect(() => {
    router.replace('/teacher/dashboard' as any);
  }, []);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={TEACHER.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: TEACHER.bg },
});
