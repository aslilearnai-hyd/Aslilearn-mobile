import React, {
  Suspense,
  lazy,
  useEffect,
  useState,
  startTransition,
  useCallback,
  useMemo,
} from 'react';
import { Alert, InteractionManager, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useDashboardShellBack } from '../../src/hooks/useBackNavigation';
import { useVisitedTabs } from '../../src/hooks/useVisitedTabs';
import { consumeAdminDashboardTabIntent } from '../../src/lib/dashboard-tab-intent';
import { useAuth } from '../../src/context/AuthContext';
import authService from '../../src/services/api/authService';
import { LoadingState, VisitedTabPane } from '../../src/components/ui';
import { EduOTTFilterProvider } from '../../src/contexts/edu-ott-filter-context';
import AdminNavDrawer from './_components/AdminNavDrawer';
import { adminNavLabel, type AdminNavView } from './_components/adminNav';
import OverviewView from './_components/OverviewView';
import { AdminHeader, AdminTabBar, useAdminTheme } from './_ui';
import { useAdminResponsiveLayout } from './_ui/useAdminResponsiveLayout';
import adminService from '../../src/services/api/adminService';

const AnalyticsDashboardView = lazy(() => import('./_components/AnalyticsDashboardView'));
const StudentsView = lazy(() => import('./_components/StudentsView'));
const ClassesView = lazy(() => import('./_components/ClassesView'));
const TeachersView = lazy(() => import('./_components/TeachersView'));
const SubjectsView = lazy(() => import('./_components/SubjectsView'));
const ExamsView = lazy(() => import('./_components/ExamsView'));
const OmrResultsView = lazy(() => import('./_components/OmrResultsView'));
const AssessmentsView = lazy(() => import('./_components/AssessmentsView'));
const QuizzesView = lazy(() => import('./_components/QuizzesView'));
const LearningPathsView = lazy(() => import('./_components/LearningPathsView'));
const EduOTTView = lazy(() => import('./_components/EduOTTView'));
const VideosView = lazy(() => import('./_components/VideosView'));
const TimetableView = lazy(() => import('./_components/TimetableView'));
const CalendarView = lazy(() => import('./_components/CalendarView'));
const VidyaAIView = lazy(() => import('./_components/VidyaAIView'));

/** Overview stays pinned; keep one other recent tab mounted to avoid remount/refetch lag. */
const MAX_VISITED_TABS = 2;
const PINNED_ADMIN_VIEWS = ['overview'] as const satisfies readonly AdminNavView[];

const ADMIN_VIEWS: AdminNavView[] = [
  'overview',
  'analytics',
  'students',
  'classes',
  'teachers',
  'subjects',
  'exams',
  'omr-results',
  'assessments',
  'quizzes',
  'learning-paths',
  'eduott',
  'videos',
  'timetable',
  'calendar',
  'vidya-ai',
];

function renderAdminView(
  view: AdminNavView,
  opts: { userName: string; adminId?: string | null; onNavigate: (v: AdminNavView) => void }
) {
  switch (view) {
    case 'overview':
      return <OverviewView onNavigate={opts.onNavigate} />;
    case 'analytics':
      return <AnalyticsDashboardView />;
    case 'students':
      return <StudentsView />;
    case 'classes':
      return <ClassesView />;
    case 'teachers':
      return <TeachersView />;
    case 'subjects':
      return <SubjectsView />;
    case 'exams':
      return <ExamsView />;
    case 'omr-results':
      return <OmrResultsView />;
    case 'assessments':
      return <AssessmentsView />;
    case 'quizzes':
      return <QuizzesView />;
    case 'learning-paths':
      return <LearningPathsView />;
    case 'eduott':
      return (
        <EduOTTFilterProvider>
          <EduOTTView username={opts.userName} />
        </EduOTTFilterProvider>
      );
    case 'videos':
      return <VideosView />;
    case 'timetable':
      return <TimetableView />;
    case 'calendar':
      return <CalendarView />;
    case 'vidya-ai':
      return <VidyaAIView adminId={opts.adminId} adminName={opts.userName} />;
    default:
      return null;
  }
}

function TabFallback() {
  const { spacing } = useAdminTheme();
  return <LoadingState variant="stats" style={{ padding: spacing.lg, flex: 1 }} />;
}

