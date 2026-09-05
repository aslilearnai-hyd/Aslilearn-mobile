import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import authService from '../../src/services/api/authService';
import { useAuth } from '../../src/context/AuthContext';
import { useDashboardShellBack } from '../../src/hooks/useBackNavigation';
import { useVisitedTabs } from '../../src/hooks/useVisitedTabs';
import { consumeStudentDashboardTabIntent } from '../../src/lib/dashboard-tab-intent';
import { isTvOrBoardDisplay } from '../../src/hooks/useIsTablet';
import StudentNavDrawer, {
  StudentNavPanel,
  type StudentNavId,
} from '../../src/components/student/StudentNavDrawer';
import PortalTopBar from '../../src/components/layout/PortalTopBar';
import { LoadingState, VisitedTabPane } from '../../src/components/ui';
import { STUDENT } from '../../src/theme/student';
import OverviewView from './_components/OverviewView';
import LearningPathsView from './_components/LearningPathsView';
import EduOTTView from './_components/EduOTTView';
import { EduOTTFilterProvider } from '../../src/contexts/edu-ott-filter-context';
import ExamsTabView from './_components/ExamsTabView';
import AITabView from './_components/AITabView';
import OmrResultsView from './_components/OmrResultsView';
import TimetableTabView from './_components/TimetableTabView';
import TrialDailyQuizPrompt from '../../src/components/TrialDailyQuizPrompt';
import VidyaAIFloatingAssistant from '../../src/components/vidya/VidyaAIFloatingAssistant';
import { useVidyaChatAccess } from '../../src/hooks/useVidyaChatAccess';
import { resolveStudentFirstName } from '../../src/lib/student-text';
import { isIndividualAccount } from '../../src/lib/individual-signup';

type TabId = 'home' | 'learning' | 'eduott' | 'exams' | 'results' | 'timetable' | 'vidya';

