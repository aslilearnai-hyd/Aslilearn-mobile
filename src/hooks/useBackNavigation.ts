import { storageGetItem } from '../lib/safe-storage';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import {
  setAdminDashboardTabIntent,
  setStudentDashboardTabIntent,
  setTeacherDashboardTabIntent,
  type AdminDashboardTabIntent,
  type StudentDashboardTabIntent,
  type TeacherDashboardTabIntent,
} from '../lib/dashboard-tab-intent';

function useInterceptedDashboardBack(navigate: () => void) {
  const handlingBack = useRef(false);

  const goBack = useCallback(() => {
    if (handlingBack.current) return;
    handlingBack.current = true;
    navigate();
    setTimeout(() => {
      handlingBack.current = false;
    }, 350);
  }, [navigate]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [goBack]);

  return goBack;
}

/**
 * Hook to handle back button navigation for authenticated users
 * - Prevents going back to login/home from dashboard
 * - Redirects to appropriate dashboard when back is pressed from other pages
 */
export function useBackNavigation(dashboardPath: string, preventBack: boolean = false) {
  const router = useRouter();
  const authRef = useRef<{ ready: boolean; authed: boolean }>({ ready: false, authed: false });

  useEffect(() => {
    let cancelled = false;
    authRef.current = { ready: false, authed: false };
    void (async () => {
      try {
        const token = await storageGetItem('authToken');
        const userRole = await storageGetItem('userRole');
        if (!cancelled) {
          authRef.current = { ready: true, authed: !!(token && userRole) };
        }
      } catch {
        if (!cancelled) {
          authRef.current = { ready: true, authed: false };
        }
      }
    })();

    // Must return a boolean synchronously — an async handler returns a Promise,
    // which RN treats as truthy and always swallows the back press.
    const backAction = () => {
      const { ready, authed } = authRef.current;
      if (!ready || !authed) {
        return false;
      }
      if (preventBack) {
        return true;
      }
      if (dashboardPath) {
        router.replace(dashboardPath);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      cancelled = true;
      backHandler.remove();
    };
  }, [dashboardPath, preventBack, router]);
}

type DashboardShellBackOptions = {
  /** True when the root/home tab of this dashboard is active. */
  isHome: boolean;
  /** Switch to the root/home tab. */
  goHome: () => void;
  menuOpen?: boolean;
  closeMenu?: () => void;
};

/**
 * Android back / edge-swipe for role dashboards:
 * 1) close drawer if open
 * 2) leave nested tab → home tab
 * 3) on home, stay (do not pop back to login)
 */
export function useDashboardShellBack({
  isHome,
  goHome,
  menuOpen = false,
  closeMenu,
}: DashboardShellBackOptions) {
  const menuOpenRef = useRef(menuOpen);
  const isHomeRef = useRef(isHome);
  const goHomeRef = useRef(goHome);
  const closeMenuRef = useRef(closeMenu);

  menuOpenRef.current = menuOpen;
  isHomeRef.current = isHome;
  goHomeRef.current = goHome;
  closeMenuRef.current = closeMenu;

  useEffect(() => {
    const onBack = () => {
      if (menuOpenRef.current) {
        closeMenuRef.current?.();
        return true;
      }
      if (!isHomeRef.current) {
        goHomeRef.current();
        return true;
      }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);
}

export type ContentReturnTarget = 'eduott' | 'learning';

export type StudentDashboardTab = StudentDashboardTabIntent;

const STUDENT_DASHBOARD_TABS: StudentDashboardTab[] = [
  'home',
  'learning',
  'eduott',
  'exams',
  'results',
  'timetable',
  'vidya',
];

export function parseStudentDashboardTab(value?: string): StudentDashboardTab {
  if (value && STUDENT_DASHBOARD_TABS.includes(value as StudentDashboardTab)) {
    return value as StudentDashboardTab;
  }
  return 'home';
}

/** Back from student AI tool screens → previous page when possible, else dashboard. */
export function useStudentDashboardBack(returnTab: StudentDashboardTab = 'home') {
  const router = useRouter();
  const navigate = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // Memory intent only — never stick ?tab= in the URL (reload would reopen Vidya).
    setStudentDashboardTabIntent(returnTab);
    router.replace('/dashboard');
  }, [returnTab, router]);

  return useInterceptedDashboardBack(navigate);
}

export type TeacherDashboardTab = TeacherDashboardTabIntent;

const TEACHER_DASHBOARD_TABS: TeacherDashboardTab[] = [
  'dashboard',
  'overview',
  'classes',
  'students',
  'eduott',
  'learning-paths',
  'vidya-ai',
  'calendar',
  'results',
  'settings',
  'reports',
];

export function parseTeacherDashboardTab(value?: string): TeacherDashboardTab {
  if (value && TEACHER_DASHBOARD_TABS.includes(value as TeacherDashboardTab)) {
    return value as TeacherDashboardTab;
  }
  return 'overview';
}

/** Back from teacher tool screens → previous page when possible, else dashboard. */
export function useTeacherDashboardBack(returnTab: TeacherDashboardTab = 'overview') {
  const router = useRouter();
  const navigate = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    setTeacherDashboardTabIntent(returnTab);
    router.replace('/teacher/dashboard');
  }, [returnTab, router]);

  return useInterceptedDashboardBack(navigate);
}

