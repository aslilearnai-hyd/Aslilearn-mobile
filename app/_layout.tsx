import { Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LoadingState } from '../src/components/ui';
import AppBackground from '../src/components/ui/AppBackground';
import { QueryClientProvider } from '@tanstack/react-query';
import { usePathname, useRouter } from 'expo-router';
import { queryClient } from '../src/lib/queryClient';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AppSplash, SPLASH_DURATION_MS, SPLASH_EXIT_DURATION_MS } from '../src/components/AppSplash';
import { useMemoryCleanup } from '../src/hooks/useMemoryCleanup';
import { isSchoolOnlyStudentPath } from '../src/components/b2c/SchoolOnlyGuard';
import { isIndividualAccount } from '../src/lib/individual-signup';
import { isAndroidTv } from '../src/lib/device';

void SplashScreen.preventAutoHideAsync().catch(() => {});

function getDashboardByRole(role: string | null) {
  if (role === 'super-admin') return '/super-admin-dashboard';
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  return '/dashboard';
}

function isPublicPath(pathname: string) {
  return pathname.startsWith('/auth/login') || pathname.startsWith('/auth/register') || pathname === '/onboarding';
}

function isSubscribePath(pathname: string) {
  return pathname.startsWith('/auth/subscribe');
}

function needsIndividualPayment(user: { isIndividualAccount?: boolean; isSchoolManagedSubscription?: boolean; paymentRequired?: boolean } | null) {
  return Boolean((user?.isIndividualAccount || user?.isSchoolManagedSubscription) && user?.paymentRequired);
}

const STAFF_ROLES = ['student', 'admin', 'teacher', 'super-admin'] as const;

function canAccessPath(pathname: string, role: string | null) {
  if (!role) return false;
  if (pathname.startsWith('/super-admin/') || pathname.startsWith('/super-admin-dashboard')) return role === 'super-admin';
  if (pathname.startsWith('/admin/')) return role === 'admin';
  if (pathname === '/notifications') return true;
  if (pathname.startsWith('/teacher/')) return role === 'teacher';

  // Student app shell only — not used by admin/teacher dashboards
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/attendance') ||
    pathname.startsWith('/assignments') ||
    pathname.startsWith('/teachers-report') ||
    pathname.startsWith('/student-') ||
    pathname.startsWith('/student/')
  ) {
    return role === 'student';
  }

  // Learning paths, media, quizzes, profile — students + staff (preview from admin Learning Paths, etc.)
  if (
    pathname.startsWith('/learning-paths') ||
    pathname.startsWith('/subject/') ||
    pathname.startsWith('/quiz/') ||
    pathname.startsWith('/exam/') ||
    pathname.startsWith('/practice-tests') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/video-') ||
    pathname.startsWith('/live-stream') ||
    pathname.startsWith('/drive-viewer') ||
    pathname.startsWith('/asli-prep-content') ||
    pathname.startsWith('/iq-rank-boost')
  ) {
    return (STAFF_ROLES as readonly string[]).includes(role);
  }

  if (pathname.startsWith('/staff/')) {
    return role === 'teacher' || role === 'admin';
  }
  return true;
}

const OPAQUE_PUSHED_SCREEN = {
  gestureEnabled: true,
  animation: 'slide_from_right' as const,
  animationDuration: 220,
  contentStyle: { backgroundColor: '#F4F7FB' },
};

const STUDENT_PUSHED_SCREEN = OPAQUE_PUSHED_SCREEN;

