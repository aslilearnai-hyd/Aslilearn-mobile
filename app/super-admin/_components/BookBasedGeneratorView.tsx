import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useCurriculumCascade } from '../../../src/hooks/useCurriculumCascade';
import {
  BOOK_BASED_STUDENT_TOOLS,
  BOOK_BASED_TEACHER_TOOLS,
  BOOK_BASED_TOOLS,
  type BookBasedToolId,
} from '../../../src/lib/book-based-tools';
import { fetchBookKnowledgeBooks, type BookRow } from '../../../src/lib/book-knowledge';
import { generateBookBatch, releaseBookGeneratorLock } from '../../../src/lib/book-generator';
import { fetchGeneratorBoardOptions } from '../../../src/lib/ai-generator';
import {
  computeGeminiCostFromTokenUsage,
  emptyTokenTotals,
  formatCostInr,
  formatTokenCount,
  perRecordShareFromCost,
  type GeminiCostEstimate,
  type TokenTotals,
} from '../../../src/lib/gemini-token-cost';
import {
  GENERATION_RECORD_COUNT_MIN,
  GENERATION_RECORD_COUNT_MAX,
  generationRecordCountButtonLabel,
  isValidGenerationRecordCount,
  parseGenerationRecordCount,
  sanitizeGenerationRecordCountInput,
} from '../../../src/lib/generation-record-count';
import { filterSubjectsForAiTool, isLanguageExcludedTool, isStoryLanguageTool, isStoryPassageLanguageSubject, LANGUAGE_EXCLUDED_TOOL_ERROR } from '../../../src/lib/student-ai-tools';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';

type Props = {
  onOpenBookKnowledge?: () => void;
};

function normalizeClassLabel(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'Unassigned';
  return /^class\b/i.test(trimmed) ? trimmed : `Class ${trimmed}`;
}