export type AdminDashboardTab = AdminDashboardTabIntent;

function dashboardPathForRole(role: string | null): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'teacher') return '/teacher/dashboard';
  return '/dashboard';
}

/**
 * Navigate to a dashboard section (EduOTT or Learning Paths).
 * Uses navigate (not replace) so an existing dashboard in the stack is reused.
 */
export async function navigateToDashboardSection(
  router: ReturnType<typeof useRouter>,
  returnTo: ContentReturnTarget,
  method: 'navigate' | 'replace' = 'navigate'
) {
  const role = await storageGetItem('userRole');
  const pathname = dashboardPathForRole(role);
  if (returnTo === 'eduott') {
    if (role === 'student') setStudentDashboardTabIntent('eduott');
    else if (role === 'teacher') setTeacherDashboardTabIntent('eduott');
    else if (role === 'admin') setAdminDashboardTabIntent('eduott');
  } else if (role === 'student') {
    setStudentDashboardTabIntent('learning');
  } else if (role === 'teacher') {
    setTeacherDashboardTabIntent('learning-paths');
  } else if (role === 'admin') {
    setAdminDashboardTabIntent('learning-paths');
  }
  if (method === 'replace') {
    router.replace(pathname);
  } else {
    router.navigate(pathname);
  }
}

/** @deprecated use navigateToDashboardSection */
export function navigateToEduOTTDashboard(router: ReturnType<typeof useRouter>) {
  navigateToDashboardSection(router, 'eduott');
}

/**
 * Back navigation for video-player, drive-viewer, and similar content screens.
 * Handles hardware back, header back, and iOS swipe-back consistently.
 */
export function useContentViewerBack(returnTo?: string) {
  const router = useRouter();
  const navigation = useNavigation();
  const handlingBack = useRef(false);

  const goBack = useCallback(async () => {
    if (handlingBack.current) return;
    handlingBack.current = true;

    try {
      if (router.canGoBack()) {
        router.back();
        return;
      }
      if (returnTo === 'eduott') {
        await navigateToDashboardSection(router, 'eduott', 'replace');
        return;
      }
      if (returnTo === 'learning') {
        await navigateToDashboardSection(router, 'learning', 'replace');
        return;
      }
      const path = await getDashboardPath();
      router.replace(path || '/dashboard');
    } finally {
      setTimeout(() => {
        handlingBack.current = false;
      }, 350);
    }
  }, [returnTo, router]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      void goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [goBack]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      const actionType = e.data.action.type;
      if (actionType !== 'GO_BACK' && actionType !== 'POP') return;
      if (handlingBack.current) return;

      e.preventDefault();
      void goBack();
    });
    return unsubscribe;
  }, [navigation, goBack]);

  return goBack;
}

/** @deprecated use useContentViewerBack */
export const useVideoPlayerBack = useContentViewerBack;

/**
 * Helper function to get dashboard path based on user role
 */
export async function getDashboardPath(): Promise<string | null> {
  try {
    const userRole = await storageGetItem('userRole');
    
    switch (userRole) {
      case 'super-admin':
        return '/super-admin-dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'teacher':
        return '/teacher/dashboard';
      case 'student':
        return '/dashboard';
      default:
        return null;
    }
  } catch (error) {
    console.error('Error getting dashboard path:', error);
    return null;
  }
}
