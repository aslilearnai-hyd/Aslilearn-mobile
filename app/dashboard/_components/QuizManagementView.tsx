import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { router } from 'expo-router';
import { GlassPanel } from '../../../src/components/ui';

interface Quiz {
  _id: string;
  title: string;
  description: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  totalQuestions: number;
  passMark: number;
  isActive: boolean;
  createdAt: string;
}

interface Subject {
  _id: string;
  name: string;
}

export default function QuizManagementView() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    description: '',
    subject: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    duration: '30',
    totalQuestions: '10',
    passMark: '60',
  });

  useEffect(() => {
    fetchQuizzes();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    }
  };

  const fetchQuizzes = async () => {
    try {
      setIsLoading(true);
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/quizzes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = (quiz: Quiz) => {
    router.push(`/quiz/${quiz._id}`);
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSearch = quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || quiz.subject === filterSubject;
    const matchesDifficulty = filterDifficulty === 'all' || quiz.difficulty === filterDifficulty;
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Quizzes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <GlassPanel radius={0} bordered={false} tone="light" style={styles.header}>
        <Text style={styles.headerTitle}>Quiz Management</Text>
        <Text style={styles.headerSubtitle}>Practice And Test Your Knowledge</Text>
      </GlassPanel>

      {/* Search and Filters */}
      <GlassPanel radius={0} bordered={false} tone="light" style={styles.filtersContainer}>
        <View style={styles.filtersStack}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Quizzes..."
            placeholderTextColor="#5B6779"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filterSubject === 'all' && styles.filterChipActive]}
            onPress={() => setFilterSubject('all')}
          >
            <Text style={[styles.filterChipText, filterSubject === 'all' && styles.filterChipTextActive]}>
              All Subjects
            </Text>
          </TouchableOpacity>
          {subjects.map(subject => (
            <TouchableOpacity
              key={subject._id}
              style={[styles.filterChip, filterSubject === subject._id && styles.filterChipActive]}
              onPress={() => setFilterSubject(subject._id)}
            >
              <Text style={[styles.filterChipText, filterSubject === subject._id && styles.filterChipTextActive]}>
                {subject.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'easy', 'medium', 'hard'].map(difficulty => (
            <TouchableOpacity
              key={difficulty}
              style={[styles.filterChip, filterDifficulty === difficulty && styles.filterChipActive]}
              onPress={() => setFilterDifficulty(difficulty)}
            >
              <Text style={[styles.filterChipText, filterDifficulty === difficulty && styles.filterChipTextActive]}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        </View>
      </GlassPanel>

      {/* Quizzes List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredQuizzes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="help-circle-outline" size={64} color="#5B6779" />
            <Text style={styles.emptyText}>No Quizzes Found</Text>
            <Text style={styles.emptySubtext}>Try Adjusting Your Filters</Text>
          </View>
        ) : (
          filteredQuizzes.map((quiz) => {
            const subjectName = subjects.find(s => s._id === quiz.subject)?.name || 'Unknown';
            return (
              <GlassPanel key={quiz._id} radius={12} style={styles.quizCard}>
                <View style={styles.quizHeader}>
                  <View style={styles.quizInfo}>
                    <Text style={styles.quizTitle}>{quiz.title}</Text>
                    <Text style={styles.quizDescription} numberOfLines={2}>
                      {quiz.description}
                    </Text>
                  </View>
                  <View style={[styles.difficultyBadge, styles[`difficulty${quiz.difficulty}`]]}>
                    <Text style={styles.difficultyText}>{quiz.difficulty}</Text>
                  </View>
                </View>

                <View style={styles.quizDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="book" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{subjectName}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="time" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{quiz.duration} Mins</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="help-circle" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>{quiz.totalQuestions} Questions</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="trophy" size={16} color="#6b7280" />
                    <Text style={styles.detailText}>Pass: {quiz.passMark}%</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => handleStartQuiz(quiz)}
                >
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.startButtonText}>Start Quiz</Text>
                </TouchableOpacity>
              </GlassPanel>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Transparent so the app background artwork shows through.
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  // `gap` governed the children, so it moves inside GlassPanel's content view.
  filtersStack: {
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 0,
    paddingRight: 12,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  quizCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  quizInfo: {
    flex: 1,
    marginRight: 12,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  quizDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyeasy: {
    backgroundColor: '#d1fae5',
  },
  difficultymedium: {
    backgroundColor: '#fef3c7',
  },
  difficultyhard: {
    backgroundColor: '#fee2e2',
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  quizDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});