export default function AdminDashboard() {
  const { signOut, user: authUser, role: authRole, isLoading: authLoading } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { spacing } = useAdminTheme();
  const { shellPaddingBottom, showBottomTabBar } = useAdminResponsiveLayout();
  const {
    active: currentView,
    visited: visitedViews,
    select: selectView,
    setActive: setActiveView,
  } = useVisitedTabs<AdminNavView>('overview', {
    maxVisited: MAX_VISITED_TABS,
    pinned: PINNED_ADMIN_VIEWS,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('Admin');
  const [adminId, setAdminId] = useState<string | null>(null);
  const [schoolProfile, setSchoolProfile] = useState<{ schoolName?: string; schoolLogo?: string } | null>(
    null
  );
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const schoolUser =
    authUser?.role === 'admin'
      ? { schoolName: authUser.schoolName, schoolLogo: authUser.schoolLogo }
      : schoolProfile;

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const goToView = useCallback(
    (view: AdminNavView) => {
      startTransition(() => {
        selectView(view);
      });
    },
    [selectView],
  );

  useDashboardShellBack({
    isHome: currentView === 'overview',
    goHome: () => goToView('overview'),
    menuOpen,
    closeMenu: closeMenu,
  });

  /** Close drawer first, then switch after interactions — avoids animation + mount fighting. */
  const onSelectFromDrawer = useCallback(
    (view: AdminNavView) => {
      setMenuOpen(false);
      InteractionManager.runAfterInteractions(() => {
        goToView(view);
      });
    },
    [goToView],
  );

  const applyAdminProfile = useCallback((user: any) => {
    setUserName(user.fullName || user.schoolName || 'Admin');
    setAdminId(String(user._id || user.id || ''));
    setSchoolProfile({
      schoolName: user.schoolName,
      schoolLogo: user.schoolLogo,
    });
  }, []);

  const softRefreshMe = useCallback(async () => {
    try {
      const data = await authService.me();
      if (data?.user?.role === 'admin') {
        applyAdminProfile(data.user);
      }
    } catch {
      /* offline / network — keep cached profile */
    }
  }, [applyAdminProfile]);

  const checkAuth = useCallback(async () => {
    try {
      const auth = await authService.getStoredAuth();
      const token = auth.token;
      const userRole = auth.role;

      if (!token) {
        router.replace('/auth/login');
        return;
      }

      if (userRole === 'admin') {
        setIsAuthenticated(true);
        setIsLoading(false);
        if (authUser?.role === 'admin') {
          applyAdminProfile(authUser);
        }
      }

      const data = await authService.me();
      if (data?.user?.role === 'admin') {
        setIsAuthenticated(true);
        applyAdminProfile(data.user);
      } else {
        router.replace('/auth/login');
      }
    } catch (error: any) {
      const message = String(error?.friendlyMessage || error?.message || '').toLowerCase();
      const isNetworkIssue =
        error?.isNetworkError === true ||
        error?.isTimeout === true ||
        error?.code === 'ERR_NETWORK' ||
        error?.code === 'ECONNABORTED' ||
        message.includes('network request failed') ||
        message.includes('network error') ||
        message.includes('unable to connect') ||
        message.includes('timeout');

      if (isNetworkIssue) {
        setIsAuthenticated(true);
      } else {
        console.warn('Auth check failed:', error?.friendlyMessage || error?.message || 'Unknown error');
        await authService.clearAuth();
        router.replace('/auth/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, [applyAdminProfile, authUser]);

  useEffect(() => {
    // Wait for AuthContext so we can skip a duplicate /me gate when already admin.
    if (authLoading) return;

    if (authUser?.role === 'admin' || authRole === 'admin') {
      setIsAuthenticated(true);
      setIsLoading(false);
      if (authUser?.role === 'admin') {
        applyAdminProfile(authUser);
      }
      void softRefreshMe();
      return;
    }

    void checkAuth();
  }, [authLoading, authUser, authRole, applyAdminProfile, softRefreshMe, checkAuth]);

  // One-shot tab intent. Never persist ?tab= across reload.
  useEffect(() => {
    const intent = consumeAdminDashboardTabIntent();
    if (intent) {
      setActiveView(intent);
    }
    // Clear legacy sticky ?tab= from the URL without reopening that tab on reload.
    const raw = typeof tab === 'string' ? tab : Array.isArray(tab) ? tab[0] : undefined;
    if (raw) {
      router.replace('/admin/dashboard');
    }
  }, []);

  // Only track keyboard on Vidya — elsewhere it was re-rendering every admin pane.
  useEffect(() => {
    if (currentView !== 'vidya-ai') {
      setKeyboardOpen(false);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const subHide = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [currentView]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setMenuOpen(false);
          try {
            adminService.clearAdminDashboardCache();
            await signOut();
          } catch {
            await authService.clearAuth();
          } finally {
            router.replace('/auth/login');
          }
        },
      },
    ]);
  };

  const resolvedAdminId =
    adminId || (authUser?._id || authUser?.id ? String(authUser._id || authUser.id) : null);

  const viewOpts = useMemo(
    () => ({
      userName,
      adminId: resolvedAdminId,
      onNavigate: goToView,
    }),
    [userName, resolvedAdminId, goToView],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <LoadingState variant="stats" style={{ padding: spacing.lg, flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return null;

  const isDashboard = currentView === 'overview';
  const isVidya = currentView === 'vidya-ai';
  // Tab bar is in layout flow (not overlay) — content only needs light bottom pad.
  const contentBottomPad = isVidya ? 0 : shellPaddingBottom;
  const showTabs = showBottomTabBar && !(isVidya && keyboardOpen);


  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.shell}>
        <View style={styles.mainColumn}>
          <AdminHeader
            userName={userName}
            schoolUser={schoolUser ?? undefined}
            showSchoolBrand={isDashboard}
            subtitle={isDashboard ? 'Dashboard' : adminNavLabel(currentView)}
            onMenu={openMenu}
          />

          <View style={[styles.contentWrap, { paddingBottom: contentBottomPad }]}>
            <View style={styles.content}>
              {ADMIN_VIEWS.map((view) =>
                visitedViews.has(view) ? (
                  <VisitedTabPane key={view} visible={currentView === view}>
                    {view === 'overview' ? (
                      renderAdminView(view, viewOpts)
                    ) : (
                      <Suspense fallback={<TabFallback />}>
                        {renderAdminView(view, viewOpts)}
                      </Suspense>
                    )}
                  </VisitedTabPane>
                ) : null,
              )}
            </View>
          </View>

          {/* In-flow footer — never scrolls with tab content. */}
          {showTabs ? <AdminTabBar activeView={currentView} onTabChange={goToView} /> : null}
        </View>
      </View>

      <AdminNavDrawer
        visible={menuOpen}
        activeView={currentView}
        userName={userName}
        onClose={closeMenu}
        onSelect={onSelectFromDrawer}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  shell: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  mainColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
  contentWrap: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
});
