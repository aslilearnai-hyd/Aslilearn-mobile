import { storageGetItem, storageSetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Alert, ActivityIndicator } from 'react-native';
import type React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { setupAppStateListener } from '../../../src/utils/studyTimeTracker';
import { setupSessionTimeSync } from '../../../src/lib/session-time-sync';
import LearningProgressModule from './overview/LearningProgressModule';
import AdaptiveLearningModule from './overview/AdaptiveLearningModule';
import WeeklyDigestCard from '../../../src/components/student/WeeklyDigestCard';
import StudyCalendarSection from './overview/StudyCalendarSection';
import QuizPanelSection from './overview/QuizPanelSection';
import HomeShortcutCard from '../../../src/components/student/HomeShortcutCard';
import {
  buildTodaysTasksContentList,
  capTodaysTasksForDay,
  getContentSubjectId,
  isVideoContentType,
  nextChapterCompletedDates,
  type ChapterCompletedDates,
} from '../../../src/lib/video-chapter-schedule';
import {
  collectCompletedContentIds,
  loadCompletedScheduleIds,
  saveCompletedScheduleIds,
  buildScheduleCompletionStats,
  type ScheduleCompletionStats,
} from '../../../src/lib/todays-tasks-helpers';
import { StudentHomeHeader } from '../../../src/components/student';
import StudentCardDecor from '../../../src/components/student/StudentCardDecor';
import { STUDENT } from '../../../src/theme/student';
import { GlassPanel } from '../../../src/components/ui';
import { openContentPreview } from '../../../src/utils/openContentPreview';
import { resolveIsAsliPrepExclusive } from '../../../src/lib/school-program';
import { prepareLibraryContents } from '../../../src/lib/dedupe-library-content';
import { buildExamAttemptCounts } from '../../../src/lib/student-exam-display';
import { isIndividualAccount } from '../../../src/lib/individual-signup';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { TrialUpgradeBanner } from '../../../src/components/b2c/IndividualSubscriptionReceipt';
import { showTrialUpgrade } from '../../../src/lib/individual-subscription';

/** Student Home matches web dashboard: welcome, stats, calendar, quiz, diary, homework, remarks, risk, progress. */

interface OverviewViewProps {
  user: any;
  onGoExams?: () => void;
  onOpenExam?: (examId: string) => void;
}

const STAT_SUMMARY_CARDS = {
  today: {
    bg: 'transparent',
    accent: '#f97316',
    iconBg: 'rgba(249,115,22,0.16)',
    icon: 'locate-outline' as const,
  },
  study: {
    bg: 'transparent',
    accent: '#2563eb',
    iconBg: 'rgba(37,99,235,0.16)',
    icon: 'time' as const,
  },
  week: {
    bg: 'transparent',
    accent: '#0d9488',
    iconBg: 'rgba(13,148,136,0.16)',
    icon: 'calendar' as const,
  },
  efficiency: {
    bg: 'transparent',
    accent: '#7c3aed',
    iconBg: 'rgba(124,58,237,0.16)',
    icon: 'trending-up' as const,
  },
};