function AuthGate() {
  const { isLoading, isAuthenticated, role, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    const publicPath = isPublicPath(pathname);
    const subscribePath = isSubscribePath(pathname);

    if (!isAuthenticated && !publicPath && pathname !== '/') {
      router.replace('/auth/login');
      return;
    }

    if (isAuthenticated && needsIndividualPayment(user)) {
      if (!subscribePath) {
        router.replace('/auth/subscribe');
        return;
      }
    }

    if (isAuthenticated && publicPath) {
      router.replace(getDashboardByRole(role));
      return;
    }

    if (isAuthenticated && role === 'student' && isIndividualAccount(user) && isSchoolOnlyStudentPath(pathname)) {
      router.replace('/dashboard');
      return;
    }

    if (isAuthenticated && !canAccessPath(pathname, role)) {
      router.replace(getDashboardByRole(role));
    }
  }, [isLoading, isAuthenticated, pathname, role, user, router]);

  if (isLoading && pathname === '/') {
    return (
      <View style={styles.loadingContainer}>
        <LoadingState variant="stats" style={{ width: '100%', paddingHorizontal: 24 }} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Opaque by default so a pushed screen fully covers the frozen dashboard.
        // Transparent overlays left empty white cards stacked on the previous page.
        gestureEnabled: true,
        animation: 'slide_from_right',
        animationDuration: 220,
        contentStyle: { backgroundColor: '#F4F7FB' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
      />
      <Stack.Screen
        name="auth/login"
        options={{
          animation: 'fade',
          contentStyle: { backgroundColor: '#F4F7FB' },
        }}
      />
      <Stack.Screen
        name="auth/register"
        options={{
          gestureEnabled: true,
          animation: 'slide_from_right',
          animationDuration: 220,
          contentStyle: { backgroundColor: '#F4F7FB' },
        }}
      />
      <Stack.Screen name="auth/subscribe" />
      <Stack.Screen
        name="dashboard/index"
        options={{
          freezeOnBlur: true,
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="attendance" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="assignments" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="teachers-report" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="staff/dashboard" options={OPAQUE_PUSHED_SCREEN} />
      <Stack.Screen name="learning-paths" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="subject/[id]" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="quiz/[id]" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="exam/[id]" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="ai-tutor" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="profile" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen
        name="admin/dashboard"
        options={{
          freezeOnBlur: true,
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="admin/reports"
        options={OPAQUE_PUSHED_SCREEN}
      />
      <Stack.Screen
        name="admin/school-settings"
        options={OPAQUE_PUSHED_SCREEN}
      />
      <Stack.Screen
        name="teacher/dashboard"
        options={{
          freezeOnBlur: true,
          animation: 'fade',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="teacher/tools/[toolType]"
        options={{
          gestureEnabled: true,
          animation: 'slide_from_right',
          animationDuration: 220,
          // Opaque so the dashboard under this route doesn't composite during push.
          contentStyle: { backgroundColor: '#F4F7FB' },
        }}
      />
      <Stack.Screen
        name="super-admin-dashboard"
        options={{
          freezeOnBlur: true,
          contentStyle: { backgroundColor: '#EEF2FF' },
        }}
      />
      <Stack.Screen
        name="super-admin/dashboard"
        options={{
          freezeOnBlur: true,
          contentStyle: { backgroundColor: '#EEF2FF' },
        }}
      />
      <Stack.Screen name="student/tools/[toolType]" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="student-exams" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="practice-tests" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="video-lectures" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="live-stream" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen
        name="video-player"
        options={{
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0f172a' },
        }}
      />
      <Stack.Screen
        name="drive-viewer"
        options={{
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#F4F7FB' },
        }}
      />
      <Stack.Screen
        name="asli-prep-content"
        options={{
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#F4F7FB' },
        }}
      />
      <Stack.Screen name="iq-rank-boost-subjects" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="iq-rank-boost-quiz/[quizId]" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="daily-quiz-review" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="onboarding" options={OPAQUE_PUSHED_SCREEN} />
      <Stack.Screen name="notifications" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="student/timetable" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="student/schedule" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="student/results" options={STUDENT_PUSHED_SCREEN} />
      <Stack.Screen name="teacher/attendance" options={OPAQUE_PUSHED_SCREEN} />
      <Stack.Screen name="teacher/quiz" options={OPAQUE_PUSHED_SCREEN} />
      <Stack.Screen name="teacher/quiz/[quizId]" options={OPAQUE_PUSHED_SCREEN} />
      <Stack.Screen
        name="teacher/vidya-chat"
        options={{
          gestureEnabled: true,
          animation: 'slide_from_right',
          animationDuration: 220,
          // Opaque so the frozen dashboard under this route cannot bleed through.
          contentStyle: { backgroundColor: '#F4F7FB' },
        }}
      />
      <Stack.Screen name="teacher/subject/[id]" options={OPAQUE_PUSHED_SCREEN} />
      <Stack.Screen name="super-admin/analytics" options={OPAQUE_PUSHED_SCREEN} />
      <Stack.Screen name="super-admin/detailed-ai-analytics" options={OPAQUE_PUSHED_SCREEN} />
      <Stack.Screen name="super-admin/schools/[id]" options={OPAQUE_PUSHED_SCREEN} />
      <Stack.Screen
        name="super-admin/create-order"
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          // Opaque so the Subscriptions list under this route cannot bleed through.
          contentStyle: { backgroundColor: '#EEF2FF' },
        }}
      />
    </Stack>
  );
}

function SplashOverlay() {
  const { isLoading } = useAuth();
  const [minTimeDone, setMinTimeDone] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeDone(true), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading || !minTimeDone || exiting) return;
    setExiting(true);
  }, [exiting, isLoading, minTimeDone]);

  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => setHidden(true), SPLASH_EXIT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [exiting]);

  useEffect(() => {
    if (!isAndroidTv()) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const onSplashLayout = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (hidden) return null;

  return (
    <View style={styles.splashOverlay} onLayout={onSplashLayout} pointerEvents="auto">
      <AppSplash exiting={exiting} />
    </View>
  );
}

function MemoryCleanupHost() {
  useMemoryCleanup();
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryCleanupHost />
          <AuthProvider>
            {/* Mounted once for the whole app so every route inherits the pastel
                artwork and glass surfaces always have real colour to blur. */}
            <AppBackground>
              <AuthGate />
            </AppBackground>
            <SplashOverlay />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
});

