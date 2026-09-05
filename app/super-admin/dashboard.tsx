import { storageGetItem, storageDeleteItem } from '../../src/lib/safe-storage';
import { useState, useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDashboardShellBack } from '../../src/hooks/useBackNavigation';
import { consumeSuperAdminDashboardTabIntent } from '../../src/lib/dashboard-tab-intent';
import { API_BASE_URL } from '../../src/services/api/api';
import { useAuth } from '../../src/context/AuthContext';
import AdminsView from './_components/AdminsView';
import VidyaAIView from './_components/VidyaAIView';
import BoardComparisonView from './_components/BoardComparisonView';
import BoardDashboardView from './_components/BoardDashboardView';
import SubjectContentManagementView from './_components/SubjectContentManagementView';
import ExamManagementView from './_components/ExamManagementView';
import IQRankBoostView from './_components/IQRankBoostView';
import SuperAdminCalendarView from './_components/SuperAdminCalendarView';
import { EXAM_CALENDAR_PREFILL_KEY, type ExamCalendarPrefill } from '../../src/lib/super-admin-calendar';
import CombinedAnalyticsView from './_components/CombinedAnalyticsView';
import SubscriptionManagementView from './_components/SubscriptionManagementView';
import SettingsView from './_components/SettingsView';
import AiGeneratorView from './_components/AiGeneratorView';
import AiPdfView from './_components/AiPdfView';
import BookKnowledgeBaseView from './_components/BookKnowledgeBaseView';
import BookBasedGeneratorView from './_components/BookBasedGeneratorView';
import AiToolTopicsView from './_components/AiToolTopicsView';
import AiToolGenerationsView from './_components/AiToolGenerationsView';
import SuperAdminOverviewView from './_components/SuperAdminOverviewView';
import LiveSessionsView from './_components/LiveSessionsView';
import AuditLogsView from './_components/AuditLogsView';
import SuperAdminNavDrawer, {
  superAdminNavLabel,
  type SuperAdminView,
} from './_components/SuperAdminNavDrawer';
import { SuperAdminHeader, SuperAdminGridBackground, SuperAdminTabBar, useSuperAdminTheme } from './_ui';
import {
  fetchDashboardStats,
  fetchRealtimeAnalytics,
  type DashboardStats,
  type RealtimeAnalytics,
} from '../../src/lib/super-admin-dashboard';
import { fetchCurrentUser } from '../../src/lib/vidya-admin';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { signOut } = useAuth();
  const { colors } = useSuperAdminTheme();
  const [currentView, setCurrentView] = useState<SuperAdminView>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalAdmins: 0,
    courses: 0,
    assessments: 0,
    exams: 0,
    examResults: 0,
    activeVideos: 0,
    activeAssessments: 0,
    avgExamsPerStudent: 0,
    contentEngagement: 0,
    contentVolume: 0,
    passRate: 0,
    activeStudents: 0,
    activeStudentsPercentage: 0,
    averageScore: 0,
  });
  const [realtimeAnalytics, setRealtimeAnalytics] = useState<RealtimeAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState({ fullName: 'Super Admin', email: '' });
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [statsError, setStatsError] = useState('');

  useEffect(() => {
    fetchUserInfo();
    loadDashboardStats();
    const timer = setTimeout(() => {
      loadRealtimeAnalytics();
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // One-shot tab intent. Never persist ?tab= across reload (was reopening Vidya).
  useEffect(() => {
    const intent = consumeSuperAdminDashboardTabIntent();
    if (intent) {
      setCurrentView(intent as SuperAdminView);
    }
    const raw = typeof tab === 'string' ? tab : Array.isArray(tab) ? tab[0] : undefined;
    if (raw) {
      router.replace('/super-admin-dashboard');
    }
  }, []);

  const fetchUserInfo = async () => {
    try {
      const [me, emailFromStore] = await Promise.all([
        fetchCurrentUser().catch(() => null),
        storageGetItem('userEmail'),
      ]);
      setUser({
        fullName: me?.fullName || me?.name || 'Super Admin',
        email: me?.email || emailFromStore || '',
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setStatsError('');
      const normalized = await fetchDashboardStats();
      setStats(normalized);
    } catch (error: any) {
      const fallback = `Unable to fetch dashboard stats from ${API_BASE_URL}`;
      setStatsError(error?.friendlyMessage || error?.message || fallback);
      // Avoid console.error(axios object) — it opens LogBox and dumps the full request config.
      console.warn('Dashboard stats failed:', error?.friendlyMessage || error?.message || fallback);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadRealtimeAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const data = await fetchRealtimeAnalytics();
      setRealtimeAnalytics(data);
    } catch (error: any) {
      console.warn('Realtime analytics failed:', error?.friendlyMessage || error?.message);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardStats();
    loadRealtimeAnalytics();
  };

  const handleViewChange = (view: SuperAdminView) => {
    setCurrentView(view);
    setMenuOpen(false);
    if (view === 'board') {
      setSelectedBoard('ASLI_EXCLUSIVE_SCHOOLS');
    }
  };

  useDashboardShellBack({
    isHome: currentView === 'dashboard',
    goHome: () => handleViewChange('dashboard'),
    menuOpen,
    closeMenu: () => setMenuOpen(false),
  });

  const handleLogout = () => {
    Alert.alert('Logout', 'Sign out of super admin panel?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          setMenuOpen(false);
          try {
            await signOut();
            await storageDeleteItem('token');
            await storageDeleteItem('accessToken');
            await storageDeleteItem('jwtToken');
          } catch (error) {
            console.error('Logout failed:', error);
          } finally {
            router.replace('/auth/login');
          }
        },
      },
    ]);
  };

  const renderOverview = () => (
    <SuperAdminOverviewView
      stats={stats}
      isLoading={isLoading}
      statsError={statsError}
      refreshing={refreshing}
      onRefresh={onRefresh}
      realtimeAnalytics={realtimeAnalytics}
      isLoadingAnalytics={isLoadingAnalytics}
      onRefreshAnalytics={loadRealtimeAnalytics}
      onNavigate={handleViewChange}
    />
  );

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return renderOverview();
      case 'admins':
        return <AdminsView />;
      case 'board':
        return (
          <BoardDashboardView
            boardCode={selectedBoard || 'ASLI_EXCLUSIVE_SCHOOLS'}
            onBack={() => {
              setSelectedBoard(null);
              setCurrentView('dashboard');
            }}
          />
        );
      case 'subjects-and-content':
      case 'content':
      case 'subjects':
        return <SubjectContentManagementView />;
      case 'edu-ott-live':
        return <LiveSessionsView />;
      case 'exams':
        return <ExamManagementView />;
      case 'iq-rank-boost':
        return <IQRankBoostView />;
      case 'calendar':
        return (
          <SuperAdminCalendarView
            onNavigateToExams={async (prefill: ExamCalendarPrefill) => {
              await AsyncStorage.setItem(EXAM_CALENDAR_PREFILL_KEY, JSON.stringify(prefill));
              handleViewChange('exams');
            }}
          />
        );
      case 'vidya-ai':
        return <VidyaAIView />;
      case 'analytics':
        return <CombinedAnalyticsView defaultTab="overview" key="analytics-overview" />;
      case 'ai-analytics':
        return <CombinedAnalyticsView defaultTab="ai" key="analytics-ai" />;
      case 'board-comparison':
        return <BoardComparisonView />;
      case 'ai-tool-generations':
        return <AiToolGenerationsView />;
      case 'ai-tool-topics':
        return <AiToolTopicsView />;
      case 'ai-content-engine':
        return <AiPdfView />;
      case 'book-knowledge-base':
        return (
          <BookKnowledgeBaseView onOpenBookBasedGenerator={() => handleViewChange('book-based-generator')} />
        );
      case 'book-based-generator':
        return (
          <BookBasedGeneratorView onOpenBookKnowledge={() => handleViewChange('book-knowledge-base')} />
        );
      case 'ai-generator':
        return <AiGeneratorView />;
      case 'subscriptions':
        return <SubscriptionManagementView />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'settings':
        return <SettingsView onNavigate={handleViewChange} />;
      default:
        return renderOverview();
    }
  };

  const isDashboard = currentView === 'dashboard';

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={{ flex: 1 }}>
        <SuperAdminHeader
          userName={user.fullName}
          subtitle={isDashboard ? 'Aslilearn AI Platform' : superAdminNavLabel(currentView)}
          onMenu={() => setMenuOpen(true)}
        />

        <View style={styles.contentWrap}>
          <SuperAdminGridBackground />
          <Animated.View entering={FadeIn.duration(200)} style={styles.mainContent}>
            {renderContent()}
          </Animated.View>
        </View>
      </View>

      <SuperAdminTabBar activeView={currentView} onTabChange={handleViewChange} />

      <SuperAdminNavDrawer
        visible={menuOpen}
        activeView={currentView}
        userName={user.fullName}
        onClose={() => setMenuOpen(false)}
        onSelect={handleViewChange}
        onLogout={handleLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Transparent so the shared app background artwork shows through.
  container: { flex: 1, backgroundColor: 'transparent' },
  contentWrap: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  mainContent: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'transparent',
  },
});
