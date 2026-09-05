import { storageGetItem } from '../src/lib/safe-storage';
import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { API_BASE_URL } from '../src/lib/api-config';
import { useContentViewerBack } from '../src/hooks/useBackNavigation';
import MediaPreviewPanel from '../src/components/shared/MediaPreviewPanel';
import { type PdfPageState, type PdfPreviewHandle } from '../src/components/shared/PdfPreviewWebView';
import { getPreviewKind, resolveContentUrl } from '../src/utils/contentPreview';

interface DriveFile {
  _id: string;
  title: string;
  description?: string;
  driveLink: string;
  fileType?: string;
  subject?: {
    _id: string;
    name: string;
  } | string;
  createdAt: string;
}

function pickParam(v: string | string[] | undefined): string {
  if (v == null) return '';
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === 'string' ? s : '';
}

export default function DriveViewer() {
  const params = useLocalSearchParams<{
    fileId?: string;
    driveLink?: string;
    title?: string;
    contentType?: string;
    returnTo?: string | string[];
  }>();
  const fileId = pickParam(params.fileId);
  const returnTo = pickParam(params.returnTo);
  const driveLinkRaw = pickParam(params.driveLink);
  const paramTitle = pickParam(params.title);
  const contentType = pickParam(params.contentType);
  const driveLink = (() => {
    if (!driveLinkRaw) return '';
    try {
      return decodeURIComponent(driveLinkRaw);
    } catch {
      return driveLinkRaw;
    }
  })();

  const [file, setFile] = useState<DriveFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfPage, setPdfPage] = useState<PdfPageState>({ page: 1, pageCount: 0, ready: false });
  const [pageDraft, setPageDraft] = useState('1');
  const pdfRef = useRef<PdfPreviewHandle>(null);
  const pageInputFocusedRef = useRef(false);
  const goBack = useContentViewerBack(returnTo || undefined);

  const previewUrl = resolveContentUrl(file?.driveLink || driveLink);
  const previewTitle = file?.title || paramTitle || 'Preview';
  const previewKind = getPreviewKind(previewUrl, contentType || file?.fileType);
  const showFindPage = previewKind === 'pdf';

  const onPdfPageStateChange = useCallback((state: PdfPageState) => {
    setPdfPage(state);
    if (!pageInputFocusedRef.current) {
      setPageDraft(String(state.page));
    }
  }, []);

  const jumpToHeaderPage = useCallback(() => {
    const parsed = Number.parseInt(String(pageDraft).replace(/[^\d]/g, ''), 10);
    if (!Number.isFinite(parsed)) {
      setPageDraft(String(pdfPage.page));
      return;
    }
    pdfRef.current?.goToPage(parsed);
  }, [pageDraft, pdfPage.page]);

  useEffect(() => {
    setPdfPage({ page: 1, pageCount: 0, ready: false });
    setPageDraft('1');
  }, [previewUrl]);

  const fetchFile = async () => {
    try {
      setIsLoading(true);
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/drive-files/${fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const fileData = data.data || data;
        setFile(fileData);
      } else {
        Alert.alert('Error', 'Failed to load file');
      }
    } catch (error) {
      console.error('Error fetching file:', error);
      Alert.alert('Error', 'An error occurred while loading the file');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (driveLink) {
      setIsLoading(false);
    } else if (fileId) {
      fetchFile();
    } else {
      setIsLoading(false);
    }
  }, [fileId, driveLink]);

  const renderBody = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading preview…</Text>
        </View>
      );
    }

    if (!previewUrl) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>File not found</Text>
        </View>
      );
    }

    return (
      <MediaPreviewPanel
        key={`${previewUrl}|${contentType}|${previewTitle}`}
        fileUrl={previewUrl}
        title={previewTitle}
        contentType={contentType || file?.fileType}
        pdfRef={pdfRef}
        hidePdfPageBar={showFindPage}
        onPdfPageStateChange={onPdfPageStateChange}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => void goBack()} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {previewTitle}
            </Text>
            {file?.description ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {file.description}
              </Text>
            ) : null}
          </View>
        </View>
        {showFindPage ? (
          <View style={styles.findPageRow}>
            <TouchableOpacity
              style={[styles.findPageNav, (!pdfPage.ready || pdfPage.page <= 1) && styles.findPageDisabled]}
              onPress={() => pdfRef.current?.prevPage()}
              disabled={!pdfPage.ready || pdfPage.page <= 1}
              accessibilityRole="button"
              accessibilityLabel="Previous page"
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.findPageLabel}>Page</Text>
            <TextInput
              value={pageDraft}
              onChangeText={(text) => setPageDraft(text.replace(/[^\d]/g, ''))}
              onFocus={() => {
                pageInputFocusedRef.current = true;
              }}
              onBlur={() => {
                pageInputFocusedRef.current = false;
                jumpToHeaderPage();
              }}
              onSubmitEditing={jumpToHeaderPage}
              keyboardType="number-pad"
              returnKeyType="go"
              selectTextOnFocus
              editable={pdfPage.ready}
              style={styles.findPageInput}
              accessibilityLabel="Go to page number"
            />
            <Text style={styles.findPageLabel}>
              of {pdfPage.ready ? pdfPage.pageCount : '—'}
            </Text>
            <TouchableOpacity
              style={[styles.findPageGo, !pdfPage.ready && styles.findPageDisabled]}
              onPress={jumpToHeaderPage}
              disabled={!pdfPage.ready}
              accessibilityRole="button"
              accessibilityLabel="Go to page"
            >
              <Text style={styles.findPageGoText}>Go</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.findPageNav,
                (!pdfPage.ready || pdfPage.page >= pdfPage.pageCount) && styles.findPageDisabled,
              ]}
              onPress={() => pdfRef.current?.nextPage()}
              disabled={!pdfPage.ready || pdfPage.page >= pdfPage.pageCount}
              accessibilityRole="button"
              accessibilityLabel="Next page"
            >
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}
      </LinearGradient>

      <View style={styles.previewContainer}>{renderBody()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    zIndex: 20,
    elevation: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBack: {
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  findPageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  findPageNav: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  findPageLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  findPageInput: {
    width: 56,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    color: '#0f172a',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 0,
  },
  findPageGo: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  findPageGoText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  findPageDisabled: {
    opacity: 0.35,
  },
});