export default function BookBasedGeneratorView({ onOpenBookKnowledge }: Props) {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [bookId, setBookId] = useState('');
  const [selectedTool, setSelectedTool] = useState<BookBasedToolId | ''>('');
  const [board, setBoard] = useState('');
  const [boardOptions, setBoardOptions] = useState<string[]>([]);
  const [classNumber, setClassNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [subTopic, setSubTopic] = useState('');
  const [generationRecordCount, setGenerationRecordCount] = useState('10');
  const [questionCount, setQuestionCount] = useState('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLocked, setGenerationLocked] = useState(false);
  const [lastSummary, setLastSummary] = useState<{
    successCount: number;
    failedCount: number;
    batchSize: number;
    tokenUsage: TokenTotals;
    cost: GeminiCostEstimate;
    perRecordCost: { usd: number; inr: number };
  } | null>(null);

  const { classOptions, subjects, topics, subtopics, loadingClasses, loadingSubjects, loadingTopics, loadingSubtopics } =
    useCurriculumCascade(classNumber || undefined, subject || undefined, topic || undefined, board || undefined);

  const selectedBook = useMemo(() => books.find((b) => b._id === bookId), [books, bookId]);
  const currentTool = useMemo(() => BOOK_BASED_TOOLS.find((t) => t.id === selectedTool), [selectedTool]);
  const subjectsForTool = useMemo(
    () => filterSubjectsForAiTool(selectedTool || '', subjects),
    [selectedTool, subjects],
  );
  const classOptionsForSelect = useMemo(() => {
    if (classNumber && !classOptions.includes(classNumber)) {
      return [classNumber, ...classOptions];
    }
    return classOptions;
  }, [classOptions, classNumber]);
  const subjectOptionsForSelect = useMemo(() => {
    const base = subjectsForTool;
    if (subject && !base.some((s) => s.toLowerCase() === subject.toLowerCase())) {
      return [subject, ...base];
    }
    return base;
  }, [subjectsForTool, subject]);
  const boardOptionsForSelect = useMemo(() => {
    if (board && !boardOptions.some((b) => b.toLowerCase() === board.toLowerCase())) {
      return [...boardOptions, board].sort((a, b) => a.localeCompare(b));
    }
    return boardOptions;
  }, [boardOptions, board]);
  const bookReady = Boolean(selectedBook?.embeddingsCreated && selectedBook?.processingStatus === 'indexed');

  const loadBooks = useCallback(async () => {
    setBooksLoading(true);
    try {
      setBooks(await fetchBookKnowledgeBooks());
    } catch (err: any) {
      Alert.alert('Load Failed', err?.message || 'Could not load books.');
    } finally {
      setBooksLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBooks();
    void fetchGeneratorBoardOptions().then((boards) => {
      if (boards.length) setBoardOptions(boards);
    });
  }, [loadBooks]);

  const selectBook = useCallback((book: BookRow) => {
    setBookId(book._id);
    const nextBoard = String(book.board || '').trim();
    const nextClassRaw = normalizeClassLabel(book.class);
    const nextClass = nextClassRaw === 'Unassigned' ? '' : nextClassRaw;
    const nextSubject = String(book.subject || '').trim();
    const nextTopic = String(book.topic || '').trim();
    const nextSubTopic = String(book.subtopic || '').trim();

    if (nextBoard) {
      setBoard(nextBoard);
      setBoardOptions((prev) =>
        prev.includes(nextBoard) ? prev : [...prev, nextBoard].sort((a, b) => a.localeCompare(b)),
      );
    }
    setClassNumber(nextClass);
    setSubject(nextSubject);
    setTopic(nextTopic);
    setSubTopic(nextSubTopic);
  }, []);

  const buildPayload = (forceUnlock = false) => {
    const countTools = new Set([
      'worksheet-mcq-generator',
      'smart-qa-practice-generator',
      'mock-test-builder',
      'exam-question-paper-generator',
      'homework-creator',
    ]);
    const n = Number(questionCount);
    const q =
      Number.isFinite(n) && n > 0 ? Math.min(40, Math.max(1, Math.floor(n))) : 10;
    return {
      toolSlug: selectedTool,
      toolName: currentTool?.name || selectedTool,
      board,
      className: classNumber,
      subjectName: subject,
      topicName: topic,
      subtopicName: subTopic,
      bookId,
      batchSize: parseGenerationRecordCount(generationRecordCount) || 10,
      useBookKnowledge: true,
      ...(selectedTool && countTools.has(selectedTool)
        ? { extraParams: { questionCount: q, numberOfQuestions: q } }
        : {}),
      ...(forceUnlock ? { forceUnlock: true } : {}),
    };
  };

  const generate = async (opts?: { forceUnlock?: boolean }) => {
    if (!bookId || !bookReady) {
      Alert.alert('Select Book', 'Choose an indexed textbook first.');
      return;
    }
    if (!selectedTool || !board || !classNumber || !subject || !topic || !subTopic) {
      Alert.alert('Missing Fields', 'Book, tool, board, class, subject, topic and sub topic are required.');
      return;
    }
    if (!isValidGenerationRecordCount(generationRecordCount)) {
      Alert.alert('Invalid Count', `Enter ${GENERATION_RECORD_COUNT_MIN}–${GENERATION_RECORD_COUNT_MAX} records.`);
      return;
    }
    if (isStoryLanguageTool(selectedTool) && !isStoryPassageLanguageSubject(subject)) {
      Alert.alert('English, Hindi, Or Telugu Only', 'This tool works only with English, Hindi, or Telugu subjects.');
      return;
    }
    if (isLanguageExcludedTool(selectedTool) && isStoryPassageLanguageSubject(subject)) {
      Alert.alert('Language Subjects Not Supported', LANGUAGE_EXCLUDED_TOOL_ERROR);
      return;
    }
    setIsGenerating(true);
    setGenerationLocked(false);
    if (!opts?.forceUnlock) setLastSummary(null);
    try {
      const result = await generateBookBatch(buildPayload(opts?.forceUnlock));
      const usage = result.tokenUsage;
      const tokenUsage = usage?.totals ? { ...emptyTokenTotals(), ...usage.totals } : emptyTokenTotals();
      const tokenCalls = Array.isArray(usage?.calls) ? usage.calls : [];
      const exchangeRateInr = Number(result.cost?.exchangeRateInr) || 95.11;
      const cost =
        result.cost && Number(result.cost.inr) >= 0
          ? result.cost
          : computeGeminiCostFromTokenUsage({ totals: tokenUsage, calls: tokenCalls }, exchangeRateInr);
      const savedCount = Number(result.savedCount) || 0;
      const perRecord = perRecordShareFromCost(cost, savedCount || 1);
      setLastSummary({
        successCount: savedCount,
        failedCount: Number(result.failedCount) || 0,
        batchSize: Number(result.batchSize) || parseGenerationRecordCount(generationRecordCount) || 10,
        tokenUsage,
        cost,
        perRecordCost: perRecord,
      });
      Alert.alert(
        savedCount > 0 ? 'Batch Saved' : 'Batch Failed',
        `${savedCount}/${result.batchSize || generationRecordCount} saved · ${formatTokenCount(tokenUsage.totalTokens)} tokens · ${formatCostInr(cost.inr)}`,
      );
    } catch (err: any) {
      if (err?.locked) setGenerationLocked(true);
      Alert.alert('Generation Failed', err?.message || 'Could not generate.');
    } finally {
      setIsGenerating(false);
    }
  };

  const releaseLockAndRetry = async () => {
    try {
      await releaseBookGeneratorLock(buildPayload());
      setGenerationLocked(false);
      await generate({ forceUnlock: true });
    } catch (err: any) {
      Alert.alert('Could Not Clear Lock', err?.message || 'Failed to release lock.');
    }
  };

  const indexedBooks = books.filter((b) => b.processingStatus === 'indexed');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      showsVerticalScrollIndicator
      refreshControl={<RefreshControl refreshing={booksLoading} onRefresh={() => void loadBooks()} />}
    >
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Book-Based Generator</Text>
        <Text style={styles.heroSub}>Generate curriculum content grounded in indexed textbooks (Flash-Lite).</Text>
        {onOpenBookKnowledge ? (
          <Pressable style={styles.linkBtn} onPress={onOpenBookKnowledge}>
            <Ionicons name="library-outline" size={16} color="#6d28d9" />
            <Text style={styles.linkBtnText}>Open Book Knowledge Base</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 1 — Select Textbook</Text>
        {indexedBooks.length === 0 ? (
          <Text style={styles.emptyText}>No indexed books. Import or upload in Book Knowledge Base.</Text>
        ) : (
          indexedBooks.map((book) => (
            <Pressable
              key={book._id}
              style={[styles.bookRow, bookId === book._id && styles.bookRowActive]}
              onPress={() => selectBook(book)}
            >
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text style={styles.bookMeta}>
                {book.board} · {normalizeClassLabel(book.class)} · {book.subject}
                {book.chunkCount ? ` · ${book.chunkCount} chunks` : ''}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 2 — Choose Tool, Then Inputs</Text>
        <Text style={[styles.subHeading, { marginTop: 0 }]}>1. Choose Tool</Text>
        <Text style={styles.subHeading}>Teacher Tools</Text>
        {BOOK_BASED_TEACHER_TOOLS.map((tool) => (
          <Pressable
            key={`teacher-${tool.id}`}
            style={[styles.toolRow, selectedTool === tool.id && styles.toolRowActive]}
            onPress={() => setSelectedTool(tool.id as BookBasedToolId)}
          >
            <Text style={styles.toolName}>{tool.name}</Text>
            <Text style={styles.toolDesc}>{tool.description}</Text>
          </Pressable>
        ))}
        <Text style={styles.subHeading}>Student Tools</Text>
        {BOOK_BASED_STUDENT_TOOLS.map((tool) => (
          <Pressable
            key={`student-${tool.id}`}
            style={[styles.toolRow, selectedTool === tool.id && styles.toolRowActive]}
            onPress={() => setSelectedTool(tool.id as BookBasedToolId)}
          >
            <Text style={styles.toolName}>{tool.name}</Text>
            <Text style={styles.toolDesc}>{tool.description}</Text>
          </Pressable>
        ))}

        <Text style={[styles.subHeading, { marginTop: 16 }]}>2. Curriculum Inputs</Text>
        {!selectedTool ? (
          <Text style={styles.emptyText}>Select a tool above to unlock curriculum fields.</Text>
        ) : null}
        <View style={!selectedTool ? { opacity: 0.5 } : undefined} pointerEvents={selectedTool ? 'auto' : 'none'}>
        <Text style={styles.fieldLabel}>Board</Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {boardOptionsForSelect.map((b) => (
            <Pressable key={b} style={[styles.chip, board === b && styles.chipActive]} onPress={() => setBoard(b)}>
              <Text style={[styles.chipText, board === b && styles.chipTextActive]}>{b}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.fieldLabel}>Class</Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {(loadingClasses ? [] : classOptionsForSelect).map((c) => (
            <Pressable key={c} style={[styles.chip, classNumber === c && styles.chipActive]} onPress={() => setClassNumber(c)}>
              <Text style={[styles.chipText, classNumber === c && styles.chipTextActive]}>{c}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.fieldLabel}>Subject</Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {(loadingSubjects ? [] : subjectOptionsForSelect).map((s) => (
            <Pressable key={s} style={[styles.chip, subject === s && styles.chipActive]} onPress={() => setSubject(s)}>
              <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.fieldLabel}>Topic</Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {(loadingTopics ? [] : topics).map((t) => (
            <Pressable key={t} style={[styles.chip, topic === t && styles.chipActive]} onPress={() => setTopic(t)}>
              <Text style={[styles.chipText, topic === t && styles.chipTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.fieldLabel}>Sub Topic</Text>
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.chipRow}
          keyboardShouldPersistTaps="handled"
        >
          {(loadingSubtopics ? [] : subtopics).map((st) => (
            <Pressable key={st} style={[styles.chip, subTopic === st && styles.chipActive]} onPress={() => setSubTopic(st)}>
              <Text style={[styles.chipText, subTopic === st && styles.chipTextActive]}>{st}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.fieldLabel}>Records to Generate ({GENERATION_RECORD_COUNT_MIN}–{GENERATION_RECORD_COUNT_MAX})</Text>
        <TextInput
          style={styles.input}
          value={generationRecordCount}
          keyboardType="number-pad"
          onChangeText={(v) => {
            const next = sanitizeGenerationRecordCountInput(v);
            if (next !== null) setGenerationRecordCount(next);
          }}
        />
        {(
          selectedTool === 'worksheet-mcq-generator' ||
          selectedTool === 'smart-qa-practice-generator' ||
          selectedTool === 'mock-test-builder' ||
          selectedTool === 'exam-question-paper-generator' ||
          selectedTool === 'homework-creator'
        ) ? (
          <>
            <Text style={styles.fieldLabel}>Number Of Questions (1–40)</Text>
            <TextInput
              style={styles.input}
              value={questionCount}
              keyboardType="number-pad"
              placeholder="e.g. 10"
              onChangeText={setQuestionCount}
            />
          </>
        ) : null}
        </View>
        <Pressable
          style={[styles.generateBtn, (isGenerating || !selectedTool || !bookReady) && styles.generateBtnDisabled]}
          onPress={() => void generate()}
          disabled={isGenerating || !selectedTool || !bookReady}
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.generateBtnText}>
              {generationRecordCountButtonLabel(generationRecordCount, isGenerating)}
            </Text>
          )}
        </Pressable>
        {generationLocked ? (
          <Pressable style={styles.lockBtn} onPress={() => void releaseLockAndRetry()}>
            <Text style={styles.lockBtnText}>Clear Lock & Retry</Text>
          </Pressable>
        ) : null}
      </View>

      {lastSummary ? (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>
            Last Batch: {lastSummary.successCount}/{lastSummary.batchSize} Saved
          </Text>
          <Text style={styles.summaryLine}>
            {formatTokenCount(lastSummary.tokenUsage.totalTokens)} Tokens · Batch {formatCostInr(lastSummary.cost.inr)}
            {lastSummary.successCount > 0 ? ` · ~${formatCostInr(lastSummary.perRecordCost.inr)}/Record` : ''}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Clear the absolute floating tab bar so Generate stays reachable.
  content: { padding: 16, paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, gap: 16, flexGrow: 1 },
  hero: { gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  heroSub: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkBtnText: { color: '#6d28d9', fontWeight: '700', fontSize: 13 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  subHeading: { fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginTop: 4 },
  emptyText: { color: '#64748b', fontSize: 13 },
  bookRow: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, gap: 4 },
  bookRowActive: { borderColor: '#7c3aed', backgroundColor: '#f5f3ff' },
  bookTitle: { fontWeight: '700', color: '#0f172a', fontSize: 14 },
  bookMeta: { fontSize: 12, color: '#64748b' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
  chipRow: { flexGrow: 0 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#cbd5e1', marginRight: 8, backgroundColor: '#FFFFFF' },
  chipActive: { backgroundColor: '#ede9fe', borderColor: '#8b5cf6' },
  chipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#5b21b6' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  toolRow: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, gap: 4 },
  toolRowActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  toolName: { fontWeight: '700', color: '#0f172a', fontSize: 13 },
  toolDesc: { fontSize: 11, color: '#64748b' },
  generateBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  generateBtnDisabled: { opacity: 0.55 },
  generateBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  lockBtn: { borderWidth: 1, borderColor: '#f59e0b', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  lockBtnText: { color: '#b45309', fontWeight: '700' },
  summary: { backgroundColor: '#ecfdf5', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#a7f3d0', gap: 4 },
  summaryTitle: { fontWeight: '800', color: '#065f46', fontSize: 13 },
  summaryLine: { color: '#047857', fontSize: 12 },
});
