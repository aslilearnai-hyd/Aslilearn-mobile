import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { router, useFocusEffect } from 'expo-router';
import { openContentPreview } from '../../../src/utils/openContentPreview';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import { prepareLibraryContents } from '../../../src/lib/dedupe-library-content';
import { GlassPanel } from '../../../src/components/ui';

interface ContentItem {
  _id: string;
  title: string;
  description?: string;
  type: 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio' | 'Homework';
  fileUrl: string;
  date: string | Date;
  createdAt: string | Date;
  deadline?: string;
  subject?: {
    _id: string;
    name: string;
  } | string;
}

interface WeekContent {
  weekStart: Date;
  weekEnd: Date;
  contents: ContentItem[];
}

interface CalendarViewProps {
  contents?: ContentItem[];
  onMarkAsDone?: (contentId: string) => void;
  completedItems?: string[];
}

export default function CalendarView({ contents: propContents, onMarkAsDone, completedItems = [] }: CalendarViewProps) {
  const { isAsliPrepExclusive } = useSchoolProgram();
  const [contents, setContents] = useState<ContentItem[]>(propContents || []);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());
  const [markedDone, setMarkedDone] = useState<Set<string>>(new Set(completedItems));
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<ContentItem | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionDescription, setSubmissionDescription] = useState('');

  useEffect(() => {
    if (propContents && propContents.length > 0) {
      setContents(prepareLibraryContents(propContents, isAsliPrepExclusive));
      return;
    }
    fetchContents();
  }, [isAsliPrepExclusive, propContents]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsPreviewOpen(false);
        setSelectedContent(null);
      };
    }, [])
  );

  const fetchContents = async () => {
    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/asli-prep-content`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContents(prepareLibraryContents(data.data || data || [], isAsliPrepExclusive));
      }
    } catch (error) {
      console.error('Failed to fetch contents:', error);
    }
  };

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() + diff);
    return weekStart;
  };

  const getWeekEnd = (date: Date): Date => {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  };

  const organizeByWeeks = (contents: ContentItem[]): WeekContent[] => {
    if (!contents || contents.length === 0) return [];

    const sortedContents = [...contents].sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(a.createdAt);
      const dateB = b.date ? new Date(b.date) : new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });

    const weeksMap = new Map<string, ContentItem[]>();

    sortedContents.forEach(content => {
      let contentDate: Date;
      if (content.date) {
        contentDate = new Date(content.date);
      } else if (content.createdAt) {
        contentDate = new Date(content.createdAt);
      } else {
        return;
      }

      if (isNaN(contentDate.getTime())) return;

      const weekStart = getWeekStart(contentDate);
      const weekEnd = getWeekEnd(contentDate);
      const weekKey = `${weekStart.getTime()}_${weekEnd.getTime()}`;

      if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, []);
      }
      weeksMap.get(weekKey)!.push(content);
    });

    const weeks: WeekContent[] = Array.from(weeksMap.entries())
      .filter(([_, contents]) => contents.length > 0)
      .map(([key, contents]) => {
        const [startTime, endTime] = key.split('_').map(Number);
        return {
          weekStart: new Date(startTime),
          weekEnd: new Date(endTime),
          contents: contents.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(a.createdAt);
            const dateB = b.date ? new Date(b.date) : new Date(b.createdAt);
            return dateA.getTime() - dateB.getTime();
          })
        };
      })
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

    return weeks;
  };

  const formatDateRange = (start: Date, end: Date): string => {
    const startDay = start.getDate();
    const startMonth = start.toLocaleString('default', { month: 'short' });
    const endDay = end.getDate();
    const endMonth = end.toLocaleString('default', { month: 'short' });
    
    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  };

  const toggleWeek = (weekKey: string) => {
    const newExpanded = new Set(expandedWeeks);
    if (newExpanded.has(weekKey)) {
      newExpanded.delete(weekKey);
    } else {
      newExpanded.add(weekKey);
    }
    setExpandedWeeks(newExpanded);
  };

  const handleMarkAsDone = (contentId: string) => {
    const newMarked = new Set(markedDone);
    if (newMarked.has(contentId)) {
      newMarked.delete(contentId);
    } else {
      newMarked.add(contentId);
    }
    setMarkedDone(newMarked);
    if (onMarkAsDone) {
      onMarkAsDone(contentId);
    }
  };

  const handleContentClick = (content: ContentItem) => {
    if (content.type === 'Homework') {
      setSelectedHomework(content);
      setIsSubmissionOpen(true);
    } else {
      setSelectedContent(content);
      setIsPreviewOpen(true);
    }
  };

  const handleSubmitHomework = async () => {
    if (!selectedHomework || !submissionLink.trim()) {
      Alert.alert('Validation Error', 'Please Provide A Submission Link');
      return;
    }

    try {
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/homework-submission`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          homeworkId: selectedHomework._id,
          submissionLink: submissionLink.trim(),
          description: submissionDescription.trim()
        })
      });

      if (response.ok) {
        handleMarkAsDone(selectedHomework._id);
        Alert.alert('Success', 'Homework Submitted Successfully!');
        setIsSubmissionOpen(false);
        setSubmissionLink('');
        setSubmissionDescription('');
      } else {
        Alert.alert('Error', 'Failed To Submit Homework');
      }
    } catch (error) {
      console.error('Error submitting homework:', error);
      Alert.alert('Error', 'An Error Occurred While Submitting Homework');
    }
  };

  const handleDownload = (content: ContentItem) => {
    setIsPreviewOpen(false);
    setSelectedContent(null);
    openContentPreview(router, content);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Video': return 'videocam';
      case 'TextBook': return 'book';
      case 'Workbook': return 'document-text';
      case 'Material': return 'document';
      case 'Audio': return 'musical-notes';
      case 'Homework': return 'clipboard';
      default: return 'document';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Video': return '#ef4444';
      case 'TextBook': return '#3b82f6';
      case 'Workbook': return '#9333ea';
      case 'Material': return '#10b981';
      case 'Audio': return '#f59e0b';
      case 'Homework': return '#f97316';
      default: return '#6b7280';
    }
  };

  const weeks = organizeByWeeks(contents);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {weeks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#5B6779" />
          <Text style={styles.emptyText}>No Scheduled Content</Text>
          <Text style={styles.emptySubtext}>Content Will Appear Here When Scheduled</Text>
        </View>
      ) : (
        weeks.map((week) => {
          const weekKey = `${week.weekStart.getTime()}_${week.weekEnd.getTime()}`;
          const isExpanded = expandedWeeks.has(weekKey);

          return (
            <GlassPanel key={weekKey} style={styles.weekCard} radius={12}>
              <TouchableOpacity
                style={styles.weekHeader}
                onPress={() => toggleWeek(weekKey)}
              >
                <View style={styles.weekHeaderLeft}>
                  <Ionicons name="calendar" size={20} color="#3b82f6" />
                  <Text style={styles.weekTitle}>
                    {formatDateRange(week.weekStart, week.weekEnd)}
                  </Text>
                  <View style={styles.weekBadge}>
                    <Text style={styles.weekBadgeText}>{week.contents.length} Items</Text>
                  </View>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.weekContent}>
                  {week.contents.map((content) => {
                    const isDone = markedDone.has(content._id);
                    const typeColor = getTypeColor(content.type);
                    const subjectName = typeof content.subject === 'object' 
                      ? content.subject?.name 
                      : content.subject || 'General';

                    return (
                      <TouchableOpacity
                        key={content._id}
                        style={[styles.contentItem, isDone && styles.contentItemDone]}
                        onPress={() => handleContentClick(content)}
                      >
                        <View style={[styles.contentIcon, { backgroundColor: typeColor + '20' }]}>
                          <Ionicons name={getTypeIcon(content.type) as any} size={20} color={typeColor} />
                        </View>
                        <View style={styles.contentInfo}>
                          <View style={styles.contentHeader}>
                            <Text style={styles.contentTitle} numberOfLines={1}>
                              {content.title}
                            </Text>
                            {isDone && (
                              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                            )}
                          </View>
                          <Text style={styles.contentSubject}>{subjectName}</Text>
                          {content.deadline && (
                            <Text style={styles.contentDeadline}>
                              Deadline: {new Date(content.deadline).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.markButton}
                          onPress={() => handleMarkAsDone(content._id)}
                        >
                          <Ionicons
                            name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                            size={24}
                            color={isDone ? '#10b981' : '#5B6779'}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </GlassPanel>
          );
        })
      )}

      {/* Preview Modal */}
      <Modal
        visible={isPreviewOpen}
        animationType="slide"
        onRequestClose={() => setIsPreviewOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedContent?.title}</Text>
            <TouchableOpacity onPress={() => setIsPreviewOpen(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          {selectedContent && (
            <ScrollView style={styles.modalContent}>
              {selectedContent.description && (
                <Text style={styles.modalDescription}>{selectedContent.description}</Text>
              )}
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => handleDownload(selectedContent)}
              >
                <Ionicons name="eye" size={20} color="#fff" />
                <Text style={styles.downloadButtonText}>View</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Homework Submission Modal */}
      <Modal
        visible={isSubmissionOpen}
        animationType="slide"
        onRequestClose={() => setIsSubmissionOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submit Homework</Text>
            <TouchableOpacity onPress={() => setIsSubmissionOpen(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>
          {selectedHomework && (
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalDescription}>{selectedHomework.title}</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Submission Link *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://..."
                  value={submissionLink}
                  onChangeText={setSubmissionLink}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add Any Notes..."
                  value={submissionDescription}
                  onChangeText={setSubmissionDescription}
                  multiline
                  numberOfLines={4}
                />
              </View>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitHomework}
              >
                <Text style={styles.submitButtonText}>Submit Homework</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  weekCard: {
    // Fill comes from GlassPanel's blur + tint, not a solid colour.
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  weekHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  weekBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  weekBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3730a3',
  },
  weekContent: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    gap: 12,
  },
  contentItemDone: {
    opacity: 0.6,
  },
  contentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentInfo: {
    flex: 1,
    gap: 4,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  contentSubject: {
    fontSize: 12,
    color: '#6b7280',
  },
  contentDeadline: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  markButton: {
    padding: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#6d5bd0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});


