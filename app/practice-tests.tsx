import { storageGetItem } from '../src/lib/safe-storage';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../src/lib/api-config';
import { useBackNavigation, getDashboardPath } from '../src/hooks/useBackNavigation';
import { GlassPanel } from '../src/components/ui';

export default function PracticeTests() {
  const router = useRouter();
  const [tests, setTests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardPath, setDashboardPath] = useState<string>('/dashboard');

  useEffect(() => {
    fetchTests();
    // Get dashboard path for back navigation
    getDashboardPath().then(path => {
      if (path) setDashboardPath(path);
    });
  }, []);

  // Navigate back to dashboard when back button is pressed
  useBackNavigation(dashboardPath, false);

  const fetchTests = async () => {
    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/quizzes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTests(data.quizzes || data.data || []);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading tests...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Practice Tests</Text>
        <Text style={styles.headerSubtitle}>Test your knowledge</Text>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {tests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text" size={64} color="#5B6779" />
            <Text style={styles.emptyText}>No tests available</Text>
          </View>
        ) : (
          tests.map((test, index) => (
            <TouchableOpacity
              key={test._id || index}
              style={styles.testCard}
              onPress={() => router.push(`/quiz/${test._id}`)}
            >
              {/* the touchable stays for hit area; the glass card carries the padding */}
              <GlassPanel style={styles.testCardInner} radius={16} tone="medium">
                <View style={styles.testHeader}>
                  <View style={styles.testIcon}>
                    <Ionicons name="document-text" size={24} color="#3b82f6" />
                  </View>
                  <View style={styles.testInfo}>
                    <Text style={styles.testTitle}>{test.title || test.name || 'Practice Test'}</Text>
                    <Text style={styles.testDescription} numberOfLines={2}>
                      {test.description || 'Test your knowledge with this practice quiz'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#5B6779" />
                </View>
                <View style={styles.testMeta}>
                  {test.duration ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="time" size={16} color="#6b7280" />
                      <Text style={styles.metaText}>{test.duration} min</Text>
                    </View>
                  ) : null}
                  <View style={styles.metaItem}>
                    <Ionicons name="document-text" size={16} color="#6b7280" />
                    <Text style={styles.metaText}>
                      {test.questionCount ??
                        (Array.isArray(test.questions) ? test.questions.length : null) ??
                        '—'}{' '}
                      questions
                    </Text>
                  </View>
                  {test.difficulty ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="speedometer-outline" size={16} color="#6b7280" />
                      <Text style={styles.metaText}>{test.difficulty}</Text>
                    </View>
                  ) : null}
                  {(test.bestScore != null || test.score != null) && (
                    <View style={styles.metaItem}>
                      <Ionicons name="trophy" size={16} color="#f59e0b" />
                      <Text style={styles.metaText}>
                        Best: {test.bestScore ?? test.score}%
                      </Text>
                    </View>
                  )}
                  {test.totalPoints != null ? (
                    <View style={styles.metaItem}>
                      <Ionicons name="star-outline" size={16} color="#6b7280" />
                      <Text style={styles.metaText}>{test.totalPoints} pts</Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => router.push(`/quiz/${test._id}`)}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.startButtonText}>Start Test</Text>
                </TouchableOpacity>
              </GlassPanel>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // transparent so the app-wide pastel artwork shows through the glass cards
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.55)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  testCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
  },
  testCardInner: {
    borderRadius: 16,
    padding: 20,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  testIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  testInfo: {
    flex: 1,
  },
  testTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  testDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  testMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.7)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

