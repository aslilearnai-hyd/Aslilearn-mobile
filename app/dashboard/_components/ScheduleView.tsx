import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import { prepareLibraryContents } from '../../../src/lib/dedupe-library-content';
import { GlassPanel } from '../../../src/components/ui';

export default function ScheduleView() {
  const { isAsliPrepExclusive } = useSchoolProgram();
  const [incompleteContent, setIncompleteContent] = useState<any[]>([]);
  const [incompleteQuizzes, setIncompleteQuizzes] = useState<any[]>([]);
  const [completedScheduleIds, setCompletedScheduleIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchScheduleItems();
  }, [isAsliPrepExclusive]);

  const fetchScheduleItems = async () => {
    try {
      setIsLoading(true);
      const token = await storageGetItem('authToken');
      
      const [contentRes, quizzesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/student/asli-prep-content`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/student/quizzes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (contentRes.ok) {
        const contentData = await contentRes.json();
        const allContent = prepareLibraryContents(
          contentData.data || contentData || [],
          isAsliPrepExclusive
        );
        const incomplete = allContent.filter((content: any) => {
          const contentId = content._id || content.id;
          return !completedScheduleIds.has(contentId);
        });
        setIncompleteContent(incomplete.slice(0, 10));
      }

      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        const allQuizzes = quizzesData.data || [];
        const incompleteQuiz = allQuizzes.filter((quiz: any) => {
          return !quiz.hasAttempted || !quiz.completedAt;
        });
        setIncompleteQuizzes(incompleteQuiz.slice(0, 10));
      }
    } catch (error) {
      console.error('Failed to fetch schedule items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsComplete = (item: any, isQuiz: boolean = false) => {
    const itemId = item._id || item.id;
    const newCompleted = new Set(completedScheduleIds);
    newCompleted.add(itemId);
    setCompletedScheduleIds(newCompleted);
  };

  const getContentTypeLabel = (type: string) => {
    if (type === 'Video') return 'Watch';
    if (type === 'TextBook' || type === 'Workbook') return 'Read';
    if (type === 'Material') return 'Review';
    return 'Complete';
  };

  const getSubjectName = (contentItem: any): string => {
    if (typeof contentItem.subjectId === 'object' && contentItem.subjectId?.name) {
      return contentItem.subjectId.name;
    }
    if (typeof contentItem.subject === 'string') {
      return contentItem.subject;
    }
    if (typeof contentItem.subject === 'object' && contentItem.subject?.name) {
      return contentItem.subject.name;
    }
    return 'Unknown Subject';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="checkmark-circle" size={24} color="#14b8a6" />
          </View>
          <View>
            <Text style={styles.headerTitle}>To-Dos</Text>
            <Text style={styles.headerDate}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : incompleteContent.length === 0 && incompleteQuizzes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={64} color="#10b981" />
          <Text style={styles.emptyStateTitle}>All Caught Up!</Text>
          <Text style={styles.emptyStateText}>No Pending Content Or Quizzes</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Incomplete Quizzes */}
          {incompleteQuizzes.map((quiz: any) => {
            const isCompleted = completedScheduleIds.has(quiz._id);
            return (
              <TouchableOpacity
                key={`quiz-${quiz._id}`}
                onPress={() => handleMarkAsComplete(quiz, true)}
              >
                <GlassPanel radius={12} style={[styles.todoItem, isCompleted && styles.todoItemCompleted]}>
                <View style={styles.todoRow}>
                {isCompleted ? (
                  <View style={styles.checkboxCompleted}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.checkbox} />
                )}
                <View style={styles.todoContent}>
                  <View style={styles.todoHeader}>
                    <Text style={[styles.todoTitle, isCompleted && styles.todoTitleCompleted]}>
                      Complete {quiz.title || 'Quiz'}
                    </Text>
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityText}>
                        {quiz.difficulty === 'Hard' || quiz.difficulty === 'Expert' ? 'High' :
                         quiz.difficulty === 'Medium' ? 'Medium' : 'Low'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.todoMeta}>
                    <Text style={styles.todoMetaText}>
                      {typeof quiz.subject === 'string' 
                        ? quiz.subject 
                        : (typeof quiz.subject === 'object' && quiz.subject?.name 
                          ? quiz.subject.name 
                          : 'Unknown Subject')}
                    </Text>
                    <View style={styles.todoMetaItem}>
                      <Ionicons name="time" size={14} color="#6b7280" />
                      <Text style={styles.todoMetaText}>{quiz.duration || 30} Min</Text>
                    </View>
                    {quiz.questionCount > 0 && (
                      <Text style={styles.todoMetaText}>{quiz.questionCount} Questions</Text>
                    )}
                  </View>
                </View>
                </View>
                </GlassPanel>
              </TouchableOpacity>
            );
          })}

          {/* Incomplete Content */}
          {incompleteContent.map((content: any) => {
            const isCompleted = completedScheduleIds.has(content._id);
            const isHomework = content.type === 'Homework';
            const deadline = content.deadline ? new Date(content.deadline) : null;
            const isOverdue = deadline && deadline < new Date() && !isCompleted;
            const subjectName = getSubjectName(content);

            return (
              <TouchableOpacity
                key={`content-${content._id}`}
                onPress={() => handleMarkAsComplete(content, false)}
              >
                <GlassPanel
                  radius={12}
                  style={[
                    styles.todoItem,
                    isCompleted && styles.todoItemCompleted,
                    isOverdue && styles.todoItemOverdue
                  ]}
                >
                <View style={styles.todoRow}>
                {isCompleted ? (
                  <View style={styles.checkboxCompleted}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.checkbox} />
                )}
                <View style={styles.todoContent}>
                  <View style={styles.todoHeader}>
                    <Text style={[styles.todoTitle, isCompleted && styles.todoTitleCompleted]}>
                      {getContentTypeLabel(content.type || 'Material')} {content.title || 'Content'}
                    </Text>
                    <View style={[styles.priorityBadge, isHomework && styles.priorityBadgeHigh]}>
                      <Text style={[styles.priorityText, isHomework && styles.priorityTextHigh]}>
                        {isHomework ? 'High' : 'Medium'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.todoMeta}>
                    <Text style={styles.todoMetaText}>{subjectName}</Text>
                    {content.type && (
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{content.type}</Text>
                      </View>
                    )}
                    {isHomework && deadline && (
                      <View style={[styles.deadlineBadge, isOverdue && styles.deadlineBadgeOverdue]}>
                        <Text style={[styles.deadlineText, isOverdue && styles.deadlineTextOverdue]}>
                          Due: {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                </View>
                </GlassPanel>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  // Row layout moves to todoRow; the completed/overdue fills stay opaque
  // because a solid tint is what communicates the item's state.
  todoItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  todoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  todoItemCompleted: {
    backgroundColor: '#d1fae5',
  },
  todoItemOverdue: {
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5B6779',
    marginTop: 2,
  },
  checkboxCompleted: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  todoContent: {
    flex: 1,
    gap: 8,
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  priorityBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityBadgeHigh: {
    backgroundColor: '#fee2e2',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  priorityTextHigh: {
    color: '#ef4444',
  },
  todoMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  todoMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todoMetaText: {
    fontSize: 14,
    color: '#6b7280',
  },
  typeBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    color: '#6b7280',
  },
  deadlineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deadlineBadgeOverdue: {
    backgroundColor: '#fee2e2',
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  deadlineTextOverdue: {
    color: '#dc2626',
  },
});


