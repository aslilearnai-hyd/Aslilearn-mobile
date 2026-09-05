import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, TextInput, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../../src/services/api/api';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';

interface Content {
  _id: string;
  title: string;
  description?: string;
  type: 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio';
  board: string;
  subject: {
    _id: string;
    name: string;
  };
  classNumber?: string;
  topic?: string;
  date?: string;
  fileUrl: string;
  fileUrls?: string[];
  duration?: number;
  createdAt: string;
}

const BOARDS = [
  { value: 'ASLI_EXCLUSIVE_SCHOOLS', label: 'Asli Exclusive Schools' }
];

export default function ContentManagementView() {
  const [selectedBoard, setSelectedBoard] = useState<string>('ASLI_EXCLUSIVE_SCHOOLS');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBySubject, setFilterBySubject] = useState<string>('all');
  const [filterByClass, setFilterByClass] = useState<string>('all');
  const [filterByType, setFilterByType] = useState<string>('all');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Video' as 'TextBook' | 'Workbook' | 'Material' | 'Video' | 'Audio',
    board: 'ASLI_EXCLUSIVE_SCHOOLS',
    subject: '',
    topic: '',
    date: '',
    fileUrl: '',
    duration: ''
  });

  useEffect(() => {
    fetchSubjects();
    fetchContents();
    setFilterBySubject('all');
    setFilterByClass('all');
    setFilterByType('all');
  }, [selectedBoard]);

  const fetchSubjects = async () => {
    try {
      setError('');
      const response = await api.get(`/api/super-admin/boards/${selectedBoard}/subjects`);
      const data = response?.data;
      setSubjects(data?.data || data?.subjects || []);
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to fetch subjects.');
      console.error('Failed to fetch subjects:', err);
    }
  };

  const fetchContents = async () => {
    setIsLoading(true);
    try {
      setError('');
      const response = await api.get(`/api/super-admin/boards/${selectedBoard}/content`);
      const data = response?.data;
      if (Array.isArray(data)) {
        setContents(data);
      } else if (Array.isArray(data?.data)) {
        setContents(data.data);
      } else {
        setContents([]);
      }
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to fetch contents.');
      console.error('Failed to fetch contents:', err);
      setContents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getUniqueSubjectNames = () => {
    return Array.from(new Set(contents.map(c => c.subject?.name).filter(Boolean)));
  };

  const getUniqueClassNumbers = () => {
    return Array.from(new Set(contents.map(c => c.classNumber).filter(Boolean))).sort();
  };

  const getUniqueContentTypes = () => {
    return Array.from(new Set(contents.map(c => c.type).filter(Boolean)));
  };

  const filteredContents = useMemo(() => {
    let filtered = contents;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(content =>
        content.title.toLowerCase().includes(query) ||
        (content.description && content.description.toLowerCase().includes(query)) ||
        (content.subject?.name && content.subject.name.toLowerCase().includes(query))
      );
    }

    // Subject filter
    if (filterBySubject !== 'all') {
      filtered = filtered.filter(c => c.subject?.name === filterBySubject);
    }

    // Class filter
    if (filterByClass !== 'all') {
      filtered = filtered.filter(c => c.classNumber === filterByClass);
    }

    // Type filter
    if (filterByType !== 'all') {
      filtered = filtered.filter(c => c.type === filterByType);
    }

    return filtered;
  }, [contents, searchQuery, filterBySubject, filterByClass, filterByType]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Video': return 'videocam';
      case 'TextBook': return 'book';
      case 'Workbook': return 'document-text';
      case 'Material': return 'document';
      case 'Audio': return 'musical-notes';
      default: return 'document';
    }
  };

  const handleDelete = async (contentId: string) => {
    setIsDeleting(contentId);
    try {
      await api.delete(`/api/super-admin/content/${contentId}`);
      fetchContents();
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Failed to delete content.');
      console.error('Failed to delete content:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleViewContent = (content: Content) => {
    const url = content.fileUrl || (content.fileUrls && content.fileUrls[0]);
    if (url) {
      Linking.openURL(url);
    }
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} nestedScrollEnabled>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Content Management</Text>
          <Text style={styles.headerSubtitle}>Manage videos, notes & materials</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsUploadModalOpen(true)}
        >
          <LinearGradient
            colors={['#7dd3fc', '#2dd4bf']}
            style={styles.addButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="cloud-upload" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Upload Content</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#5B6779" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search content by title, description, or subject..."
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
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Filter by Type:</Text>
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>
              {filterByType === 'all' ? 'All Types' : filterByType}
            </Text>
          </View>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>
            {filteredContents.length} of {contents.length} items
          </Text>
        </View>
      </View>

      {/* Contents List */}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      ) : contents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-upload" size={64} color="#5B6779" />
          <Text style={styles.emptyText}>No content yet</Text>
          <Text style={styles.emptySubtext}>Start uploading exclusive content for {BOARDS.find(b => b.value === selectedBoard)?.label} students</Text>
        </View>
      ) : filteredContents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-upload" size={64} color="#5B6779" />
          <Text style={styles.emptyText}>No content matches filters</Text>
          <Text style={styles.emptySubtext}>Try adjusting your filter criteria</Text>
        </View>
      ) : (
        <View style={styles.contentsList}>
          {filteredContents.map((content) => (
            <View key={content._id} style={styles.contentCard}>
              <LinearGradient
                colors={['#7dd3fc', '#2dd4bf', '#14b8a6']}
                style={styles.contentCardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.contentCardHeader}>
                  <View style={styles.contentCardHeaderLeft}>
                    <Text style={styles.contentCardTitle}>{content.title}</Text>
                    <View style={styles.typeBadge}>
                      <Ionicons name={getTypeIcon(content.type)} size={16} color="#fff" />
                      <Text style={styles.typeBadgeText}>{content.type}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDelete(content._id)}
                    disabled={isDeleting === content._id}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                {content.description && (
                  <Text style={styles.contentCardDescription} numberOfLines={2}>
                    {content.description}
                  </Text>
                )}
                <View style={styles.contentCardDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Subject:</Text>
                    <Text style={styles.detailValue}>{content.subject?.name || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Board:</Text>
                    <Text style={styles.detailValue}>Asli Exclusive Schools</Text>
                  </View>
                  {content.topic && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Topic:</Text>
                      <Text style={styles.detailValue}>{content.topic}</Text>
                    </View>
                  )}
                  {content.date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(content.date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  {content.duration && (content.type === 'Video' || content.type === 'Audio') && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Duration:</Text>
                      <Text style={styles.detailValue}>{content.duration} min</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => handleViewContent(content)}
                >
                  <Ionicons name="eye" size={18} color="#111827" />
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          ))}
        </View>
      )}

      {/* Upload Modal - Simplified for now */}
      <Modal visible={isUploadModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload New Content</Text>
              <TouchableOpacity onPress={() => setIsUploadModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter content title"
                  value={formData.title}
                  onChangeText={(text) => setFormData({ ...formData, title: text })}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>File URL *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter file URL"
                  value={formData.fileUrl}
                  onChangeText={(text) => setFormData({ ...formData, fileUrl: text })}
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsUploadModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => {
                  // Handle upload - simplified for now
                  setIsUploadModalOpen(false);
                }}
              >
                <Text style={styles.submitButtonText}>Upload</Text>
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
  contentsList: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 20,
  },
  contentCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  contentCardGradient: {
    padding: 20,
  },
  contentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contentCardHeaderLeft: {
    flex: 1,
  },
  contentCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  deleteButton: {
    padding: 8,
  },
  contentCardDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 16,
  },
  contentCardDetails: {
    gap: 8,
    marginBottom: 16,
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
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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

