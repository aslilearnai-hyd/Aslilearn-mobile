import { Redirect } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

function getDashboardByRole(role: string | null) {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  if (normalized === 'super-admin') return '/super-admin-dashboard';
  if (normalized === 'admin') return '/admin/dashboard';
  if (normalized === 'teacher') return '/teacher/dashboard';
  return '/dashboard';
}

export default function Index() {
  const { isLoading, isAuthenticated, role } = useAuth();

  if (isLoading) {
    return <View style={styles.boot} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  return <Redirect href={getDashboardByRole(role)} />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    // transparent so the app-wide pastel artwork shows during the auth check
    backgroundColor: 'transparent',
  },
});
