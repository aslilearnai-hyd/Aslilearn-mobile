import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setSuperAdminDashboardTabIntent } from '../../src/lib/dashboard-tab-intent';

/** Legacy route — redirects to the main super admin dashboard analytics section. */
export default function DetailedAIAnalyticsRedirect() {
  useEffect(() => {
    setSuperAdminDashboardTabIntent('analytics');
    router.replace('/super-admin-dashboard');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent: the shared app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