const OverviewView = memo(function OverviewView({
  user,
  onGoExams,
  onOpenExam,
}: OverviewViewProps) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [stats, setStats] = useState({
    questionsAnswered: 0,
    accuracyRate: 0,
    rank: 0,
  });
  const [overallProgress, setOverallProgress] = useState(0);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);
  const [studyTimeToday, setStudyTimeToday] = useState(0);
  const [studyTimeThisWeek, setStudyTimeThisWeek] = useState(0);
  const [weeklyStudyData, setWeeklyStudyData] = useState<{ [key: string]: number }>({});
  const [incompleteContent, setIncompleteContent] = useState<any[]>([]);
  const [incompleteQuizzes, setIncompleteQuizzes] = useState<any[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);
  const [scheduleCompletionStats, setScheduleCompletionStats] = useState<ScheduleCompletionStats>({
    totalContent: 0,
    completedContent: 0,
    totalQuizzes: 0,
    completedQuizzes: 0,
    total: 0,
    completed: 0,
    completionPercent: 0,
  });
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<any[]>([]);
  const [completedScheduleIds, setCompletedScheduleIds] = useState<Set<string>>(new Set());
  const [trackedCompletedContentIds, setTrackedCompletedContentIds] = useState<Set<string>>(new Set());
  const [scheduleAllContent, setScheduleAllContent] = useState<any[]>([]);
  const [videoChapterProgressBySubject, setVideoChapterProgressBySubject] = useState<
    Record<string, ChapterCompletedDates>
  >({});
  const [exams, setExams] = useState<any[]>([]);
  const [examAttemptCounts, setExamAttemptCounts] = useState<Record<string, number>>({});
  const [remarks, setRemarks] = useState<any[]>([]);
  const [riskReports, setRiskReports] = useState<any[]>([]);
  const [downloadingRiskId, setDownloadingRiskId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await storageGetItem('authToken');
      if (!token) return;

      // Fetch exam results to calculate stats - with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const [meRes, examsRes, resultsRes, rankingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }),
        fetch(`${API_BASE_URL}/api/student/exams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }),
        fetch(`${API_BASE_URL}/api/student/exam-results`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        }),
        fetch(`${API_BASE_URL}/api/student/rankings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        })
      ]);

      clearTimeout(timeoutId);

      let isAsliPrepExclusive = false;
      if (meRes.ok) {
        const meData = await meRes.json();
        isAsliPrepExclusive = resolveIsAsliPrepExclusive(meData?.user);
        const backendOverall = meData?.user?.overallProgress;
        if (backendOverall !== undefined && backendOverall !== null) {
          setOverallProgress(Number(backendOverall) || 0);
        }
      }

      let examsData: any[] = [];
      if (examsRes.ok) {
        const examsJson = await examsRes.json();
        examsData = examsJson.data || examsJson.exams || [];
        setExams(examsData);
      }

      let resultsData = [];
      if (resultsRes.ok) {
        const resultsJson = await resultsRes.json();
        resultsData = resultsJson.data || resultsJson.results || resultsJson || [];
      }

      setExamAttemptCounts(buildExamAttemptCounts(resultsData));

      let rankingsData = [];
      if (rankingsRes.ok) {
        const rankingsJson = await rankingsRes.json();
        rankingsData = rankingsJson.data || rankingsJson.rankings || rankingsJson || [];
      }

      // Calculate stats
      const totalQuestions = resultsData.reduce((sum: number, r: any) => sum + (r.totalQuestions || 0), 0);
      const correctAnswers = resultsData.reduce((sum: number, r: any) => sum + (r.correctAnswers || 0), 0);
      const totalMarks = resultsData.reduce((sum: number, r: any) => sum + (r.totalMarks || 0), 0);
      const obtainedMarks = resultsData.reduce((sum: number, r: any) => sum + (r.obtainedMarks || 0), 0);
      const avgAccuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
      const avgScore = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
      const avgRank = rankingsData.length > 0 
        ? Math.round(rankingsData.reduce((sum: number, r: any) => sum + (r.rank || 0), 0) / rankingsData.length)
        : 0;

      setStats({
        questionsAnswered: totalQuestions,
        accuracyRate: Math.round(avgAccuracy),
        rank: avgRank || 0
      });
      // Match web logic: derive progress from exams + learning path completion
      const subjectsResponse = await fetch(`${API_BASE_URL}/api/student/subjects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const subjectsData = subjectsResponse.ok ? await subjectsResponse.json() : {};
      const subjectsList = subjectsData.subjects || subjectsData.data || [];

      const subjectNameMap = new Map<string, string>();
      subjectsList.forEach((subject: any) => {
        const subjectName = subject.name || '';
        const normalized = subjectName.toLowerCase();
        subjectNameMap.set(normalized, subjectName);
        if (normalized.includes('math')) {
          subjectNameMap.set('maths', subjectName);
          subjectNameMap.set('mathematics', subjectName);
        }
        if (normalized.includes('physics')) subjectNameMap.set('physics', subjectName);
        if (normalized.includes('chemistry')) subjectNameMap.set('chemistry', subjectName);
      });

      const examSubjectMap = new Map<string, { total: number; correct: number }>();
      resultsData.forEach((result: any) => {
        const subjectWise =
          result?.subjectWiseScore ||
          result?.subjectWiseScores ||
          result?.subjectScores ||
          null;
        if (subjectWise && typeof subjectWise === 'object') {
          Object.entries(subjectWise).forEach(([subject, score]: [string, any]) => {
            if (!examSubjectMap.has(subject)) examSubjectMap.set(subject, { total: 0, correct: 0 });
            const current = examSubjectMap.get(subject)!;
            current.total += score.total || 0;
            current.correct += score.correct || 0;
          });
        }
      });

      const mergedProgress = new Map<
        string,
        { id: string; name: string; progress: number; currentTopic: string }
      >();
      Array.from(examSubjectMap.entries()).forEach(([key, value]) => {
        const progress = value.total > 0 ? Math.round((value.correct / value.total) * 100) : 0;
        const name = subjectNameMap.get(key.toLowerCase()) || key.charAt(0).toUpperCase() + key.slice(1);
        mergedProgress.set(key.toLowerCase(), {
          id: key.toLowerCase(),
          name,
          progress,
          currentTopic: `${name} - Recent Exams`,
        });
      });

      for (const subject of subjectsList) {
        const subjectId = subject._id || subject.id;
        const subjectName = subject.name || 'Subject';
        const localProgressKey = `completed_content_${subjectId}`;
        let learningPathProgress = 0;
        try {
          const stored = await storageGetItem(localProgressKey);
          const completedIds = stored ? JSON.parse(stored) : [];
          if (Array.isArray(completedIds)) {
            const contentResponse = await fetch(
              `${API_BASE_URL}/api/student/asli-prep-content?subject=${encodeURIComponent(subjectId)}&surface=learning-path`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            if (contentResponse.ok) {
              const contentData = await contentResponse.json();
              const contents = prepareLibraryContents(
                contentData.data || contentData || [],
                isAsliPrepExclusive,
                { surface: 'learning-path' }
              );
              const totalContent = contents.length;
              learningPathProgress = totalContent > 0 ? Math.round((completedIds.length / totalContent) * 100) : 0;
            }
          }
        } catch (e) {
          // Ignore per-subject progress read errors
        }

        const existing = Array.from(mergedProgress.values()).find((s) => s.name === subjectName);
        if (existing) {
          existing.progress = Math.round((existing.progress + learningPathProgress) / 2);
          existing.currentTopic = `${subjectName} - Learning Path`;
        } else if (learningPathProgress > 0) {
          mergedProgress.set(String(subjectId), {
            id: String(subjectId),
            name: subjectName,
            progress: learningPathProgress,
            currentTopic: `${subjectName} - Learning Path`,
          });
        }
      }

      const finalProgressArray = Array.from(mergedProgress.values());
      if (finalProgressArray.length > 0) {
        setSubjectProgress(finalProgressArray);
        const calculatedOverallProgress = Math.round(
          finalProgressArray.reduce((sum, s) => sum + (s.progress || 0), 0) / finalProgressArray.length
        );
        setOverallProgress(calculatedOverallProgress);
        try {
          await fetch(`${API_BASE_URL}/api/student/overall-progress`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ overallProgress: calculatedOverallProgress })
          });
        } catch (e) {
          // Ignore save failures, UI already has calculated value
        }
      } else {
        setSubjectProgress([]);
        try {
          const meResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (meResponse.ok) {
            const meData = await meResponse.json();
            const backendOverall = meData?.user?.overallProgress;
            if (backendOverall !== undefined && backendOverall !== null) {
              setOverallProgress(Number(backendOverall) || 0);
            } else {
              setOverallProgress(0);
            }
          }
        } catch (e) {
          setOverallProgress(0);
        }
      }

      setIsLoadingSchedule(true);
      const subjectIds = subjectsList.map((s: any) => String(s._id || s.id)).filter(Boolean);
      const [contentRes, quizzesRes, iqQuizzesRes, homeworkRes, chapterProgressRes] = await Promise.all([
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
        }),
        fetch(`${API_BASE_URL}/api/student/iq-rank-quizzes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/student/homework-submissions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE_URL}/api/student/video-chapter-progress`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      let chapterProgressBySubject: Record<string, ChapterCompletedDates> = {};
      if (chapterProgressRes.ok) {
        const progressJson = await chapterProgressRes.json();
        if (progressJson.success && progressJson.data) {
          chapterProgressBySubject = progressJson.data;
        }
      }
      setVideoChapterProgressBySubject(chapterProgressBySubject);

      let fetchedAllContent: any[] = [];
      let fetchedAllQuizzes: any[] = [];

      if (contentRes.ok) {
        const contentData = await contentRes.json();
        const allContent = prepareLibraryContents(
          contentData.data || contentData || [],
          isAsliPrepExclusive
        );
        fetchedAllContent = allContent;
        setScheduleAllContent(allContent);
        const completedContentIds = await collectCompletedContentIds(subjectIds);
        setTrackedCompletedContentIds(new Set(completedContentIds));
        const slicedContent = buildTodaysTasksContentList(
          allContent,
          completedContentIds,
          chapterProgressBySubject,
          { includeHomework: true }
        );
        setIncompleteContent(slicedContent);
      }

      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        const learning = (quizzesData.data || []).map((q: any) => ({
          ...q,
          quizModule: 'learning',
        }));
        fetchedAllQuizzes = learning;
      }

      if (iqQuizzesRes.ok) {
        const iqData = await iqQuizzesRes.json();
        const iqList = Array.isArray(iqData.data) ? iqData.data : [];
        const mappedIq = iqList.map((q: any) => {
          const isDaily =
            q?.questionBankSource === 'daily-quiz-xlsx' || q?.activityType === 'daily';
          return {
            ...q,
            quizModule: 'iq-rank',
            title: q.title || (isDaily ? 'Daily Quiz' : 'Quiz'),
            totalQuestions: isDaily
              ? Number(q.dailyPickCount) || Number(q.totalQuestions) || 5
              : Number(q.totalQuestions) || 0,
            _isDailyQuiz: isDaily,
            // Keep calendar/tasks treating open daily quizzes as incomplete
            hasAttempted: isDaily ? false : q.hasAttempted,
            completedAt: isDaily ? null : q.completedAt,
          };
        });
        mappedIq.sort((a: any, b: any) => Number(b._isDailyQuiz) - Number(a._isDailyQuiz));
        fetchedAllQuizzes = [...mappedIq, ...fetchedAllQuizzes];
      }

      if (fetchedAllQuizzes.length > 0) {
        setAllQuizzes(fetchedAllQuizzes);
        const incompleteQuiz = fetchedAllQuizzes.filter((quiz: any) => {
          if (quiz.quizModule === 'iq-rank') return true;
          return !quiz.hasAttempted || !quiz.completedAt;
        });
        incompleteQuiz.sort((a: any, b: any) => {
          const aDaily = a._isDailyQuiz ? 1 : 0;
          const bDaily = b._isDailyQuiz ? 1 : 0;
          if (bDaily !== aDaily) return bDaily - aDaily;
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        setIncompleteQuizzes(incompleteQuiz.slice(0, 10));
      }

      if (fetchedAllContent.length > 0 || fetchedAllQuizzes.length > 0) {
        const completionStats = await buildScheduleCompletionStats(
          fetchedAllContent,
          fetchedAllQuizzes,
          subjectIds
        );
        setScheduleCompletionStats(completionStats);
      }
      setIsLoadingSubmissions(true);
      if (homeworkRes.ok) {
        const homeworkData = await homeworkRes.json();
        setHomeworkSubmissions(
          homeworkData?.success ? homeworkData.data || [] : homeworkData?.data || []
        );
      } else {
        setHomeworkSubmissions([]);
      }
      setIsLoadingSubmissions(false);

      try {
        const remarksRes = await fetch(`${API_BASE_URL}/api/student/remarks`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (remarksRes.ok) {
          const remarksData = await remarksRes.json();
          setRemarks(remarksData?.success ? remarksData.data || [] : []);
        }
      } catch {
        setRemarks([]);
      }

      try {
        const riskRes = await fetch(`${API_BASE_URL}/api/student/risk-analysis-reports`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (riskRes.ok) {
          const riskData = await riskRes.json();
          setRiskReports(riskData?.success ? riskData.data || [] : []);
        }
      } catch {
        setRiskReports([]);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request timeout');
      } else {
        console.error('Failed to fetch dashboard data:', error);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingSchedule(false);
    }
  }, []);

  useEffect(() => {
    loadCompletedScheduleIds().then(setCompletedScheduleIds);
    fetchDashboardData();
    setupAppStateListener();
    const cleanupSessionSync = setupSessionTimeSync((times) => {
      // Foreground study time is cumulative within the day/week. Ignore a stale
      // lower response that arrives after a newer local value.
      setStudyTimeToday((current) => Math.max(current, times.today));
      setStudyTimeThisWeek((current) => Math.max(current, times.thisWeek));
    });
    return () => cleanupSessionSync();
  }, [fetchDashboardData]);

  const handleToggleScheduleComplete = useCallback(
    async (item: any, isQuiz: boolean) => {
      const itemId = String(item._id || item.id);
      const newCompleted = new Set(completedScheduleIds);
      const isCurrentlyCompleted = newCompleted.has(itemId);

      if (isCurrentlyCompleted) newCompleted.delete(itemId);
      else newCompleted.add(itemId);

      setCompletedScheduleIds(newCompleted);
      await saveCompletedScheduleIds(newCompleted);

      const subjectId = !isQuiz ? getContentSubjectId(item) : '';
      if (!isQuiz && subjectId) {
        const subjectKey = `completed_content_${subjectId}`;
        try {
          const stored = await storageGetItem(subjectKey);
          let completed: string[] = stored ? JSON.parse(stored) : [];
          if (isCurrentlyCompleted) {
            completed = completed.filter((id) => String(id) !== itemId);
          } else if (!completed.includes(itemId)) {
            completed.push(itemId);
          }
          await storageSetItem(subjectKey, JSON.stringify(completed));
        } catch {
          /* ignore */
        }
      }

      if (!isQuiz && isVideoContentType(item.type)) {
        const token = await storageGetItem('authToken');
        if (token) {
          fetch(`${API_BASE_URL}/api/student/content-progress`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contentId: itemId,
              completed: !isCurrentlyCompleted,
              progress: !isCurrentlyCompleted ? 100 : 0,
            }),
          }).catch(() => undefined);
        }
      }

      const subjectIds = scheduleAllContent
        .map((c) => getContentSubjectId(c))
        .filter(Boolean);
      const mergedCompleted = await collectCompletedContentIds([...new Set(subjectIds)]);
      newCompleted.forEach((id) => mergedCompleted.add(id));
      setTrackedCompletedContentIds(new Set(mergedCompleted));

      let chapterProgressForRebuild = videoChapterProgressBySubject;
      if (!isQuiz && isVideoContentType(item.type) && subjectId && scheduleAllContent.length > 0 && !isCurrentlyCompleted) {
        const currentDates = videoChapterProgressBySubject[subjectId] || {};
        const updatedDates = nextChapterCompletedDates(
          subjectId,
          scheduleAllContent,
          mergedCompleted,
          currentDates
        );
        if (updatedDates) {
          chapterProgressForRebuild = {
            ...videoChapterProgressBySubject,
            [subjectId]: updatedDates,
          };
          setVideoChapterProgressBySubject(chapterProgressForRebuild);
          const token = await storageGetItem('authToken');
          if (token) {
            fetch(`${API_BASE_URL}/api/student/video-chapter-progress`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ subjectId, chapterDates: updatedDates }),
            }).catch(() => undefined);
          }
        }
      }

      if (scheduleAllContent.length > 0) {
        setIncompleteContent(
          buildTodaysTasksContentList(
            scheduleAllContent,
            mergedCompleted,
            chapterProgressForRebuild,
            { includeHomework: true }
          )
        );
      }

      if (scheduleAllContent.length > 0 || allQuizzes.length > 0) {
        const subjectIds = scheduleAllContent
          .map((c) => getContentSubjectId(c))
          .filter(Boolean);
        const completionStats = await buildScheduleCompletionStats(
          scheduleAllContent,
          allQuizzes,
          subjectIds
        );
        setScheduleCompletionStats(completionStats);
      }
    },
    [completedScheduleIds, scheduleAllContent, videoChapterProgressBySubject, allQuizzes]
  );

  const handleOpenScheduleItem = useCallback((item: any, isQuiz: boolean) => {
    if (isQuiz) {
      const quizId = String(item._id || item.id || '');
      const isIq =
        item.quizModule === 'iq-rank' ||
        item._isDailyQuiz ||
        item.questionBankSource === 'daily-quiz-xlsx' ||
        item.activityType === 'daily';
      if (isIq && quizId) {
        router.push({
          pathname: '/iq-rank-boost-quiz/[quizId]',
          params: { quizId },
        });
        return;
      }
      router.push(`/quiz/${quizId}`);
      return;
    }

    const hasPreviewUrl = Boolean(
      item.fileUrl ||
        item.fileUrls?.[0] ||
        item.videoUrl ||
        item.driveLink ||
        item.youtubeUrl
    );

    if (hasPreviewUrl || isVideoContentType(item.type)) {
      openContentPreview(router, item);
      return;
    }

    if (String(item.type || '').toLowerCase() === 'homework') {
      router.push('/assignments');
      return;
    }

    router.push({
      pathname: '/asli-prep-content',
      params: item.type ? { type: String(item.type) } : {},
    });
  }, []);

  const dailyTasks = useMemo(
    () => capTodaysTasksForDay(incompleteQuizzes, incompleteContent),
    [incompleteQuizzes, incompleteContent]
  );

  const isDailyTaskCompleted = useCallback(
    (item: any, isQuiz: boolean, completedIds: Set<string>, contentDoneIds: Set<string>) => {
      const itemId = String(item._id || item.id);
      if (completedIds.has(itemId)) return true;
      if (isQuiz) return Boolean(item.hasAttempted || item.completedAt);
      return contentDoneIds.has(itemId);
    },
    []
  );

  const { efficiency } = useMemo(() => {
    const { quizzes, content } = dailyTasks;
    const total = content.length + quizzes.length;
    const completed =
      content.filter((c: any) =>
        isDailyTaskCompleted(c, false, completedScheduleIds, trackedCompletedContentIds)
      ).length +
      quizzes.filter((q: any) =>
        isDailyTaskCompleted(q, true, completedScheduleIds, trackedCompletedContentIds)
      ).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    let eff = 0;
    if (total > 0) {
      eff = progress;
    } else if (scheduleCompletionStats.total > 0) {
      eff = scheduleCompletionStats.completionPercent;
    } else if (overallProgress > 0) {
      eff = Math.round(overallProgress);
    }

    return { efficiency: eff };
  }, [dailyTasks, completedScheduleIds, trackedCompletedContentIds, scheduleCompletionStats, overallProgress, isDailyTaskCompleted]);

  const { studyTodayProgress, studyWeekProgress } = useMemo(() => {
    const dailyGoalMins = 8 * 60;
    const weeklyGoalMins = 40 * 60;
    return {
      studyTodayProgress: Math.min(Math.round((studyTimeToday / dailyGoalMins) * 100), 100),
      studyWeekProgress: Math.min(Math.round((studyTimeThisWeek / weeklyGoalMins) * 100), 100),
    };
  }, [studyTimeToday, studyTimeThisWeek]);

  const dayStreak = Number(user?.dayStreak ?? 0);

  const calendarSectionProps = {
    incompleteQuizzes,
    exams,
    examAttemptCounts,
    studentClassNumber: user?.classNumber,
    onOpenQuiz: (quiz: any) => {
      const quizId = String(quiz._id || quiz.id || '');
      const isIq =
        quiz.quizModule === 'iq-rank' ||
        quiz._isDailyQuiz ||
        quiz.questionBankSource === 'daily-quiz-xlsx' ||
        quiz.activityType === 'daily';
      if (isIq && quizId) {
        router.push({
          pathname: '/iq-rank-boost-quiz/[quizId]',
          params: { quizId },
        });
        return;
      }
      router.push(`/quiz/${quizId}`);
    },
    onOpenExam: (examId: string) => onOpenExam?.(examId),
  };

  const downloadRiskReport = useCallback(async (report: any) => {
    const reportId = String(report?._id || '');
    if (!reportId) return;
    try {
      setDownloadingRiskId(reportId);
      const token = await storageGetItem('authToken');
      if (!token) {
        Alert.alert('Sign In Required', 'Please Sign In Again To Download This Report.');
        return;
      }
      const filename = String(report.pdfFilename || `risk-analysis-${reportId}.pdf`).replace(
        /[^\w.\-]+/g,
        '_',
      );
      const path = `${FileSystem.cacheDirectory || ''}${filename}`;
      const result = await FileSystem.downloadAsync(
        `${API_BASE_URL}/api/student/risk-analysis-reports/${encodeURIComponent(reportId)}/download`,
        path,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (result.status !== 200) {
        Alert.alert('Download Failed', 'The Report Could Not Be Downloaded Right Now.');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Risk Analysis PDF',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', 'The PDF Was Downloaded On This Device.');
      }
    } catch {
      Alert.alert('Download Failed', 'Could Not Open The Risk Analysis PDF.');
    } finally {
      setDownloadingRiskId(null);
    }
  }, []);

  const renderStatCard = (
    cardKey: 'today' | 'study' | 'week' | 'efficiency',
    body: React.ReactNode
  ) => (
    <GlassPanel
      style={[styles.statCard, isTablet && styles.statCardTablet]}
      radius={24}
      bordered={false}
    >
      <StudentCardDecor variant={cardKey} color={STAT_SUMMARY_CARDS[cardKey].accent} />
      <View style={styles.statCardContent}>{body}</View>
    </GlassPanel>
  );

  const todayStatBody = (
    <>
      <View style={[styles.statIconWrap, { backgroundColor: STAT_SUMMARY_CARDS.today.iconBg }]}>
        <Ionicons name={STAT_SUMMARY_CARDS.today.icon} size={20} color={STAT_SUMMARY_CARDS.today.accent} />
      </View>
      <Text style={styles.statLabel}>Overall Progress</Text>
      <Text style={[styles.statValue, { color: STAT_SUMMARY_CARDS.today.accent }]}>
        {Math.round(overallProgress)}%
      </Text>
      <View style={[styles.statProgressBar, { backgroundColor: `${STAT_SUMMARY_CARDS.today.accent}22` }]}>
        <View
          style={[
            styles.statProgressFill,
            { width: `${Math.min(100, Math.max(0, Math.round(overallProgress)))}%`, backgroundColor: STAT_SUMMARY_CARDS.today.accent },
          ]}
        />
      </View>
      <Text style={styles.statSubtext}>Across All Subjects</Text>
    </>
  );

  const studyStatBody = (
    <>
      <View style={[styles.statIconWrap, { backgroundColor: STAT_SUMMARY_CARDS.study.iconBg }]}>
        <Ionicons name={STAT_SUMMARY_CARDS.study.icon} size={20} color={STAT_SUMMARY_CARDS.study.accent} />
      </View>
      <Text style={styles.statLabel}>Study Time</Text>
      <Text style={[styles.statValue, { color: STAT_SUMMARY_CARDS.study.accent }]}>
        {studyTimeToday >= 60
          ? `${(studyTimeToday / 60).toFixed(1)} Hrs`
          : studyTimeToday < 1 && studyTimeToday > 0
            ? '<1m'
            : `${Math.round(studyTimeToday)}m`}
      </Text>
      <View style={[styles.statProgressBar, { backgroundColor: `${STAT_SUMMARY_CARDS.study.accent}22` }]}>
        <View
          style={[
            styles.statProgressFill,
            { width: `${studyTodayProgress}%`, backgroundColor: STAT_SUMMARY_CARDS.study.accent },
          ]}
        />
      </View>
      <Text style={styles.statSubtext}>Logged In Today</Text>
    </>
  );

  const weekStatBody = (
    <>
      <View style={[styles.statIconWrap, { backgroundColor: STAT_SUMMARY_CARDS.week.iconBg }]}>
        <Ionicons name={STAT_SUMMARY_CARDS.week.icon} size={20} color={STAT_SUMMARY_CARDS.week.accent} />
      </View>
      <Text style={styles.statLabel}>This Week</Text>
      <Text style={[styles.statValue, { color: STAT_SUMMARY_CARDS.week.accent }]}>
        {studyTimeThisWeek >= 60
          ? `${(studyTimeThisWeek / 60).toFixed(1)} Hrs`
          : studyTimeThisWeek < 1 && studyTimeThisWeek > 0
            ? '<1m'
            : `${Math.round(studyTimeThisWeek)}m`}
      </Text>
      <View style={[styles.statProgressBar, { backgroundColor: `${STAT_SUMMARY_CARDS.week.accent}22` }]}>
        <View
          style={[
            styles.statProgressFill,
            { width: `${studyWeekProgress}%`, backgroundColor: STAT_SUMMARY_CARDS.week.accent },
          ]}
        />
      </View>
      <Text style={styles.statSubtext}>Study Time This Week</Text>
    </>
  );

  const efficiencyStatBody = (
    <>
      <View style={[styles.statIconWrap, { backgroundColor: STAT_SUMMARY_CARDS.efficiency.iconBg }]}>
        <Ionicons
          name={STAT_SUMMARY_CARDS.efficiency.icon}
          size={20}
          color={STAT_SUMMARY_CARDS.efficiency.accent}
        />
      </View>
      <Text style={styles.statLabel}>Efficiency</Text>
      <Text style={[styles.statValue, { color: STAT_SUMMARY_CARDS.efficiency.accent }]}>{efficiency}%</Text>
      <View style={[styles.statProgressBar, { backgroundColor: `${STAT_SUMMARY_CARDS.efficiency.accent}22` }]}>
        <View
          style={[
            styles.statProgressFill,
            { width: `${efficiency}%`, backgroundColor: STAT_SUMMARY_CARDS.efficiency.accent },
          ]}
        />
      </View>
      <Text style={styles.statSubtext}>Completion Rate</Text>
    </>
  );

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      <View style={styles.screenDecorWrap} pointerEvents="none">
        <StudentCardDecor variant="screen" />
      </View>

      <StudentHomeHeader user={user} streak={dayStreak} />

      {showTrialUpgrade(user) ? (
        <View style={styles.trialBannerWrap}>
          <TrialUpgradeBanner daysLeft={user?.trialDaysLeft} trialEndsAt={user?.trialEndsAt} />
        </View>
      ) : null}

      <View style={isTablet ? styles.tabletStatsGrid : styles.statsGrid}>
        {renderStatCard('study', studyStatBody)}
        {renderStatCard('week', weekStatBody)}
        {renderStatCard('efficiency', efficiencyStatBody)}
        {renderStatCard('today', todayStatBody)}
      </View>

      <View style={[styles.pairRow, isTablet && styles.pairRowTablet]}>
        <View style={isTablet ? styles.pairPrimary : undefined}>
          <QuizPanelSection />
          <StudyCalendarSection {...calendarSectionProps} />
        </View>
        <View style={isTablet ? styles.pairSecondary : undefined}>
        </View>
      </View>

      {!isIndividualAccount(user) ? (
        <View style={[styles.pairRow, isTablet && styles.pairRowTablet]}>
          <View style={isTablet ? styles.pairHalf : undefined}>
            <HomeShortcutCard
              title="Teachers Report"
              subtitle="Daily class updates from teachers."
              icon="people"
              tint="#eef2ff"
              accent="#7c3aed"
              onPress={() => router.push('/teachers-report')}
            />
          </View>
          <View style={isTablet ? styles.pairHalf : undefined}>
            <HomeShortcutCard
              title="My Homework"
              subtitle="View and manage your assignments."
              icon="bag-handle"
              tint="#fff7ed"
              accent="#f97316"
              onPress={() => router.push('/assignments')}
            />
          </View>
        </View>
      ) : (
        <>
        <View style={[styles.pairRow, isTablet && styles.pairRowTablet]}>
          <View style={isTablet ? styles.pairHalf : undefined}>
            <HomeShortcutCard
              title="Practice Exams"
              subtitle="Class-wise practice papers on your Board or Asli Prep Alpha / Beta / Gamma track."
              icon="document-text"
              tint="#fff7ed"
              accent="#ea580c"
              onPress={() => onGoExams?.()}
            />
          </View>
          <View style={isTablet ? styles.pairHalf : undefined}>
            <HomeShortcutCard
              title="Your IIT book"
              subtitle="Confirm Alpha, Beta or Gamma so quizzes and Vidya stay tied to that material."
              icon="book"
              tint="#f5f3ff"
              accent="#7c3aed"
              onPress={() => router.push('/auth/subscribe')}
            />
          </View>
        </View>
        <View style={[styles.pairRow, isTablet && styles.pairRowTablet]}>
          <View style={isTablet ? styles.pairHalf : undefined}>
            <HomeShortcutCard
              title="Quiz"
              subtitle="Daily and subject quizzes — same Quiz page as on the web."
              icon="trophy"
              tint="#fffbeb"
              accent="#d97706"
              onPress={() => router.push('/iq-rank-boost-subjects')}
            />
          </View>
        </View>
        </>
      )}

      {remarks.length > 0 ? (
        <GlassPanel style={styles.sectionCard} radius={18}>
          <View style={styles.remarksHeader}>
            <Ionicons name="chatbubbles" size={20} color={STUDENT.accent} />
            <Text style={styles.sectionTitle}>Teacher Remarks</Text>
          </View>
          {remarks.slice(0, 5).map((remark: any) => (
            <View
              key={remark._id}
              style={[
                styles.remarkCard,
                remark.isPositive ? styles.remarkPositive : styles.remarkNeutral,
              ]}
            >
              <Text style={styles.remarkTeacher}>
                {remark.teacherId?.fullName || 'Teacher'}
                {remark.subject?.name ? ` · ${remark.subject.name}` : ''}
              </Text>
              <Text style={styles.remarkText}>{remark.remark}</Text>
              <Text style={styles.remarkDate}>
                {new Date(remark.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </GlassPanel>
      ) : null}

      {riskReports.length > 0 ? (
        <GlassPanel style={styles.sectionCard} radius={18}>
          <View style={styles.remarksHeader}>
            <Ionicons name="warning" size={20} color={STUDENT.warning} />
            <Text style={styles.sectionTitle}>AI Risk Analysis Reports</Text>
          </View>
          {riskReports.map((report: any) => (
            <View key={report._id} style={styles.riskCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.riskTitle}>Performance Risk Analysis Report</Text>
                <Text style={styles.riskMeta}>
                  Sent By {report.adminId?.fullName || 'Administrator'} On{' '}
                  {new Date(report.sentAt).toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.riskDownloadBtn}
                onPress={() => void downloadRiskReport(report)}
                disabled={downloadingRiskId === String(report._id)}
                accessibilityRole="button"
                accessibilityLabel="Download PDF"
              >
                {downloadingRiskId === String(report._id) ? (
                  <ActivityIndicator size="small" color="#c2410c" />
                ) : (
                  <Ionicons name="download-outline" size={16} color="#c2410c" />
                )}
                <Text style={styles.riskDownloadText}>Download PDF</Text>
              </TouchableOpacity>
            </View>
          ))}
        </GlassPanel>
      ) : null}

      <LearningProgressModule
        overallProgress={overallProgress}
        subjectProgress={subjectProgress}
      />

      <AdaptiveLearningModule />

      <WeeklyDigestCard apiBase="/api/student" />
    </View>
  );
});

export default OverviewView;

const styles = StyleSheet.create({
  container: {
    gap: 16,
    position: 'relative',
  },
  trialBannerWrap: {
    paddingHorizontal: 16,
    marginTop: -4,
  },
  screenDecorWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  containerTablet: {
    width: '100%',
  },
  tabletStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    alignItems: 'stretch',
  },
  pairRow: {
    gap: 16,
    width: '100%',
  },
  pairRowTablet: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
  },
  pairPrimary: { flex: 2, minWidth: 0 },
  pairSecondary: { flex: 1, minWidth: 0 },
  pairHalf: { flex: 1, minWidth: 0 },
  quickStatsScroll: {
    gap: 10,
    paddingBottom: 4,
    marginBottom: 10,
  },
  quickStatCard: {
    width: 108,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    marginRight: 10,
  },
  qsValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  qsLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  welcomeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  welcomeTextContainer: {
    flex: 1,
    gap: 12,
  },
  vidyaImageContainer: {
    width: 96,
    height: 96,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vidyaImageWrapper: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  welcomeActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  welcomeButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  welcomeButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  welcomeButtonText: {
    color: '#ea580c',
    fontWeight: '700',
    fontSize: 14,
  },
  welcomeButtonTextOutline: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'stretch',
  },
  statCard: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '47%',
    maxWidth: '48%',
    borderRadius: 24,
    padding: 16,
    minHeight: 152,
    borderWidth: 0,
    overflow: 'hidden',
    position: 'relative',
    ...STUDENT.shadow.sm,
  },
  statCardTablet: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '47%',
    maxWidth: '48.5%',
    minHeight: 152,
  },
  statCardContent: {
    flex: 1,
    justifyContent: 'space-between',
    zIndex: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: STUDENT.textSecondary,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  statProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  statProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statSubtext: {
    fontSize: 11,
    color: STUDENT.textMuted,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  quickStatCardAlt: {
    flex: 1,
    backgroundColor: STUDENT.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  sectionCard: {
    // Fill comes from GlassPanel's blur + white rim.
    borderRadius: 18,
    padding: 20,
    marginTop: 8,
    ...STUDENT.shadow.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: STUDENT.text,
  },
  badge: {
    backgroundColor: '#fb923c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  progressOverview: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '800',
    color: '#3b82f6',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  subjectProgressList: {
    gap: 16,
    marginBottom: 16,
  },
  subjectProgressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  subjectDetails: {
    flex: 1,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  subjectTopic: {
    fontSize: 12,
    color: '#6b7280',
  },
  subjectProgressRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  subjectProgressPercent: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  subjectProgressBar: {
    width: 64,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  noProgressText: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 20,
  },
  viewButton: {
    backgroundColor: '#fb923c',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSub: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    marginTop: -4,
  },
  weeklyList: {
    gap: 10,
    marginTop: 8,
  },
  weeklyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weeklyDay: {
    width: 36,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  weeklyBarTrack: {
    flex: 1,
    height: 24,
    backgroundColor: '#fed7aa',
    borderRadius: 999,
    overflow: 'hidden',
  },
  weeklyBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#fb923c',
  },
  weeklyHours: {
    width: 44,
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  todoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  todoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ccfbf1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  todoEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
  },
  todoEmptySub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  todoList: {
    gap: 10,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
  },
  todoDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginTop: 2,
  },
  todoDotHomework: {
    borderColor: '#f97316',
    backgroundColor: 'rgba(255,247,237,0.55)',
  },
  todoItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  todoItemMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  vidyaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  quickLinksScroll: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 4,
  },
  quickLinkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: STUDENT.surface,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: STUDENT.text,
  },
  remarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  remarkCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  remarkPositive: {
    backgroundColor: '#ecfdf5',
    borderLeftColor: '#22c55e',
  },
  remarkNeutral: {
    backgroundColor: 'rgba(255,247,237,0.55)',
    borderLeftColor: '#f97316',
  },
  remarkTeacher: { fontSize: 13, fontWeight: '700', color: '#111827' },
  remarkText: { fontSize: 13, color: '#374151', marginTop: 6 },
  remarkDate: { fontSize: 11, color: '#5B6779', marginTop: 6 },
  riskCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,247,237,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  riskTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  riskMeta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  riskDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  riskDownloadText: { fontSize: 12, fontWeight: '700', color: '#c2410c' },
  homeworkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  viewAllLink: {
    marginLeft: 'auto',
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.primary,
  },
  homeworkCta: {
    marginTop: 12,
    backgroundColor: STUDENT.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  homeworkCtaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  homeworkIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ffedd5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeworkTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  homeworkEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  homeworkEmptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  homeworkEmptySub: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  adaptiveList: {
    gap: 10,
  },
  adaptiveCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fafafa',
  },
  adaptiveTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  adaptiveSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  adaptiveProgress: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  adaptiveLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  adaptiveItem: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  pathTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  pathTab: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    alignItems: 'center',
  },
  pathTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pathTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  pathTabTextActive: {
    color: '#111827',
  },
  miniLibraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  miniLibraryCard: {
    width: '31%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  miniLibraryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniLibraryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  recommendedList: {
    marginTop: 10,
    gap: 10,
  },
  recommendedCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  recommendedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  recommendedText: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  recommendedChip: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recommendedChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
});

