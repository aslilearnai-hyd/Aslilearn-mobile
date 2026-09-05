import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/api/api';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';

interface Subject {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  board: string;
  classNumber?: string;
  isActive: boolean;
  createdAt: string;
}

const BOARDS = [
  { value: 'ASLI_EXCLUSIVE_SCHOOLS', label: 'Asli Exclusive Schools' }
];

export default function SubjectManagementView() {
  const [selectedBoard, setSelectedBoard] = useState<string>('ASLI_EXCLUSIVE_SCHOOLS');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBySubject, setFilterBySubject] = useState<string>('all');
  const [filterByClass, setFilterByClass] = useState<string>('all');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    board: 'ASLI_EXCLUSIVE_SCHOOLS'
  });

  useEffect(() => {
    fetchSubjects();
    setFilterBySubject('all');
    setFilterByClass('all');
  }, [selectedBoard]);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      setError('');
      const response = await api.get(`/api/super-admin/boards/${selectedBoard}/subjects`);
      const data = response?.data;
      setSubjects(data?.data || data?.subjects || []);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to fetch subjects.');
      console.error('Failed to fetch subjects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getUniqueSubjectNames = () => {
    return Array.from(new Set(subjects.map(s => s.name).filter(Boolean)));
  };

  const getUniqueClassNumbers = () => {
    return Array.from(new Set(subjects.map(s => s.classNumber).filter(Boolean))).sort();
  };

  const filteredSubjects = useMemo(() => {
    let filtered = subjects;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(subject =>
        subject.name.toLowerCase().includes(query) ||
        (subject.code && subject.code.toLowerCase().includes(query)) ||
        (subject.description && subject.description.toLowerCase().includes(query))
      );
    }

    // Subject filter
    if (filterBySubject !== 'all') {
      filtered = filtered.filter(s => s.name === filterBySubject);
    }

    // Class filter
    if (filterByClass !== 'all') {
      filtered = filtered.filter(s => s.classNumber === filterByClass);
    }

    return filtered;
  }, [subjects, searchQuery, filterBySubject, filterByClass]);

  const handleCreate = async () => {
    if (!formData.name || !formData.board) return;

    try {
      await api.post('/api/super-admin/subjects', formData);
      setIsAddModalOpen(false);
      setFormData({ name: '', code: '', description: '', board: selectedBoard });
      fetchSubjects();
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to create subject.');
      console.error('Failed to create subject:', err);
    }
  };

  const handleDelete = async (subjectId: string) => {
    setIsDeleting(subjectId);
    try {
      await api.delete(`/api/super-admin/subjects/${subjectId}`);
      fetchSubjects();
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to delete subject.');
      console.error('Failed to delete subject:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const colorSchemes = [
    { bg: ['#fdba74', '#fb923c'] as [string, string], text: '#fff' },
    { bg: ['#7dd3fc', '#38bdf8'] as [string, string], text: '#fff' },
    { bg: ['#2dd4bf', '#14b8a6'] as [string, string], text: '#fff' },
  ];

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} nestedScrollEnabled>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Subject Management</Text>
          <Text style={styles.headerSubtitle}>Create and manage subjects for each board</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddModalOpen(true)}
        >
          <LinearGradient
            colors={['#7dd3fc', '#2dd4bf']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Subject</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#5B6779" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects by name, code, or description..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#5B6779"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#5B6779" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Board:</Text>
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>ASLI EXCLUSIVE SCHOOLS</Text>
          </View>
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Filter by Subject:</Text>
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>
              {filterBySubject === 'all' ? 'All Subjects' : filterBySubject}
            </Text>
          </View>
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Filter by Class:</Text>
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>
              {filterByClass === 'all' ? 'All Classes' : `Class ${filterByClass}`}
            </Text>
          </View>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {filteredSubjects.length} of {subjects.length} subjects
          </Text>
        </View>
      </View>

      {/* Subjects List */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading subjects...</Text>
        </View>
      ) : subjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book" size={64} color="#5B6779" />
          <Text style={styles.emptyText}>No subjects yet</Text>
          <Text style={styles.emptySubtext}>Start creating subjects for {BOARDS.find(b => b.value === selectedBoard)?.label} board</Text>
        </View>
      ) : filteredSubjects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book" size={64} color="#5B6779" />
          <Text style={styles.emptyText}>No subjects match filters</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filter criteria</Text>
        </View>
      ) : (
        <View style={styles.subjectsList}>
          {filteredSubjects.map((subject, index) => {
            const colorScheme = colorSchemes[index % 3];
            return (
              <View key={subject._id} style={styles.subjectCard}>
                <LinearGradient
                  colors={colorScheme.bg}
                  style={styles.subjectCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.subjectCardHeader}>
                    <View style={styles.subjectCardHeaderLeft}>
                      <Text style={styles.subjectCardTitle}>{subject.name}</Text>
                      {subject.code && (
                        <View style={styles.codeBadge}>
                          <Text style={styles.codeBadgeText}>{subject.code}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(subject._id)}
                      disabled={isDeleting === subject._id}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {subject.description && (
                    <Text style={styles.subjectCardDescription} numberOfLines={2}>
                      {subject.description}
                    </Text>
                  )}
                  <View style={styles.subjectCardDetails}>
                    {subject.classNumber && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Class:</Text>
                        <View style={styles.detailBadge}>
                          <Text style={styles.detailBadgeText}>Class {subject.classNumber}</Text>
                        </View>
                      </View>
                    )}
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Board:</Text>
                      <View style={styles.boardBadge}>
                        <Text style={styles.boardBadgeText}>Asli Exclusive Schools</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <View style={[styles.statusBadge, subject.isActive ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
                        <Text style={styles.statusBadgeText}>
                          {subject.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            );
          })}
        </View>
      )}

      {/* Add Subject Modal */}
      <Modal visible={isAddModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Subject</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Subject Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Mathematics, Physics, Chemistry"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Subject Code (Optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., MATH, PHY, CHEM"
                  value={formData.code}
                  onChangeText={(text) => setFormData({ ...formData, code: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  placeholder="Enter subject description"
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsAddModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreate}
              >
                <Text style={styles.submitButtonText}>Create Subject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  addButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
    paddingRight: 8,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterBadgeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  countBadgeText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  subjectsList: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 20,
  },
  subjectCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  subjectCardGradient: {
    padding: 20,
  },
  subjectCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subjectCardHeaderLeft: {
    flex: 1,
  },
  subjectCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  codeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    padding: 8,
  },
  subjectCardDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 16,
  },
  subjectCardDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  detailBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  boardBadge: {
    backgroundColor: '#ea580c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  boardBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: '#10b981',
  },
  statusBadgeInactive: {
    backgroundColor: '#6b7280',
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    color: '#dc2626',
    paddingHorizontal: 20,
    marginBottom: 8,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});