export default function StudentDashboard() {
  const { signOut } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { active: activeTab, visited: visitedTabs, select: selectTab, setActive: setActiveTab } =
    useVisitedTabs<TabId>('home', { maxVisited: 1 });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarFocusExamId, setCalendarFocusExamId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const homeScrollRef = useRef<ScrollView>(null);
  const learningScrollRef = useRef<ScrollView>(null);
  const resultsScrollRef = useRef<ScrollView>(null);
  const timetableScrollRef = useRef<ScrollView>(null);
  const vidyaScrollRef = useRef<ScrollView>(null);

  const tabScrollRefs: Partial<Record<TabId, React.RefObject<ScrollView | null>>> = {
    home: homeScrollRef,
    learning: learningScrollRef,
    results: resultsScrollRef,
    timetable: timetableScrollRef,
    vidya: vidyaScrollRef,
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // One-shot tab intent (back from tools / deep links). Never persist ?tab= across reload.
  useEffect(() => {
    const intent = consumeStudentDashboardTabIntent();
    if (intent) {
      setActiveTab(intent);
    }
    // Clear legacy sticky ?tab= from the URL without reopening that tab on reload.
    const raw = typeof tab === 'string' ? tab : Array.isArray(tab) ? tab[0] : undefined;
    if (raw) {
      router.replace('/dashboard');
    }
  }, []);

  const firstName = useMemo(() => resolveStudentFirstName(user), [user]);
  const individualAccount = isIndividualAccount(user);

  const vidyaChatEnabled = useVidyaChatAccess(user);

  useEffect(() => {
    if (individualAccount && (activeTab === 'results' || activeTab === 'timetable')) {
      setActiveTab('home');
    }
  }, [individualAccount, activeTab, setActiveTab]);

  const checkAuth = async () => {
    try {
      const auth = await authService.getStoredAuth();
      if (!auth.token || auth.role !== 'student') {
        router.replace('/auth/login');
        return;
      }
      setIsAuthenticated(true);
      const data = await authService.me();
      if (data?.user?.role !== 'student') {
        await authService.clearAuth();
        router.replace('/auth/login');
        return;
      }
      setUser(data.user);
    } catch (error) {
      const message = String((error as any)?.message || '').toLowerCase();
      if (
        message.includes('network request failed') ||
        message.includes('network error') ||
        message.includes('timeout')
      ) {
        setIsAuthenticated(true);
        return;
      }
      await authService.clearAuth();
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAuth();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = windowWidth >= 768;
  const isTvView = isTvOrBoardDisplay(windowWidth, windowHeight);
  const [tvSidebarOpen, setTvSidebarOpen] = useState(true);
  const showSidebar = isTablet && (!isTvView || tvSidebarOpen);
  const showTopBar = !isTablet || (isTvView && !tvSidebarOpen);
  const pad = {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28 + Math.max(insets.bottom, 8),
  };
  const homePad = isTablet ? { ...pad, paddingHorizontal: 20 } : pad;

  const handleTabChange = (id: string) => {
    const next = id as TabId;
    if (individualAccount && (next === 'results' || next === 'timetable')) {
      return;
    }
    if (next === activeTab) {
      tabScrollRefs[next]?.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    // Keep the tab-bar press responsive while heavy panes mount.
    startTransition(() => {
      selectTab(next);
    });
  };

  const goToTab = (next: TabId) => {
    startTransition(() => {
      selectTab(next);
    });
  };

  useDashboardShellBack({
    isHome: activeTab === 'home',
    goHome: () => goToTab('home'),
    menuOpen: menuOpen || (isTvView && tvSidebarOpen),
    closeMenu: () => {
      setMenuOpen(false);
      if (isTvView) setTvSidebarOpen(false);
    },
  });

  const onSelectNav = (id: StudentNavId) => {
    if (id === 'profile') {
      router.push('/profile');
      return;
    }
    if (id === 'quiz') {
      router.push('/iq-rank-boost-subjects');
      return;
    }
    if (id === 'subscription') {
      router.push('/auth/subscribe');
      return;
    }
    handleTabChange(id);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <LoadingState variant="stats" style={{ padding: 16 }} />
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SafeAreaView style={styles.container} edges={isTablet ? [] : ['top']}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={[styles.shell, showSidebar && styles.shellTablet]}>
        {showSidebar ? (
          <View style={styles.sidebar}>
            <StudentNavPanel
              activeId={activeTab}
              user={user}
              onSelect={onSelectNav}
              onLogout={handleLogout}
              onClose={isTvView ? () => setTvSidebarOpen(false) : undefined}
            />
          </View>
        ) : null}

        <View style={[styles.tabContent, isTablet && { paddingTop: insets.top }]}>
        {showTopBar ? (
          <PortalTopBar
            user={user}
            onOpenMenu={() => {
              if (isTvView) setTvSidebarOpen(true);
              else setMenuOpen(true);
            }}
            onLogout={handleLogout}
          />
        ) : null}
        {visitedTabs.has('home') ? (
          <VisitedTabPane visible={activeTab === 'home'}>
            <ScrollView
              ref={homeScrollRef}
              style={styles.scroll}
              contentContainerStyle={homePad}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={STUDENT.primary} />
              }
              showsVerticalScrollIndicator={false}
            >
              <OverviewView
                user={user}
                onGoExams={() => goToTab('exams')}
                onOpenExam={(examId) => {
                  setCalendarFocusExamId(examId);
                  goToTab('exams');
                }}
              />
            </ScrollView>
          </VisitedTabPane>
        ) : null}

        {visitedTabs.has('learning') ? (
          <VisitedTabPane visible={activeTab === 'learning'}>
            <ScrollView
              ref={learningScrollRef}
              style={styles.scroll}
              contentContainerStyle={pad}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <LearningPathsView />
            </ScrollView>
          </VisitedTabPane>
        ) : null}

        {visitedTabs.has('eduott') ? (
          <VisitedTabPane visible={activeTab === 'eduott'}>
            <View style={[styles.scroll, styles.eduottPane]}>
              <EduOTTFilterProvider>
                <EduOTTView username={firstName} />
              </EduOTTFilterProvider>
            </View>
          </VisitedTabPane>
        ) : null}

        {visitedTabs.has('exams') ? (
          <VisitedTabPane visible={activeTab === 'exams'}>
            <View
              style={[
                styles.scroll,
                styles.examsPane,
                { paddingHorizontal: 12, paddingTop: pad.paddingTop },
              ]}
            >
              <ExamsTabView
                focusExamId={calendarFocusExamId}
                onFocusExamHandled={() => setCalendarFocusExamId(null)}
              />
            </View>
          </VisitedTabPane>
        ) : null}

        {visitedTabs.has('results') ? (
          <VisitedTabPane visible={activeTab === 'results'}>
            <ScrollView
              ref={resultsScrollRef}
              style={styles.scroll}
              contentContainerStyle={pad}
              showsVerticalScrollIndicator={false}
            >
              <OmrResultsView />
            </ScrollView>
          </VisitedTabPane>
        ) : null}

        {visitedTabs.has('timetable') ? (
          <VisitedTabPane visible={activeTab === 'timetable'}>
            <ScrollView
              ref={timetableScrollRef}
              style={styles.scroll}
              contentContainerStyle={pad}
              showsVerticalScrollIndicator={false}
            >
              <TimetableTabView user={user} />
            </ScrollView>
          </VisitedTabPane>
        ) : null}

        {visitedTabs.has('vidya') ? (
          <VisitedTabPane visible={activeTab === 'vidya'}>
            <ScrollView
              ref={vidyaScrollRef}
              style={styles.scroll}
              contentContainerStyle={pad}
              showsVerticalScrollIndicator={false}
            >
              <AITabView user={user} chatEnabled={vidyaChatEnabled} />
            </ScrollView>
          </VisitedTabPane>
        ) : null}
        </View>
      </View>

      {isTablet ? null : (
        <StudentNavDrawer
          visible={menuOpen}
          activeId={activeTab}
          user={user}
          onClose={() => setMenuOpen(false)}
          onSelect={onSelectNav}
          onLogout={handleLogout}
        />
      )}

      {vidyaChatEnabled ? (
        <VidyaAIFloatingAssistant
          role="student"
          hidden={activeTab === 'vidya'}
          bottomOffset={16}
          onPress={() => {
            requestAnimationFrame(() => {
              goToTab('vidya');
            });
          }}
        />
      ) : null}
      <TrialDailyQuizPrompt />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  shell: {
    flex: 1,
    minHeight: 0,
  },
  shellTablet: {
    flexDirection: 'row',
  },
  sidebar: {
    width: 280,
    overflow: 'hidden',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.6)',
  },
  tabContent: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
  },
  eduottPane: {
    flex: 1,
  },
  examsPane: {
    flex: 1,
    minHeight: 0,
    paddingBottom: 24,
  },
});
