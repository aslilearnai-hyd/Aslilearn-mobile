import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Toast from '../../../src/components/Toast';
import { useToast } from '../../../src/hooks/useToast';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';
import { useCurriculumCascade } from '../../../src/hooks/useCurriculumCascade';
import {
  deleteBookKnowledgeBook,
  fetchBookKnowledgeBooks,
  fetchImportableContent,
  importBookFromContent,
  importBooksFromContentBulk,
  reindexBookKnowledgeBook,
  uploadBookKnowledgePdf,
  type BookRow,
  type ImportableContentRow,
} from '../../../src/lib/book-knowledge';
import { fetchGeneratorBoardOptions } from '../../../src/lib/ai-generator';

type Props = {
  onOpenBookBasedGenerator?: () => void;
};

const INDEX_POLL_MS = 4500;
const INDEX_POLL_MAX_MS = 3 * 60 * 1000;

/** Match web: show raw processingStatus badge text. */
function statusLabel(status?: string, indexed?: boolean) {
  if (indexed && !status) return 'indexed';
  return String(status || 'pending');
}

function isBookStillIndexing(book: BookRow) {
  const status = String(book.processingStatus || '').toLowerCase();
  return status === 'pending' || status === 'processing';
}

export default function BookKnowledgeBaseView({ onOpenBookBasedGenerator }: Props) {
  const { toast, toastState, hideToast } = useToast();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [importable, setImportable] = useState<ImportableContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importLoading, setImportLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importingIds, setImportingIds] = useState<Set<string>>(new Set());
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [board, setBoard] = useState('CBSE');
  const [boardOptions, setBoardOptions] = useState<string[]>(['CBSE']);
  const [classLabel, setClassLabel] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [subTopic, setSubTopic] = useState('');
  const [showImported, setShowImported] = useState(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAtRef = useRef<number>(0);

  const { classOptions, subjects, topics, subtopics, loadingClasses, loadingSubjects, loadingTopics, loadingSubtopics } =
    useCurriculumCascade(classLabel || undefined, subject || undefined, topic || undefined, board || undefined);

  const pendingImportable = useMemo(() => importable.filter((r) => !r.imported), [importable]);

  const stopIndexPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollStartedAtRef.current = 0;
  }, []);

  const loadBooksOnly = useCallback(async () => {
    const bookRows = await fetchBookKnowledgeBooks();
    setBooks(bookRows);
    return bookRows;
  }, []);

  const startIndexPolling = useCallback(() => {
    stopIndexPolling();
    pollStartedAtRef.current = Date.now();
    pollTimerRef.current = setInterval(() => {
      void (async () => {
        try {
          const bookRows = await loadBooksOnly();
          const stillIndexing = bookRows.some(isBookStillIndexing);
          const timedOut = Date.now() - pollStartedAtRef.current > INDEX_POLL_MAX_MS;
          if (!stillIndexing || timedOut) stopIndexPolling();
        } catch {
          /* keep polling until timeout */
          if (Date.now() - pollStartedAtRef.current > INDEX_POLL_MAX_MS) stopIndexPolling();
        }
      })();
    }, INDEX_POLL_MS);
  }, [loadBooksOnly, stopIndexPolling]);

  const refreshLists = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) setLoading(true);
      try {
        const [bookRows, importRows] = await Promise.all([
          fetchBookKnowledgeBooks(),
          fetchImportableContent(),
        ]);
        setBooks(bookRows);
        setImportable(importRows);
        if (bookRows.some(isBookStillIndexing)) startIndexPolling();
        else stopIndexPolling();
      } catch (err: any) {
        toast({
          title: 'Load Failed',
          description: err?.friendlyMessage || err?.message || 'Could not load book knowledge data.',
          variant: 'destructive',
        });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [startIndexPolling, stopIndexPolling, toast],
  );

  const loadAll = useCallback(async () => {
    await refreshLists({ silent: false });
  }, [refreshLists]);

  useEffect(() => {
    void loadAll();
    void fetchGeneratorBoardOptions().then((boards) => {
      if (boards.length) {
        setBoardOptions(boards);
        setBoard((prev) => (boards.includes(prev) ? prev : boards[0]));
      }
    });
  }, [loadAll]);

  useEffect(() => () => stopIndexPolling(), [stopIndexPolling]);

  const handleImportOne = async (contentId: string) => {
    const id = String(contentId || '').trim();
    if (!id) {
      toast({ title: 'Import Failed', description: 'This content item is missing an id.', variant: 'destructive' });
      return;
    }
    setImportingIds((prev) => new Set(prev).add(id));
    try {
      const result = await importBookFromContent(id);
      toast({
        title: result.alreadyImported ? 'Already Linked' : 'Imported',
        description: result.message || `${result.data?.title || 'Book'} is ready for indexing.`,
      });
      await refreshLists({ silent: true });
      startIndexPolling();
    } catch (err: any) {
      toast({
        title: 'Import Failed',
        description: err?.friendlyMessage || err?.message || 'Could not import content.',
        variant: 'destructive',
      });
    } finally {
      setImportingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBulkImport = async () => {
    const ids = [...selectedImportIds].map((id) => String(id || '').trim()).filter(Boolean);
    if (!ids.length) {
      toast({ title: 'Select Items', description: 'Choose at least one content item to import.', variant: 'destructive' });
      return;
    }
    setImportLoading(true);
    try {
      const result = await importBooksFromContentBulk(ids);
      const failedCount = Number(result.summary?.failed || 0);
      toast({
        title: 'Bulk Import Complete',
        description: result.message || `Imported ${result.summary?.imported || 0} books.`,
        variant: failedCount > 0 ? 'destructive' : undefined,
      });
      const failures = Array.isArray(result.data)
        ? result.data.filter((r) => !r.success).slice(0, 5)
        : [];
      if (failures.length) {
        const detail = failures
          .map((r) => `${r.title || r.contentId || 'item'}: ${r.message || 'failed'}`)
          .join(' · ');
        setTimeout(() => {
          toast({
            title: 'Why Some Imports Failed',
            description: detail + (failedCount > 5 ? ' · …' : ''),
            variant: 'destructive',
          });
        }, 2800);
      }
      setSelectedImportIds(new Set());
      await refreshLists({ silent: true });
      startIndexPolling();
    } catch (err: any) {
      toast({
        title: 'Bulk Import Failed',
        description: err?.friendlyMessage || err?.message || 'Could not import.',
        variant: 'destructive',
      });
    } finally {
      setImportLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!title.trim() || !board || !classLabel || !subject) {
      toast({
        title: 'Missing Fields',
        description: 'Title, board, class, and subject are required.',
        variant: 'destructive',
      });
      return;
    }
    const picked = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('board', board);
      formData.append('class', classLabel);
      formData.append('subject', subject);
      if (topic) formData.append('topic', topic);
      if (subTopic) formData.append('subtopic', subTopic);
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || 'book.pdf',
        type: asset.mimeType || 'application/pdf',
      } as any);
      const result = await uploadBookKnowledgePdf(formData);
      setTitle('');
      toast({
        title: 'Book Uploaded',
        description: result.message || 'Indexing started.',
      });
      await refreshLists({ silent: true });
      startIndexPolling();
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err?.message || 'Could not upload book.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async (id: string) => {
    setReindexingId(id);
    try {
      const result = await reindexBookKnowledgeBook(id);
      toast({
        title: 'Reindexed',
        description: `${result.data?.chunkCount || 0} chunks indexed.`,
      });
      await refreshLists({ silent: true });
      startIndexPolling();
    } catch (err: any) {
      toast({ title: 'Reindex Failed', description: err?.message || 'Could not reindex.', variant: 'destructive' });
    } finally {
      setReindexingId(null);
    }
  };

  const handleDelete = (book: BookRow) => {
    Alert.alert('Delete Book', `Remove "${book.title}" from knowledge base?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(book._id);
          try {
            await deleteBookKnowledgeBook(book._id);
            await loadAll();
          } catch (err: any) {
            Alert.alert('Delete Failed', err?.message || 'Could not delete.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const visibleImportRows = importable.filter((row) => (showImported ? true : !row.imported));

  return (
    <View style={styles.root}>
    <Toast
      visible={toastState.visible}
      message={toastState.message}
      type={toastState.type}
      onHide={hideToast}
      duration={4200}
    />
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void loadAll()} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Book Knowledge Base</Text>
        <Text style={styles.heroSub}>
          Import from Subject & Content or upload a new PDF. Indexed books power Book-Based Generator.
        </Text>
        {onOpenBookBasedGenerator ? (
          <Pressable style={styles.linkBtn} onPress={onOpenBookBasedGenerator}>
            <Ionicons name="sparkles-outline" size={16} color="#6d28d9" />
            <Text style={styles.linkBtnText}>Open Book-Based Generator</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Books</Text>
          <Text style={styles.statValue}>{books.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Indexed</Text>
          <Text style={styles.statValue}>{books.filter((b) => b.processingStatus === 'indexed').length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>To Import</Text>
          <Text style={styles.statValue}>{pendingImportable.length}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Import From Content</Text>
        <View style={styles.rowBetween}>
          <Pressable onPress={() => setShowImported((v) => !v)}>
            <Text style={styles.toggleText}>{showImported ? 'Hide Linked' : 'Show Linked'}</Text>
          </Pressable>
          {selectedImportIds.size > 0 ? (
            <Pressable style={styles.emeraldBtn} onPress={() => void handleBulkImport()} disabled={importLoading}>
              {importLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.emeraldBtnText}>Import Selected ({selectedImportIds.size})</Text>}
            </Pressable>
          ) : null}
        </View>
        {importLoading ? <ActivityIndicator style={{ marginVertical: 12 }} color="#059669" /> : null}
        {visibleImportRows.length === 0 ? (
          <Text style={styles.emptyText}>No importable content found.</Text>
        ) : (
          visibleImportRows.map((row) => (
            <View key={row.contentId} style={styles.card}>
              <View style={styles.cardTop}>
                {!row.imported ? (
                  <Pressable
                    onPress={() =>
                      setSelectedImportIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(row.contentId)) next.delete(row.contentId);
                        else next.add(row.contentId);
                        return next;
                      })
                    }
                  >
                    <Ionicons
                      name={selectedImportIds.has(row.contentId) ? 'checkbox' : 'square-outline'}
                      size={20}
                      color="#059669"
                    />
                  </Pressable>
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{row.title}</Text>
                  <Text style={styles.cardMeta}>
                    {row.type} · {row.board} · Class {row.classNumber || '—'} · {row.subjectName}
                  </Text>
                </View>
              </View>
              {row.imported ? (
                <Text style={styles.badgeReady}>Linked · {row.bookStatus || 'indexed'}</Text>
              ) : (
                <Pressable
                  style={styles.emeraldBtnSmall}
                  onPress={() => void handleImportOne(row.contentId)}
                  disabled={importingIds.has(row.contentId)}
                >
                  {importingIds.has(row.contentId) ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.emeraldBtnText}>Import</Text>
                  )}
                </Pressable>
              )}
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upload New Book</Text>
        <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
        <Text style={styles.fieldLabel}>Board</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {boardOptions.map((b) => (
            <Pressable key={b} style={[styles.chip, board === b && styles.chipActive]} onPress={() => setBoard(b)}>
              <Text style={[styles.chipText, board === b && styles.chipTextActive]}>{b}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.fieldLabel}>Class</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {(loadingClasses ? [] : classOptions).map((c) => (
            <Pressable key={c} style={[styles.chip, classLabel === c && styles.chipActive]} onPress={() => setClassLabel(c)}>
              <Text style={[styles.chipText, classLabel === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.fieldLabel}>Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {(loadingSubjects ? [] : subjects).map((s) => (
            <Pressable key={s} style={[styles.chip, subject === s && styles.chipActive]} onPress={() => setSubject(s)}>
              <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {subject ? (
          <>
            <Text style={styles.fieldLabel}>Topic (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {(loadingTopics ? [] : topics).map((t) => (
                <Pressable key={t} style={[styles.chip, topic === t && styles.chipActive]} onPress={() => setTopic(t)}>
                  <Text style={[styles.chipText, topic === t && styles.chipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
        {topic ? (
          <>
            <Text style={styles.fieldLabel}>Sub Topic (Optional)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {(loadingSubtopics ? [] : subtopics).map((st) => (
                <Pressable key={st} style={[styles.chip, subTopic === st && styles.chipActive]} onPress={() => setSubTopic(st)}>
                  <Text style={[styles.chipText, subTopic === st && styles.chipTextActive]}>{st}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}
        <Pressable style={styles.violetBtn} onPress={() => void handleUpload()} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.violetBtnText}>Pick PDF & Upload</Text>}
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Uploaded Books</Text>
        {books.length === 0 ? (
          <Text style={styles.emptyText}>No books yet.</Text>
        ) : (
          books.map((book) => (
            <View key={book._id} style={styles.card}>
              <Text style={styles.cardTitle}>{book.title}</Text>
              <Text style={styles.cardMeta}>
                {book.board} · {book.class} · {book.subject}
                {book.chunkCount ? ` · ${book.chunkCount} chunks` : ''}
              </Text>
              <Text style={book.processingStatus === 'indexed' ? styles.badgeReady : styles.badgePending}>
                {statusLabel(book.processingStatus, book.embeddingsCreated)}
              </Text>
              <View style={styles.cardActions}>
                <Pressable style={styles.actionBtn} onPress={() => void handleReindex(book._id)} disabled={reindexingId === book._id}>
                  <Text style={styles.actionBtnText}>{reindexingId === book._id ? '…' : 'Reindex'}</Text>
                </Pressable>
                <Pressable style={styles.actionBtnDanger} onPress={() => handleDelete(book)} disabled={deletingId === book._id}>
                  <Text style={styles.actionBtnDangerText}>{deletingId === book._id ? '…' : 'Delete'}</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, gap: 16, flexGrow: 1 },
  hero: { gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  heroSub: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  linkBtnText: { color: '#6d28d9', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  statLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginTop: 4 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  toggleText: { color: '#059669', fontWeight: '600', fontSize: 13 },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, gap: 8 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badgeReady: { fontSize: 11, fontWeight: '700', color: '#047857' },
  badgePending: { fontSize: 11, fontWeight: '700', color: '#b45309' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eff6ff' },
  actionBtnText: { color: '#1d4ed8', fontWeight: '700', fontSize: 12 },
  actionBtnDanger: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2' },
  actionBtnDangerText: { color: '#b91c1c', fontWeight: '700', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#FFFFFF' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  chipRow: { flexGrow: 0 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', marginRight: 8, backgroundColor: '#FFFFFF' },
  chipActive: { backgroundColor: '#ede9fe', borderColor: '#8b5cf6' },
  chipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#5b21b6' },
  violetBtn: { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  violetBtnText: { color: '#fff', fontWeight: '700' },
  emeraldBtn: { backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  emeraldBtnSmall: { alignSelf: 'flex-start', backgroundColor: '#059669', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  emeraldBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
