import { storageGetItem } from '../../lib/safe-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api/api';
import { downloadWeeklyReportPdf } from '../../lib/weekly-report-pdf';
import { formatAiToolText } from '../../lib/title-case';
import GlassPanel from '../ui/GlassPanel';

type DigestMetrics = Record<string, any>;

type Digest = {
  title?: string;
  summary?: string;
  highlights?: string[];
  metrics?: DigestMetrics;
};

function n(v: unknown, fallback = 0) {
  const num = Number(v);
  return Number.isFinite(num) ? num : fallback;
}

function MetricTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {formatAiToolText(label)}
      </Text>
      <Text style={styles.tileValue} numberOfLines={2}>
        {typeof value === 'string' ? formatAiToolText(value) : value}
      </Text>
      {hint ? (
        <Text style={styles.tileHint} numberOfLines={3}>
          {formatAiToolText(hint)}
        </Text>
      ) : null}
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={14} color="#0284C7" />
      <Text style={styles.sectionTitleText}>{formatAiToolText(title)}</Text>
    </View>
  );
}

export default function WeeklyDigestCard({
  apiBase = '/api/student',
}: {
  apiBase?: '/api/student' | '/api/teacher';
}) {
  const [loading, setLoading] = useState(true);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showAllMetrics, setShowAllMetrics] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const isStudent = apiBase === '/api/student';
  const isTeacher = apiBase === '/api/teacher';

  const load = useCallback(async (build = false) => {
    setLoading(true);
    try {
      const q = build ? '?build=1' : '';
      const { data } = await api.get(`${apiBase}/weekly-digest${q}`);
      const payload = data?.data || data || null;
      const next =
        payload && typeof payload === 'object' && (payload.metrics || payload.title || payload.summary)
          ? payload
          : null;
      setDigest(next);
    } catch {
      setDigest(null);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void load(true);
    (async () => {
      try {
        const raw = await storageGetItem('user');
        if (!raw) return;
        const user = JSON.parse(raw);
        setStudentName(String(user?.fullName || user?.name || '').trim());
        setSchoolName(
          String(
            user?.schoolName ||
              user?.collegeName ||
              user?.institutionName ||
              user?.assignedAdmin?.schoolName ||
              '',
          ).trim(),
        );
      } catch {
        /* ignore */
      }
    })();
  }, [load]);

  const m = digest?.metrics || {};
  const exams = Array.isArray(m.exams) ? m.exams : [];
  const omrResults = Array.isArray(m.omrResults) ? m.omrResults : [];

  const hasRichStudentMetrics = useMemo(() => {
    if (!isStudent || !digest?.metrics) return false;
    return (
      'loginCount' in digest.metrics ||
      'examAttempts' in digest.metrics ||
      'aiExplanations' in digest.metrics ||
      'topicsPractised' in digest.metrics
    );
  }, [digest, isStudent]);

  const hasRichTeacherMetrics = useMemo(() => {
    if (!isTeacher || !digest?.metrics) return false;
    return (
      'generationsCreated' in digest.metrics ||
      'status' in digest.metrics ||
      'loginCount' in digest.metrics ||
      digest.metrics.role === 'teacher'
    );
  }, [digest, isTeacher]);

  const handleDownload = async () => {
    if (!digest || downloading) return;
    setDownloading(true);
    try {
      await downloadWeeklyReportPdf({
        title: digest.title,
        summary: digest.summary,
        highlights: digest.highlights || [],
        studentName: studentName || undefined,
        schoolName: schoolName || undefined,
        role: isTeacher ? 'teacher' : 'student',
        metrics: (digest.metrics || {}) as Record<string, unknown>,
      });
    } catch (err) {
      console.error('Weekly PDF failed', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <GlassPanel tone="medium" elevated radius={18} style={styles.card} contentStyle={styles.cardInner}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="document-text-outline" size={18} color="#0284C7" />
          <Text style={styles.headerTitle}>{isTeacher ? 'Weekly Teacher Report' : 'Weekly Report'}</Text>
        </View>
        <View style={styles.headerActions}>
          {digest ? (
            <TouchableOpacity style={styles.downloadBtn} onPress={() => setPreviewOpen(true)}>
              <Ionicons name="download-outline" size={14} color="#0369A1" />
              <Text style={styles.downloadBtnText}>PDF</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => void load(true)} disabled={loading} hitSlop={8}>
            {loading ? (
              <ActivityIndicator size="small" color="#0284C7" />
            ) : (
              <Ionicons name="refresh" size={18} color="#64748B" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading && !digest ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : !digest ? (
        <Text style={styles.muted}>
          Your Weekly Digest Will Appear Here Every Monday. Tap Refresh To Build One For This Week.
        </Text>
      ) : hasRichTeacherMetrics ? (
        <View style={styles.body}>
          <Text style={styles.title}>{formatAiToolText(String(digest.title || ''))}</Text>
          <Text style={styles.summary}>{formatAiToolText(String(digest.summary || ''))}</Text>

          <SectionTitle icon="log-in-outline" title="Your activity" />
          <View style={styles.grid}>
            <MetricTile label="Logins this week" value={n(m.loginCount)} hint="Days you opened the app" />
            <MetricTile
              label="Time on platform"
              value={m.totalTimeLabel || `${n(m.minutes)} min`}
              hint="Total time spent this week"
            />
            <MetricTile
              label="AI resources created"
              value={n(m.generationsCreated)}
              hint="Worksheets, notes & more you made"
            />
            <MetricTile
              label="Students in classes"
              value={n(m.studentsInClasses)}
              hint="Learners across your classes"
            />
          </View>

          {!showAllMetrics ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => setShowAllMetrics(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Show more weekly report options"
            >
              <Ionicons name="add-circle-outline" size={16} color="#0369A1" />
              <Text style={styles.loadMoreText}>+ More Options</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.grid}>
                <MetricTile label="Sessions" value={n(m.sessions)} hint="Times you started using it" />
                <MetricTile label="Last active" value={m.lastActiveDate || '—'} hint="Your most recent visit" />
                <MetricTile
                  label="Status (14 days)"
                  value={String(m.status || '—')}
                  hint="Active if used in last 14 days"
                />
                <MetricTile label="Active days (14d)" value={n(m.activeDays)} hint="Days used in last 2 weeks" />
                <MetricTile label="Classes assigned" value={n(m.classesAssigned)} hint="Classes you teach" />
              </View>

              <SectionTitle icon="sparkles-outline" title="Teaching with AI" />
              <View style={styles.grid}>
                <MetricTile label="Vidya AI asks" value={n(m.aiDoubts)} hint="Questions you asked Vidya AI" />
                <MetricTile label="Tool opens" value={n(m.aiToolUses)} hint="Times you opened an AI tool" />
              </View>
              {(Array.isArray(m.toolsUsed) ? m.toolsUsed : []).length > 0 ? (
                (m.toolsUsed as Array<{ name?: string; count?: number; subjects?: string[] }>)
                  .slice(0, 8)
                  .map((tool, idx) => (
                    <View key={`${tool.name}-${idx}`} style={styles.listRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.listTitle} numberOfLines={1}>{tool.name || 'Tool'}</Text>
                        {Array.isArray(tool.subjects) && tool.subjects.length > 0 ? (
                          <Text style={styles.listSub} numberOfLines={1}>
                            {tool.subjects.slice(0, 3).join(' · ')}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.listPct}>{n(tool.count)}×</Text>
                    </View>
                  ))
              ) : (
                <Text style={styles.mutedSmall}>No AI Tools Used This Week Yet.</Text>
              )}

              <SectionTitle icon="people-outline" title="Your school this week" />
              <View style={styles.grid}>
                <MetricTile
                  label="Students accessed"
                  value={n(m.schoolStudentsAccessed)}
                  hint="Students who used the app"
                />
                <MetricTile
                  label="School sessions"
                  value={n(m.schoolSessions)}
                  hint="Total sessions across your school"
                />
                <MetricTile
                  label="Teachers active"
                  value={n(m.schoolTeachersActive)}
                  hint="Colleagues active this week"
                />
              </View>

              {(digest.highlights || []).length > 0 ? (
                <View style={styles.highlights}>
                  <Text style={styles.highlightsTitle}>This Week At A Glance</Text>
                  {(digest.highlights || []).map((h) => (
                    <Text key={h} style={styles.highlightItem}>
                      • {formatAiToolText(h)}
                    </Text>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.showLessBtn}
                onPress={() => setShowAllMetrics(false)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Show fewer weekly report options"
              >
                <Text style={styles.showLessText}>Show Less</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.cta} onPress={() => setPreviewOpen(true)} activeOpacity={0.9}>
            <LinearGradient colors={['#0EA5E9', '#0F766E']} style={styles.ctaGrad}>
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={styles.ctaText}>Download PDF Report</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : hasRichStudentMetrics ? (
        <View style={styles.body}>
          <Text style={styles.title}>{formatAiToolText(String(digest.title || ''))}</Text>
          <Text style={styles.summary}>{formatAiToolText(String(digest.summary || ''))}</Text>

          <SectionTitle icon="log-in-outline" title="Adoption" />
          <View style={styles.grid}>
            <MetricTile label="Logins" value={n(m.loginCount)} hint="Days opened" />
            <MetricTile label="Last active" value={m.lastActiveDate || '—'} />
            <MetricTile label="Activation" value={m.activationDate || '—'} />
          </View>

          <SectionTitle icon="time-outline" title="Engagement" />
          <View style={styles.grid}>
            <MetricTile label="Sessions" value={n(m.sessions)} />
            <MetricTile label="Total time" value={m.totalTimeLabel || `${n(m.minutes)} min`} />
            <MetricTile
              label="Avg session"
              value={n(m.avgSessionMinutes) > 0 ? `${n(m.avgSessionMinutes)} min` : '—'}
            />
          </View>

          {!showAllMetrics ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => setShowAllMetrics(true)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Load more weekly report metrics"
            >
              <Ionicons name="chevron-down" size={16} color="#0369A1" />
              <Text style={styles.loadMoreText}>Load More</Text>
            </TouchableOpacity>
          ) : (
            <>
              <SectionTitle icon="book-outline" title="Learning behaviour" />
              <View style={styles.grid}>
                <MetricTile label="Topics" value={n(m.topicsPractised)} />
                <MetricTile label="Repeated" value={n(m.topicsRepeated)} />
                <MetricTile label="Repeat %" value={`${n(m.repeatPracticePct)}%`} />
              </View>

              <SectionTitle icon="sparkles-outline" title="AI usage" />
              <View style={styles.grid}>
                <MetricTile
                  label="AI uses"
                  value={n(m.aiExplanations)}
                  hint={`Vidya ${n(m.aiDoubts)} · Tools ${n(m.aiToolUses)}`}
                />
                <MetricTile label="Practice" value={n(m.practiceAttempts) + n(m.iqAttempts)} />
                <MetricTile
                  label="Accuracy"
                  value={n(m.practiceAttempts) > 0 ? `${n(m.practiceAccuracy)}%` : '—'}
                />
              </View>

              <SectionTitle icon="construct-outline" title="Tools you used" />
              {(Array.isArray(m.toolsUsed) ? m.toolsUsed : []).length > 0 ? (
                (m.toolsUsed as Array<{ name?: string; count?: number; subjects?: string[] }>)
                  .slice(0, 8)
                  .map((tool, idx) => (
                    <View key={`${tool.name}-${idx}`} style={styles.listRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.listTitle} numberOfLines={1}>{tool.name || 'Tool'}</Text>
                        {Array.isArray(tool.subjects) && tool.subjects.length > 0 ? (
                          <Text style={styles.listSub} numberOfLines={1}>
                            {tool.subjects.slice(0, 3).join(' · ')}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.listPct}>{n(tool.count)}×</Text>
                    </View>
                  ))
              ) : (
                <Text style={styles.mutedSmall}>No AI Tools Used This Week Yet.</Text>
              )}

              <SectionTitle icon="library-outline" title="Subjects you used most" />
              {(Array.isArray(m.topSubjectsDetailed) ? m.topSubjectsDetailed : []).length > 0 ? (
                (m.topSubjectsDetailed as Array<{ subject?: string; sessions?: number; pct?: number }>)
                  .slice(0, 5)
                  .map((row, idx) => (
                    <View key={`${row.subject}-${idx}`} style={styles.listRow}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {idx === 0 ? 'Most · ' : ''}
                        {row.subject || 'Subject'}
                      </Text>
                      <Text style={styles.listPct}>
                        {n(row.sessions)}
                        {n(row.pct) > 0 ? ` · ${n(row.pct)}%` : ''}
                      </Text>
                    </View>
                  ))
              ) : m.topSubjects?.length ? (
                <Text style={styles.summary}>{(m.topSubjects as string[]).slice(0, 5).join(', ')}</Text>
              ) : (
                <Text style={styles.mutedSmall}>No Subject Activity This Week Yet.</Text>
              )}

              <SectionTitle icon="clipboard-outline" title="Exams" />
              <View style={styles.grid}>
                <MetricTile label="Written" value={n(m.examAttempts)} />
                <MetricTile label="Average" value={n(m.examAttempts) > 0 ? `${n(m.avgExamPct)}%` : '—'} />
                <MetricTile label="Best" value={n(m.examAttempts) > 0 ? `${n(m.bestExamPct)}%` : '—'} />
              </View>
              {exams.slice(0, 4).map((exam: any, idx: number) => (
                <View key={`${exam.title}-${idx}`} style={styles.listRow}>
                  <Text style={styles.listTitle} numberOfLines={1}>{exam.title}</Text>
                  <Text style={styles.listPct}>{n(exam.percentage)}%</Text>
                </View>
              ))}

              <SectionTitle icon="scan-outline" title="Offline Results" />
              <View style={styles.grid}>
                <MetricTile label="Offline Tests" value={n(m.omrAttempts)} />
                <MetricTile label="Average" value={n(m.omrAttempts) > 0 ? `${n(m.omrAvgPct)}%` : '—'} />
                <MetricTile label="Best" value={n(m.omrAttempts) > 0 ? `${n(m.omrBestPct)}%` : '—'} />
              </View>
              {omrResults.slice(0, 4).map((row: any, idx: number) => (
                <View key={`${row.title}-${idx}`} style={styles.listRow}>
                  <Text style={styles.listTitle} numberOfLines={1}>
                    {row.title}
                    {row.rank != null && Number(row.rank) > 0 ? ` · #${row.rank}` : ''}
                  </Text>
                  <Text style={styles.listPct}>{n(row.percentage)}%</Text>
                </View>
              ))}

              <SectionTitle icon="flame-outline" title="Content & progress" />
              <View style={styles.grid}>
                <MetricTile
                  label="Most used subject"
                  value={
                    m.mostUsedSubject?.subject ||
                    (m.topSubjects?.length ? m.topSubjects[0] : '—')
                  }
                  hint={
                    m.mostUsedSubject?.sessions
                      ? `${n(m.mostUsedSubject.sessions)} activities`
                      : undefined
                  }
                />
                <MetricTile label="Videos" value={n(m.videosWatched)} />
                <MetricTile label="Streak" value={n(m.streak) > 0 ? `${n(m.streak)}d` : '0'} />
                <MetricTile label="Mastery" value={`${n(m.masteryPct)}%`} />
                <MetricTile label="Homework" value={n(m.homeworkSubmissions)} />
                <MetricTile label="Chapters" value={n(m.chaptersCompleted)} />
              </View>

              {(digest.highlights || []).length > 0 ? (
                <View style={styles.highlights}>
                  <Text style={styles.highlightsTitle}>This Week At A Glance</Text>
                  {(digest.highlights || []).map((h) => (
                    <Text key={h} style={styles.highlightItem}>• {formatAiToolText(h)}</Text>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.showLessBtn}
                onPress={() => setShowAllMetrics(false)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Show less weekly report metrics"
              >
                <Text style={styles.showLessText}>Show Less</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.cta} onPress={() => setPreviewOpen(true)} activeOpacity={0.9}>
            <LinearGradient colors={['#0EA5E9', '#0F766E']} style={styles.ctaGrad}>
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={styles.ctaText}>Download PDF Report</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.title}>{formatAiToolText(String(digest.title || ''))}</Text>
          <Text style={styles.summary}>{formatAiToolText(String(digest.summary || ''))}</Text>
          {(digest.highlights || []).map((h) => (
            <Text key={h} style={styles.highlightItem}>• {formatAiToolText(h)}</Text>
          ))}
          <TouchableOpacity style={styles.cta} onPress={() => setPreviewOpen(true)} activeOpacity={0.9}>
            <LinearGradient colors={['#0EA5E9', '#0F766E']} style={styles.ctaGrad}>
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={styles.ctaText}>Download PDF</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={previewOpen} animationType="slide" transparent onRequestClose={() => setPreviewOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <LinearGradient colors={['#0EA5E9', '#0284C7', '#0F766E']} style={styles.modalHero}>
              <Text style={styles.modalBrand}>
                {isTeacher ? 'ASLILEARN · TEACHER WEEKLY REPORT' : 'ASLILEARN · WEEKLY REPORT'}
              </Text>
              <Text style={styles.modalTitle}>{digest?.title || 'Weekly Learning Report'}</Text>
              <Text style={styles.modalSub}>{digest?.summary || 'Preview then share as PDF.'}</Text>
            </LinearGradient>
            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 12 }}>
              <View style={styles.grid}>
                {isTeacher ? (
                  <>
                    <MetricTile label="Logins" value={n(m.loginCount)} />
                    <MetricTile label="Sessions" value={n(m.sessions)} />
                    <MetricTile label="Time" value={m.totalTimeLabel || `${n(m.minutes)} min`} />
                    <MetricTile label="AI resources" value={n(m.generationsCreated)} />
                    <MetricTile label="Vidya" value={n(m.aiDoubts)} />
                    <MetricTile label="Status" value={String(m.status || '—')} />
                    <MetricTile label="School stu." value={n(m.schoolStudentsAccessed)} />
                    <MetricTile label="School sess." value={n(m.schoolSessions)} />
                  </>
                ) : (
                  <>
                    <MetricTile label="Logins" value={n(m.loginCount)} />
                    <MetricTile label="Sessions" value={n(m.sessions)} />
                    <MetricTile label="Exams" value={n(m.examAttempts)} />
                    <MetricTile label="Offline" value={n(m.omrAttempts)} />
                    <MetricTile label="AI uses" value={n(m.aiExplanations)} />
                    <MetricTile label="Streak" value={n(m.streak) > 0 ? `${n(m.streak)}d` : '0'} />
                  </>
                )}
              </View>
              {(digest?.highlights || []).slice(0, 4).map((h) => (
                <Text key={h} style={styles.highlightItem}>• {formatAiToolText(h)}</Text>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <Pressable onPress={() => setPreviewOpen(false)}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
              <TouchableOpacity style={styles.modalDownload} onPress={() => void handleDownload()} disabled={downloading}>
                {downloading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={16} color="#fff" />
                    <Text style={styles.modalDownloadText}>Download PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GlassPanel>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 4 },
  cardInner: { padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  downloadBtnText: { fontSize: 12, fontWeight: '700', color: '#0369A1' },
  muted: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  body: { gap: 8 },
  title: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  summary: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  sectionTitleText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    color: '#475569',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tileLabel: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  tileValue: { marginTop: 2, fontSize: 15, fontWeight: '800', color: '#0F172A' },
  tileHint: { fontSize: 10, color: '#94A3B8', marginTop: 2, lineHeight: 13 },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  listTitle: { flex: 1, fontSize: 13, color: '#334155', fontWeight: '600' },
  listSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
  listPct: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  mutedSmall: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  loadMoreBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: 'rgba(240, 249, 255, 0.85)',
    paddingVertical: 10,
  },
  loadMoreText: { fontSize: 13, fontWeight: '700', color: '#075985' },
  showLessBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  showLessText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  highlights: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    padding: 10,
    gap: 4,
  },
  highlightsTitle: { fontSize: 12, fontWeight: '800', color: '#0369A1', marginBottom: 2 },
  highlightItem: { fontSize: 13, color: '#334155', lineHeight: 18 },
  cta: { marginTop: 6, borderRadius: 12, overflow: 'hidden' },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '88%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  modalHero: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16 },
  modalBrand: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 6 },
  modalSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  modalBody: { paddingHorizontal: 16, paddingTop: 14 },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  closeText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  modalDownload: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    minWidth: 140,
    justifyContent: 'center',
  },
  modalDownloadText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
