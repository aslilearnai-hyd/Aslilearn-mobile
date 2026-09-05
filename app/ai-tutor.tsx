import { storageGetItem } from '../src/lib/safe-storage';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import StudentVidyaChatPanel from '../src/components/vidya/StudentVidyaChatPanel';
import VidyaAvatar from '../src/components/vidya/VidyaAvatar';
import { useAuth } from '../src/context/AuthContext';
import { collectVidyaSubjectLabels } from '../src/lib/vidya-subjects';
import { API_BASE_URL } from '../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';
import { setStudentDashboardTabIntent } from '../src/lib/dashboard-tab-intent';
import { resolveStudentDisplayName } from '../src/lib/student-text';
import { useVidyaChatAccess } from '../src/hooks/useVidyaChatAccess';

export default function AITutor() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const vidyaChatEnabled = useVidyaChatAccess(user);
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    getDashboardPath().then((path) => {
      if (path) setDashboardPath(path);
    });
  }, []);

  useBackNavigation(dashboardPath, false);

  useEffect(() => {
    if (!authLoading && user && !vidyaChatEnabled) {
      setStudentDashboardTabIntent('vidya');
      router.replace('/dashboard');
    }
  }, [authLoading, user, vidyaChatEnabled, router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await storageGetItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/student/subjects`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) return;
        const data = await response.json();
        const list = Array.isArray(data) ? data : data?.data ?? data?.subjects ?? [];
        if (mounted) setSubjects(list);
      } catch {
        /* ignore */
      } finally {
        if (mounted) setLoadingSubjects(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const userId = user?._id || user?.id || '';
  const vidyaSubjectNames = useMemo(
    () =>
      collectVidyaSubjectLabels({
        subjects,
        assignedSubjects: user?.assignedSubjects,
        assignedClassSubjects: user?.assignedClass?.assignedSubjects,
      }),
    [subjects, user?.assignedSubjects, user?.assignedClass?.assignedSubjects]
  );

  const chatContext = useMemo(
    () => ({
      studentName: resolveStudentDisplayName(user),
      subjectOptions: vidyaSubjectNames,
      currentSubject: vidyaSubjectNames[0] || 'General Study',
      currentTopic: undefined,
    }),
    [user, vidyaSubjectNames]
  );

  const loading = authLoading || loadingSubjects;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <View style={styles.headerContent}>
          <VidyaAvatar size={44} borderColor="#c7d2fe" />
          <View>
            <Text style={styles.headerTitle}>Vidya AI</Text>
            <Text style={styles.headerSub}>Your AI Study Buddy</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {loading || !userId ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <StudentVidyaChatPanel userId={userId} context={chatContext} embedded />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // transparent so the app-wide pastel artwork shows behind the chat
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.55)',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
