import { startTransition, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import authService from '../../src/services/api/authService';
import teacherService, { type BackendStatus } from '../../src/services/api/teacherService';
import { useTeacherBackendStatus } from '../../src/hooks/useTeacherBackendStatus';
import { useAuth } from '../../src/context/AuthContext';
import { setupSessionTimeSync } from '../../src/lib/session-time-sync';
import { useDashboardShellBack } from '../../src/hooks/useBackNavigation';
import { useVisitedTabs } from '../../src/hooks/useVisitedTabs';
import {
  consumeTeacherDashboardTabIntent,
  type TeacherDashboardTabIntent,
} from '../../src/lib/dashboard-tab-intent';
import { isTvOrBoardDisplay } from '../../src/hooks/useIsTablet';
import TeacherNavDrawer, {
  TeacherNavPanel,
  type TeacherNavId,
} from '../../src/components/teacher/TeacherNavDrawer';
import PortalTopBar from '../../src/components/layout/PortalTopBar';
import { TeacherShimmer } from '../../src/components/teacher';
import TeacherPageHero from '../../src/components/teacher/TeacherPageHero';
import { LoadingState, VisitedTabPane } from '../../src/components/ui';
import { resolveTeacherDisplayName } from '../../src/lib/teacher-text';
import { TEACHER, TEACHER_SPACING } from '../../src/theme/teacher';
import { useVidyaChatAccess } from '../../src/hooks/useVidyaChatAccess';
import VidyaAIFloatingAssistant from '../../src/components/vidya/VidyaAIFloatingAssistant';
import { EduOTTFilterProvider } from '../../src/contexts/edu-ott-filter-context';
import OverviewView from './_components/OverviewView';
import { isIndividualAccount } from '../../src/lib/individual-signup';
import AIClassesView from './_components/AIClassesView';
import StudentsView from './_components/StudentsView';
import EduOTTView from './_components/EduOTTView';
import LearningPathsView from './_components/LearningPathsView';
import VidyaAIView from './_components/VidyaAIView';
import CalendarView from './_components/CalendarView';
import OmrResultsView from './_components/OmrResultsView';
import SettingsView from './_components/SettingsView';

type TabId = Exclude<TeacherNavId, 'subscription'>;

const INDIVIDUAL_TEACHER_BLOCKED_TABS = new Set<TabId>([
  'classes',
  'students',
  'calendar',
  'results',
  'reports',
]);

type NavTarget = {
  studentsSub?: 'list' | 'track-progress' | 'submissions' | 'daily' | 'remarks';
  progressClassFilter?: string;
  progressStudentId?: string;
};

function uniqueStudentCountFromClasses(classes: any[]): number {
  const ids = new Set<string>();
  let fallback = 0;
  for (const cls of classes) {
    const roster = Array.isArray(cls?.students) ? cls.students : [];
    if (roster.length) {
      for (const student of roster) {
        const id = String(student?._id || student?.id || '').trim();
        if (id) ids.add(id);
      }
    } else {
      fallback += Number(cls?.studentCount) || 0;
    }
  }
  return ids.size > 0 ? ids.size : fallback;
}

function mapTeacherIntent(intent: TeacherDashboardTabIntent): TabId {
  if (intent === 'dashboard') return 'overview';
  return intent as TabId;
}

export default function TeacherDashboard() {
  const { signOut } = useAuth();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { active: activeTab, visited: visitedTabs, select: selectTab, setActive: setActiveTab } =
    useVisitedTabs<TabId>('overview', { maxVisited: 1 });
  const [navTarget, setNavTarget] = useState<NavTarget>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [learningPathsRefreshKey, setLearningPathsRefreshKey] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    pendingGrades: 0,
    totalVideos: 0,
  });
  const [stale, setStale] = useState(false);
  const { status: backendStatus, refresh: refreshBackendStatus } = useTeacherBackendStatus(false);

  const overviewScrollRef = useRef<ScrollView>(null);
  const classesScrollRef = useRef<ScrollView>(null);
  const calendarScrollRef = useRef<ScrollView>(null);
  const settingsScrollRef = useRef<ScrollView>(null);

  const tabScrollRefs: Partial<Record<TabId, React.RefObject<ScrollView | null>>> = {
    overview: overviewScrollRef,
    classes: classesScrollRef,
    calendar: calendarScrollRef,
    settings: settingsScrollRef,
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const stop = setupSessionTimeSync(() => {});
    return () => stop();
  }, []);

  useEffect(() => {
    const intent = consumeTeacherDashboardTabIntent();
    if (intent) {
      setActiveTab(mapTeacherIntent(intent));
    }
    const raw = typeof tab === 'string' ? tab : Array.isArray(tab) ? tab[0] : undefined;
    if (raw) {
      router.replace('/teacher/dashboard');
    }
  }, []);

  const vidyaChatEnabled = useVidyaChatAccess(user);

  const loadData = async () => {
    try {
      const auth = await authService.getStoredAuth();
      if (!auth.token || auth.role !== 'teacher') {
        router.replace('/auth/login');
        return;
      }

      const [meRes, dashRes, classesRes] = await Promise.allSettled([
        teacherService.me(),
        teacherService.dashboard(),
        teacherService.classes(),
      ]);

      if (meRes.status === 'fulfilled') {
        setUser(meRes.value.data?.user ?? meRes.value.data);
        setStale(meRes.value.stale);
      }

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value.data;
        const s = d?.stats ?? d;
        const assigned = Array.isArray(d?.assignedClasses) ? d.assignedClasses : [];
        setStats({
          totalStudents: s?.totalStudents ?? d?.students?.length ?? 0,
          totalClasses: s?.totalClasses ?? assigned.length ?? 0,
          pendingGrades: s?.pendingGrades ?? 0,
          totalVideos: s?.totalVideos ?? (Array.isArray(d?.videos) ? d.videos.length : 0),
        });
        setStale((prev) => prev || dashRes.value.stale);
      }

      if (classesRes.status === 'fulfilled') {
        const classes = Array.isArray(classesRes.value.data) ? classesRes.value.data : [];
        setStats((prev) => ({
          ...prev,
          totalClasses: classes.length,
          totalStudents: uniqueStudentCountFromClasses(classes),
        }));
        setStale((prev) => prev || classesRes.value.stale);
      }

      await refreshBackendStatus();
    } catch {
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await teacherService.invalidateCache();
    await loadData();
    await refreshBackendStatus();
    setLearningPathsRefreshKey((key) => key + 1);
    setRefreshing(false);
  };

  const resolvedBackendStatus: BackendStatus =
    backendStatus === 'online' && stale ? 'cached' : backendStatus;

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

  const goToTab = (next: TabId, target?: NavTarget) => {
    if (isIndividualAccount(user) && INDIVIDUAL_TEACHER_BLOCKED_TABS.has(next)) {
      next = 'overview';
    }
    if (target) setNavTarget(target);
    else setNavTarget({});
    startTransition(() => {
      selectTab(next);
    });
  };

  useDashboardShellBack({
    isHome: activeTab === 'overview',
    goHome: () => goToTab('overview'),
    menuOpen: menuOpen || (isTvView && tvSidebarOpen),
    closeMenu: () => {
      setMenuOpen(false);
      if (isTvView) setTvSidebarOpen(false);
    },
  });

  const handleTabChange = (id: TeacherNavId) => {
    if (id === 'subscription') {
      router.push('/auth/subscribe');
      return;
    }
    if (isIndividualAccount(user) && INDIVIDUAL_TEACHER_BLOCKED_TABS.has(id)) {
      return;
    }
    if (id === activeTab) {
      tabScrollRefs[id]?.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    goToTab(id);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <LoadingState variant="stats" style={{ padding: 16 }} />
        <TeacherShimmer variant="card" count={2} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={isTablet ? [] : ['top']}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={[styles.shell, showSidebar && styles.shellTablet]}>
        {showSidebar ? (
          <View style={styles.sidebar}>
            <TeacherNavPanel
              activeId={activeTab}
              user={user}
              onSelect={handleTabChange}
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

          {resolvedBackendStatus === 'offline' ? (
            <LinearGradient
              colors={['#FEE2E2', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.offlineBanner}
            >
              <Ionicons name="cloud-offline" size={16} color={TEACHER.danger} />
              <Text style={styles.offlineBannerText}>Cannot reach server. Pull down to retry.</Text>
              <Pressable onPress={onRefresh}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </LinearGradient>
          ) : null}

          {visitedTabs.has('overview') ? (
            <VisitedTabPane visible={activeTab === 'overview'}>
              <ScrollView
                ref={overviewScrollRef}
                style={styles.scroll}
                contentContainerStyle={pad}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TEACHER.primary} />
                }
                showsVerticalScrollIndicator={false}
              >
                <OverviewView user={user} stats={stats} onGo={(id) => goToTab(id)} />
              </ScrollView>
            </VisitedTabPane>
          ) : null}

          {visitedTabs.has('classes') ? (
            <VisitedTabPane visible={activeTab === 'classes'}>
              <ScrollView
                ref={classesScrollRef}
                style={styles.scroll}
                contentContainerStyle={pad}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.heroWrap}>
                  <TeacherPageHero
                    title="My Classes"
                    subtitle="Open a class to see students and jump into progress tracking."
                    icon="school-outline"
                  />
                </View>
                <AIClassesView
                  stats={stats}
                  hideSubNav
                  hideStats
                  onOpenProgress={(classNum, studentId) =>
                    goToTab('students', {
                      studentsSub: 'track-progress',
                      progressClassFilter: classNum,
                      progressStudentId: studentId,
                    })
                  }
                />
              </ScrollView>
            </VisitedTabPane>
          ) : null}

          {visitedTabs.has('students') ? (
            <VisitedTabPane visible={activeTab === 'students'}>
              <StudentsView
                initialSubTab={navTarget.studentsSub}
                progressClassFilter={navTarget.progressClassFilter}
                progressStudentId={navTarget.progressStudentId}
                onCloseStudentAnalysis={() => {
                  setNavTarget({});
                  goToTab('students');
                }}
              />
            </VisitedTabPane>
          ) : null}

          {visitedTabs.has('eduott') ? (
            <VisitedTabPane visible={activeTab === 'eduott'}>
              <View style={[styles.scroll, styles.fullPane]}>
                <EduOTTFilterProvider>
                  <EduOTTView username={resolveTeacherDisplayName(user)} />
                </EduOTTFilterProvider>
              </View>
            </VisitedTabPane>
          ) : null}

          {visitedTabs.has('learning-paths') ? (
            <VisitedTabPane visible={activeTab === 'learning-paths'}>
              <LearningPathsView refreshKey={learningPathsRefreshKey} />
            </VisitedTabPane>
          ) : null}

          {visitedTabs.has('vidya-ai') ? (
            <VisitedTabPane visible={activeTab === 'vidya-ai'}>
              <VidyaAIView chatEnabled={vidyaChatEnabled} user={user} />
            </VisitedTabPane>
          ) : null}

          {visitedTabs.has('calendar') ? (
            <VisitedTabPane visible={activeTab === 'calendar'}>
              <ScrollView
                ref={calendarScrollRef}
                style={styles.scroll}
                contentContainerStyle={pad}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.heroWrap}>
                  <TeacherPageHero
                    title="Calendar"
                    subtitle="Your timetable photo and day-by-day schedule."
                    icon="calendar-outline"
                  />
                </View>
                <CalendarView />
              </ScrollView>
            </VisitedTabPane>
          ) : null}

          {visitedTabs.has('results') ? (
            <VisitedTabPane visible={activeTab === 'results'}>
              <OmrResultsView />
            </VisitedTabPane>
          ) : null}

          {visitedTabs.has('settings') ? (
            <VisitedTabPane visible={activeTab === 'settings'}>
              <ScrollView
                ref={settingsScrollRef}
                style={styles.scroll}
                contentContainerStyle={pad}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.heroWrap}>
                  <TeacherPageHero
                    title="Settings"
                    subtitle="Update your teacher details and reset your password."
                    icon="settings-outline"
                  />
                </View>
                <SettingsView />
              </ScrollView>
            </VisitedTabPane>
          ) : null}

          {visitedTabs.has('reports') ? (
            <VisitedTabPane visible={activeTab === 'reports'}>
              <StudentsView
                hideSubNav
                initialSubTab="track-progress"
                heroTitle="Reports"
                heroSubtitle="Student Analysis — Exam Results, Usage, Homework, And Improvement Insights."
                heroIcon="bar-chart-outline"
                onCloseStudentAnalysis={() => goToTab('reports')}
              />
            </VisitedTabPane>
          ) : null}
        </View>
      </View>

      {isTablet ? null : (
        <TeacherNavDrawer
          visible={menuOpen}
          activeId={activeTab}
          user={user}
          onClose={() => setMenuOpen(false)}
          onSelect={handleTabChange}
          onLogout={handleLogout}
        />
      )}

      {vidyaChatEnabled ? (
        <VidyaAIFloatingAssistant
          role="teacher"
          hidden={activeTab === 'vidya-ai'}
          bottomOffset={16}
          onPress={() => {
            requestAnimationFrame(() => {
              goToTab('vidya-ai');
            });
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
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
  heroWrap: {
    marginBottom: TEACHER_SPACING.lg,
  },
  fullPane: {
    flex: 1,
    minHeight: 0,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: TEACHER_SPACING.lg,
    marginBottom: TEACHER_SPACING.sm,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,77,106,0.35)',
  },
  offlineBannerText: {
    flex: 1,
    color: TEACHER.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  retryText: {
    color: TEACHER.danger,
    fontWeight: '700',
    fontSize: 13,
  },
});
