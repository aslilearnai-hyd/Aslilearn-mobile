import { storageGetItem } from '../../../src/lib/safe-storage';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { ShimmerCard } from '../../../src/components/student/StudentShimmer';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING, STUDENT_TYPO } from '../../../src/theme/student';
import { GlassPanel } from '../../../src/components/ui';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../src/lib/api-config';
import Header from './eduott/Header';
import TeacherPageHero from '../../../src/components/teacher/TeacherPageHero';
import SearchBar from './eduott/SearchBar';
import StudentFilterDropdown from '../../../src/components/student/StudentFilterDropdown';
import EduOTTVideoCard from '../../../src/components/eduott/EduOTTVideoCard';
import { resolveContentDurationSeconds, canJoinLiveSession } from '../../../src/utils/eduottVideoUtils';
import {
  dedupeLibraryContents,
  extractLibraryContentList,
  isLibraryVideoRow,
  type LibraryContentRow,
} from '../../../src/lib/dedupe-library-content';
import { getVideoDisplayTitle, sortContentsChapterWise } from '../../../src/lib/video-chapter-schedule';
import {
  extractPlainSubjectName,
  getSubjectClassLabel,
  formatSubjectWithIitCategory,
} from '../../../src/lib/subject-names';
import { useEduOTTFilters } from '../../../src/contexts/edu-ott-filter-context';
import { useSchoolProgram } from '../../../src/hooks/useSchoolProgram';
import { isIitTrackContent } from '../../../src/lib/library-content-labels';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { eduOttListScrollBottomPad, isTabletLayout } from '../../../src/lib/responsive-layout';

export type EduOTTRole = 'student' | 'teacher' | 'admin';

const DASHBOARD_LABELS: Record<EduOTTRole, string> = {
  student: 'Student Dashboard',
  teacher: 'Teacher Dashboard',
  admin: 'Admin Dashboard',
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function buildVideosUrl(
  role: EduOTTRole,
  selectedClass: string | null,
  selectedSubject: string | null
): string {
  const params = new URLSearchParams({ type: 'Video', surface: 'eduott' });
  if (selectedClass) params.set('class', selectedClass);
  if (selectedSubject) params.set('subject', selectedSubject);
  return `${API_BASE_URL}/api/${role}/asli-prep-content?${params.toString()}`;
}

function buildStreamsUrl(
  role: EduOTTRole,
  selectedClass: string | null,
  selectedSubject: string | null
): string {
  const params = new URLSearchParams();
  if (selectedClass) params.set('class', selectedClass);
  if (selectedSubject) params.set('subject', selectedSubject);
  const q = params.toString();
  return `${API_BASE_URL}/api/${role}/streams${q ? `?${q}` : ''}`;
}

function buildVideosFallbackUrl(role: EduOTTRole): string {
  return `${API_BASE_URL}/api/${role}/videos`;
}

function buildAllContentUrl(role: EduOTTRole): string {
  return `${API_BASE_URL}/api/${role}/asli-prep-content?surface=eduott`;
}

async function fetchJsonPayload(
  url: string,
  headers: Record<string, string>
): Promise<{ ok: boolean; payload: unknown }> {
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) return { ok: false, payload: null };
    return { ok: true, payload: await response.json() };
  } catch {
    return { ok: false, payload: null };
  }
}

function rowsFromVideoPayload(payload: unknown, assumeVideoType: boolean): LibraryContentRow[] {
  const rows = extractLibraryContentList(payload).map((row) =>
    assumeVideoType && !row.type ? { ...row, type: 'Video' } : row
  );
  return rows.filter(isLibraryVideoRow);
}

async function fetchRoleVideos(
  token: string,
  role: EduOTTRole
): Promise<{ list: VideoItem[]; ok: boolean }> {
  const headers = authHeaders(token);
  const attempts: Array<{ url: string; assumeVideoType: boolean }> = [
    { url: buildVideosUrl(role, null, null), assumeVideoType: false },
    { url: buildAllContentUrl(role), assumeVideoType: false },
    { url: buildVideosFallbackUrl(role), assumeVideoType: true },
  ];
  if (role === 'admin') {
    attempts.push({ url: `${API_BASE_URL}/api/admin/videos`, assumeVideoType: true });
  }

  let anyOk = false;
  let best: LibraryContentRow[] = [];

  for (const attempt of attempts) {
    const { ok, payload } = await fetchJsonPayload(attempt.url, headers);
    if (!ok) continue;
    anyOk = true;
    const rows = rowsFromVideoPayload(payload, attempt.assumeVideoType);
    if (rows.length > best.length) best = rows;
    if (best.length > 0) break;
  }

  return { list: mapAndDedupeVideos(best), ok: anyOk };
}

async function fetchFilteredStudentVideos(
  token: string,
  role: EduOTTRole,
  selectedClass: string | null,
  selectedSubject: string | null
): Promise<{ list: VideoItem[]; ok: boolean }> {
  const headers = authHeaders(token);
  // Prefer filtered prep endpoint, then fall back to full catalog (+ client filters).
  const primary = await fetchJsonPayload(
    buildVideosUrl(role, selectedClass, selectedSubject),
    headers
  );
  if (primary.ok) {
    const rows = rowsFromVideoPayload(primary.payload, false);
    if (rows.length > 0) {
      return { list: mapAndDedupeVideos(rows), ok: true };
    }
  }

  const fallback = await fetchRoleVideos(token, role);
  if (!fallback.ok) {
    return primary.ok ? { list: [], ok: true } : fallback;
  }
  if (!selectedClass && !selectedSubject) {
    return fallback;
  }
  const filtered = fallback.list.filter((video) =>
    matchesClassSubject(video.subjectName, video.classNumber, selectedClass, selectedSubject)
  );
  return { list: filtered, ok: true };
}

function matchesClassSubject(
  subjectName: string | undefined,
  classNumber: string | undefined,
  selectedClass: string | null,
  selectedSubject: string | null
): boolean {
  const classLabel = getSubjectClassLabel({ name: subjectName, classNumber });
  const plainSubject = extractPlainSubjectName(subjectName || '').trim();
  if (selectedClass && classLabel !== selectedClass) return false;
  if (selectedSubject && plainSubject !== selectedSubject) return false;
  return true;
}

interface VideoItem {
  _id: string;
  title: string;
  description?: string;
  topic?: string;
  chapter?: string;
  module?: string;
  notes?: string;
  autoNotes?: string;
  aiFeatures?: {
    hasAutoNotes?: boolean;
    hasVisualMaps?: boolean;
    hasVoiceQA?: boolean;
    hasNotes?: boolean;
    hasMindMap?: boolean;
  };
  duration: number;
  videoUrl?: string;
  fileUrl?: string;
  youtubeUrl?: string;
  thumbnailUrl?: string;
  isYouTubeVideo?: boolean;
  subjectId?: string;
  subjectName?: string;
  classNumber?: string;
  productCategory?: string;
  subject?: string;
  class?: string;
  views?: number;
  watchProgress?: number;
}

interface LiveSession {
  _id: string;
  title: string;
  description?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  streamUrl?: string;
  playbackUrl?: string;
  youtubeUrl?: string;
  youtubeEmbedUrl?: string;
  scheduledTime?: string;
  scheduledStartTime?: string;
  subject?: { _id: string; name: string };
  classNumber?: string;
  viewerCount?: number;
  visibility?: 'teacher' | 'student' | 'both';
}

interface EduOTTViewProps {
  username?: string;
  role?: EduOTTRole;
}

function mapContentToVideoItem(content: any): VideoItem {
  const subjectId = content.subject?._id || content.subject?.id || (typeof content.subject === 'string' ? content.subject : '');
  const subjectName = content.subject?.name || (typeof content.subject === 'string' ? content.subject : 'Unknown Subject');
  const durationInSeconds = resolveContentDurationSeconds({
    duration: content.duration,
    durationSeconds: content.durationSeconds,
  });

  let videoFileUrl = content.fileUrl || content.videoUrl;
  if (videoFileUrl && !videoFileUrl.startsWith('http') && !videoFileUrl.startsWith('//')) {
    if (videoFileUrl.startsWith('/')) {
      videoFileUrl = `${API_BASE_URL}${videoFileUrl}`;
    } else {
      videoFileUrl = `${API_BASE_URL}/${videoFileUrl}`;
    }
  }

  const classNum =
    content.classNumber != null && String(content.classNumber).trim() !== ''
      ? String(content.classNumber).trim()
      : content.subject?.classNumber != null && String(content.subject.classNumber).trim() !== ''
        ? String(content.subject.classNumber).trim()
        : undefined;

  return {
    _id: content._id,
    title: getVideoDisplayTitle({ ...content, type: 'Video' }),
    description: content.description || '',
    topic: content.topic || '',
    chapter: content.chapter || '',
    module: content.module || '',
    notes: content.notes || content.autoNotes || '',
    autoNotes: content.autoNotes || content.notes || '',
    aiFeatures: content.aiFeatures,
    videoUrl: videoFileUrl,
    fileUrl: videoFileUrl,
    youtubeUrl: content.youtubeUrl || undefined,
    thumbnailUrl: content.thumbnailUrl || undefined,
    duration: durationInSeconds,
    views: content.views || 0,
    subjectId: subjectId ? String(subjectId) : '',
    subjectName: subjectName,
    classNumber: classNum,
    productCategory: String(content.productCategory || content.subject?.productCategory || ''),
    subject: extractPlainSubjectName(subjectName) || 'Subject',
    class:
      classNum ||
      getSubjectClassLabel({ name: subjectName, classNumber: classNum }) ||
      '',
    watchProgress: Number(content.watchProgress || content.progress || 0),
    isYouTubeVideo: !!(
      videoFileUrl &&
      (videoFileUrl.includes('youtube.com') || videoFileUrl.includes('youtu.be'))
    ),
  };
}

function mapAndDedupeVideos(list: unknown[]): VideoItem[] {
  const rows = extractLibraryContentList(list).filter(isLibraryVideoRow);
  // Match web EduOTT: trust API URL/meta dedupe. Title-collapse here was dropping
  // distinct videos that share a generic title (e.g. ~14 on web → ~6–7 on mobile).
  return dedupeLibraryContents(rows, { skipTitleCollapse: true }).map(mapContentToVideoItem);
}

const EDUOTT_EDGE_PAD = STUDENT_SPACING.sm;
const PREVIEW_VIDEO_COUNT = 3;

type SubjectGroup = {
  key: string;
  subject: string;
  classLabel: string;
  subjectIds: string[];
  productCategories: string[];
  videos: VideoItem[];
};

function useEduOTTGridLayout() {
  const { width: screenWidth } = useWindowDimensions();
  const numColumns = screenWidth >= 1024 ? 3 : screenWidth >= 768 ? 2 : 1;
  const isGrid = numColumns > 1;
  const columnGap = STUDENT_SPACING.md;
  const listContentWidth = screenWidth - EDUOTT_EDGE_PAD * 2;
  const gridCardWidth = isGrid
    ? (listContentWidth - columnGap * (numColumns - 1)) / numColumns
    : undefined;

  return { numColumns, isGrid, gridCardWidth };
}

export default function EduOTTView({ username = 'Student', role = 'student' }: EduOTTViewProps) {
  const { numColumns, isGrid, gridCardWidth } = useEduOTTGridLayout();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = isTabletLayout(width, height);
  const { isAsliPrepExclusive, loading: programLoading } = useSchoolProgram();
  // Web EduOTT never hides videos for teachers/admins. Only students at
  // non-Asli-Prep schools stay on live sessions.
  const showOnDemandVideos = role !== 'student' || isAsliPrepExclusive;
  const useClientSideFilters = role !== 'student';
  const dashboardLabel = DASHBOARD_LABELS[role];
  const listScrollBottomPad = eduOttListScrollBottomPad(
    role,
    isTablet,
    STUDENT_SPACING.md,
    insets.bottom,
  );
  const {
    selectedClass,
    selectedSubject,
    listEpoch,
    setSelectedClass,
    setSelectedSubject,
  } = useEduOTTFilters();

  type EduOTTTab = 'videos' | 'live-sessions';
  const [activeTab, setActiveTab] = useState<EduOTTTab>('videos');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [videoCatalog, setVideoCatalog] = useState<VideoItem[]>([]);
  const [sessionCatalog, setSessionCatalog] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [videosFetchFailed, setVideosFetchFailed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(40);
  const [subjectFocus, setSubjectFocus] = useState<SubjectGroup | null>(null);
  const [subjectLibraryVideos, setSubjectLibraryVideos] = useState<VideoItem[]>([]);
  const [subjectLibraryLoading, setSubjectLibraryLoading] = useState(false);

  useEffect(() => {
    if (!programLoading && !showOnDemandVideos && activeTab === 'videos') {
      setActiveTab('live-sessions');
    }
  }, [programLoading, showOnDemandVideos, activeTab]);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      const token = await storageGetItem('authToken');
      if (!token) return;
      try {
        if (!showOnDemandVideos) {
          if (cancelled) return;
          setVideoCatalog([]);
          setVideosFetchFailed(false);
        } else {
          const { list: videoList, ok } = await fetchRoleVideos(token, role);
          if (cancelled) return;
          setVideoCatalog(videoList);
          setVideosFetchFailed(!ok);
        }
        const sRes = await fetch(buildStreamsUrl(role, null, null), {
          headers: authHeaders(token),
        });
        if (cancelled) return;
        if (sRes.ok) {
          const data = await sRes.json();
          setSessionCatalog(data.data || data || []);
        } else {
          setSessionCatalog([]);
        }
      } catch {
        if (!cancelled) {
          setVideoCatalog([]);
          setSessionCatalog([]);
          if (showOnDemandVideos) setVideosFetchFailed(true);
        }
      }
    }
    if (!programLoading) {
      loadCatalog();
    }
    return () => {
      cancelled = true;
    };
  }, [showOnDemandVideos, programLoading, role]);

  useEffect(
    () => setVisibleCount(40),
    [searchTerm, listEpoch, subjectFocus?.key]
  );

  useEffect(() => {
    setSubjectFocus(null);
    setSubjectLibraryVideos([]);
  }, [selectedClass, selectedSubject, listEpoch]);

  useEffect(() => {
    if (!subjectFocus) {
      setSubjectLibraryVideos([]);
      setSubjectLibraryLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setSubjectLibraryLoading(true);
      try {
        const token = await storageGetItem('authToken');
        if (!token) return;
        const params = new URLSearchParams({ type: 'Video', surface: 'eduott' });
        if (subjectFocus.classLabel) params.set('class', subjectFocus.classLabel);
        if (subjectFocus.subjectIds[0]) params.set('subject', subjectFocus.subjectIds[0]);
        else if (subjectFocus.subject) params.set('subject', subjectFocus.subject);

        const { ok, payload } = await fetchJsonPayload(
          `${API_BASE_URL}/api/${role}/asli-prep-content?${params.toString()}`,
          authHeaders(token),
        );
        if (!ok || cancelled) return;

        const rows = rowsFromVideoPayload(payload, false);
        const idSet = new Set(subjectFocus.subjectIds.map(String));
        const subjectKey = subjectFocus.subject.toLowerCase();
        const classKey = String(subjectFocus.classLabel || '').trim();

        const matched = rows.filter((row) => {
          const subjectRef = typeof row.subject === 'object' ? row.subject : null;
          const subjectIdRef = typeof row.subjectId === 'object' ? row.subjectId : null;
          const sid = String(
            subjectRef?._id ||
              subjectIdRef?._id ||
              (typeof row.subject === 'string' ? row.subject : '') ||
              (typeof row.subjectId === 'string' ? row.subjectId : '') ||
              '',
          );
          if (idSet.size > 0 && idSet.has(sid)) return true;

          const rawName = String(subjectRef?.name || subjectIdRef?.name || (typeof row.subject === 'string' ? row.subject : '') || '');
          const plain = extractPlainSubjectName(rawName).toLowerCase();
          if (plain !== subjectKey) return false;

          const rowClass =
            getSubjectClassLabel(subjectRef || subjectIdRef || { classNumber: row.classNumber }) ||
            String(row.classNumber || '').trim();
          if (classKey && rowClass && classKey !== rowClass) return false;

          return isIitTrackContent(row) || idSet.has(sid);
        });

        const iitOnly = matched.filter((row) => isIitTrackContent(row));
        const list = mapAndDedupeVideos(iitOnly.length > 0 ? iitOnly : matched);
        if (!cancelled) setSubjectLibraryVideos(list);
      } catch {
        if (!cancelled) setSubjectLibraryVideos([]);
      } finally {
        if (!cancelled) setSubjectLibraryLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [subjectFocus, role]);

  useEffect(() => {
    if (programLoading) {
      return;
    }
    if (activeTab !== 'videos') {
      setLoading(false);
      return;
    }
    if (!showOnDemandVideos) {
      setVideos([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function fetchVideos() {
      try {
        setLoading(true);
        const token = await storageGetItem('authToken');
        if (!token) {
          setLoading(false);
          return;
        }

        if (cancelled) return;

        if (useClientSideFilters) {
          const { list, ok } = await fetchRoleVideos(token, role);
          if (!cancelled) {
            setVideos(list);
            setVideoCatalog(list);
            setVideosFetchFailed(!ok);
          }
        } else {
          const { list, ok } = await fetchFilteredStudentVideos(
            token,
            role,
            selectedClass,
            selectedSubject
          );
          if (!cancelled) {
            setVideos(list);
            if (!selectedClass && !selectedSubject) {
              setVideoCatalog(list);
            }
            setVideosFetchFailed(!ok);
          }
        }
      } catch {
        if (!cancelled) {
          setVideos([]);
          setVideosFetchFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchVideos();
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    showOnDemandVideos,
    programLoading,
    role,
    useClientSideFilters,
    listEpoch,
    ...(useClientSideFilters ? [] : [selectedClass, selectedSubject]),
  ]);

  useEffect(() => {
    if (activeTab !== 'live-sessions') {
      setLoadingSessions(false);
      return;
    }
    let cancelled = false;

    async function fetchLiveSessions() {
      try {
        setLoadingSessions(true);
        const token = await storageGetItem('authToken');
        if (!token) {
          setLoadingSessions(false);
          return;
        }

        const response = await fetch(
          useClientSideFilters ? buildStreamsUrl(role, null, null) : buildStreamsUrl(role, selectedClass, selectedSubject),
          {
            headers: authHeaders(token),
          }
        );

        if (cancelled) return;

        if (response.ok) {
          const data = await response.json();
          const sessionsList = data.data || data || [];
          setLiveSessions(sessionsList);
        } else {
          setLiveSessions([]);
        }
      } catch (error) {
        console.error('Failed to fetch live sessions:', error);
        if (!cancelled) setLiveSessions([]);
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    }

    fetchLiveSessions();
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    role,
    useClientSideFilters,
    listEpoch,
    ...(useClientSideFilters ? [] : [selectedClass, selectedSubject]),
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return { bg: '#fee2e2', text: '#dc2626' };
      case 'scheduled':
        return { bg: '#dbeafe', text: '#2563eb' };
      case 'ended':
        return { bg: '#f3f4f6', text: '#6b7280' };
      case 'cancelled':
        return { bg: '#fed7aa', text: '#ea580c' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const globalClassOptions = useMemo(() => {
    const set = new Set<string>();
    videoCatalog.forEach((v) => {
      const l = getSubjectClassLabel({
        name: v.subjectName,
        classNumber: v.classNumber,
      });
      if (l) set.add(l);
    });
    sessionCatalog.forEach((session) => {
      const l = getSubjectClassLabel({
        name: session.subject?.name,
        classNumber: session.classNumber,
      });
      if (l) set.add(l);
    });
    return Array.from(set).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [videoCatalog, sessionCatalog]);

  const globalSubjectOptions = useMemo(() => {
    const names = new Set<string>();
    videoCatalog.forEach((v) => {
      const l = getSubjectClassLabel({
        name: v.subjectName,
        classNumber: v.classNumber,
      });
      if (selectedClass && l !== selectedClass) return;
      names.add(extractPlainSubjectName(v.subjectName || '').trim());
    });
    sessionCatalog.forEach((session) => {
      const l = getSubjectClassLabel({
        name: session.subject?.name,
        classNumber: session.classNumber,
      });
      if (selectedClass && l !== selectedClass) return;
      names.add(extractPlainSubjectName(session.subject?.name || '').trim());
    });
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [videoCatalog, sessionCatalog, selectedClass]);

  const classSubjectFilteredVideos = useMemo(
    () =>
      useClientSideFilters
        ? videos.filter((video) =>
            matchesClassSubject(video.subjectName, video.classNumber, selectedClass, selectedSubject)
          )
        : videos,
    [videos, selectedClass, selectedSubject, useClientSideFilters]
  );

  const classSubjectFilteredSessions = useMemo(
    () =>
      useClientSideFilters
        ? liveSessions.filter((session) =>
            matchesClassSubject(session.subject?.name, session.classNumber, selectedClass, selectedSubject)
          )
        : liveSessions,
    [liveSessions, selectedClass, selectedSubject, useClientSideFilters]
  );

  const filteredVideos = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return classSubjectFilteredVideos.filter((video) => {
      if (!q) return true;
      return (
        video.title.toLowerCase().includes(q) ||
        (video.description || '').toLowerCase().includes(q) ||
        (video.subjectName || '').toLowerCase().includes(q) ||
        (video.subject || '').toLowerCase().includes(q)
      );
    });
  }, [classSubjectFilteredVideos, searchTerm]);

  const subjectGroups = useMemo((): SubjectGroup[] => {
    const map = new Map<string, SubjectGroup>();
    for (const video of filteredVideos) {
      const subject =
        video.subject || extractPlainSubjectName(video.subjectName || '') || 'Subject';
      const classLabel =
        video.class ||
        getSubjectClassLabel({
          name: video.subjectName,
          classNumber: video.classNumber,
        }) ||
        video.classNumber ||
        '';
      const key = `${classLabel}::${subject}`.toLowerCase();
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          subject,
          classLabel,
          subjectIds: [],
          productCategories: [],
          videos: [],
        };
        map.set(key, group);
      }
      group.videos.push(video);
      const sid = String(video.subjectId || '').trim();
      if (sid && !group.subjectIds.includes(sid)) group.subjectIds.push(sid);
      const cat = String(video.productCategory || '').trim().toUpperCase();
      if (cat && !group.productCategories.includes(cat)) group.productCategories.push(cat);
    }
    return Array.from(map.values())
      .map((group) => ({
        ...group,
        videos: sortContentsChapterWise(group.videos.map((v) => ({ ...v, type: 'Video' }))),
      }))
      .sort((a, b) => {
        const classCmp =
          (parseInt(a.classLabel, 10) || 0) - (parseInt(b.classLabel, 10) || 0) ||
          a.classLabel.localeCompare(b.classLabel);
        if (classCmp) return classCmp;
        return a.subject.localeCompare(b.subject);
      });
  }, [filteredVideos]);

  const focusVideos = useMemo(() => {
    if (!subjectFocus) return [];
    const live = subjectGroups.find((g) => g.key === subjectFocus.key);
    const source =
      subjectLibraryVideos.length > 0
        ? subjectLibraryVideos
        : live?.videos || subjectFocus.videos;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (video) =>
        video.title.toLowerCase().includes(q) ||
        (video.description || '').toLowerCase().includes(q) ||
        (video.subjectName || '').toLowerCase().includes(q) ||
        (video.subject || '').toLowerCase().includes(q),
    );
  }, [subjectFocus, subjectGroups, subjectLibraryVideos, searchTerm]);

  const filteredSessions = useMemo(() => {
    return classSubjectFilteredSessions.filter((session) => {
      const matchesSearch =
        !sessionSearchTerm ||
        session.title.toLowerCase().includes(sessionSearchTerm.toLowerCase()) ||
        (session.description || '').toLowerCase().includes(sessionSearchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [classSubjectFilteredSessions, sessionSearchTerm]);

  const classDropdownOptions = useMemo(
    () => [
      { value: 'all', label: 'All Classes' },
      ...globalClassOptions.map((c) => ({ value: c, label: `Class ${c}` })),
    ],
    [globalClassOptions]
  );

  const subjectDropdownOptions = useMemo(
    () => [
      { value: 'all', label: 'All Subjects' },
      ...globalSubjectOptions.map((n) => ({ value: n, label: n })),
    ],
    [globalSubjectOptions]
  );

  const handlePlayVideo = useCallback((video: VideoItem) => {
    if (!video._id) return;
    router.push({
      pathname: '/video-player',
      params: {
        videoId: video._id,
        isContentItem: 'true',
        contentData: JSON.stringify({
          _id: video._id,
          title: video.title,
          description: video.description,
          fileUrl: video.fileUrl || video.videoUrl,
          videoUrl: video.videoUrl || video.fileUrl,
          youtubeUrl: video.youtubeUrl,
          duration: video.duration,
          type: 'Video',
          subject: video.subjectName,
          topic: video.topic,
          chapter: video.chapter,
          module: video.module,
          aiFeatures: video.aiFeatures,
          notes: video.notes,
          autoNotes: video.autoNotes,
        }),
        returnTo: 'eduott',
      },
    });
  }, []);

  const handleJoinLive = useCallback((session: LiveSession) => {
    if (!session._id) return;
    router.push({
      pathname: '/live-stream',
      params: { sessionId: session._id },
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const token = await storageGetItem('authToken');
    if (!token) {
      setRefreshing(false);
      return;
    }
    try {
      if (showOnDemandVideos) {
        const { list: videoList, ok } = await fetchRoleVideos(token, role);
        setVideoCatalog(videoList);
        setVideosFetchFailed(!ok);
        if (useClientSideFilters) {
          setVideos(videoList);
        } else {
          const { list, ok: filteredOk } = await fetchFilteredStudentVideos(
            token,
            role,
            selectedClass,
            selectedSubject
          );
          setVideos(list);
          setVideosFetchFailed(!filteredOk);
        }
      } else {
        setVideoCatalog([]);
        setVideos([]);
        setVideosFetchFailed(false);
      }
      const sRes = await fetch(buildStreamsUrl(role, null, null), {
        headers: authHeaders(token),
      });
      if (sRes.ok) {
        const data = await sRes.json();
        const allSessions = data.data || data || [];
        setSessionCatalog(allSessions);
        if (useClientSideFilters) {
          setLiveSessions(allSessions);
        } else {
          const s2 = await fetch(buildStreamsUrl(role, selectedClass, selectedSubject), {
            headers: authHeaders(token),
          });
          if (s2.ok) {
            const sData = await s2.json();
            setLiveSessions(sData.data || sData || []);
          }
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [selectedClass, selectedSubject, showOnDemandVideos, role, useClientSideFilters]);

  const visibleFocusVideos = useMemo(
    () => focusVideos.slice(0, visibleCount),
    [focusVideos, visibleCount]
  );

  const onEndReached = useCallback(() => {
    if (subjectFocus && visibleCount < focusVideos.length) {
      setVisibleCount((prev) => prev + 10);
    }
  }, [subjectFocus, visibleCount, focusVideos.length]);

  const clearAllFilters = useCallback((): void => {
    setSelectedClass(null);
    setSelectedSubject(null);
    setSearchTerm('');
    setSessionSearchTerm('');
  }, [setSelectedClass, setSelectedSubject]);

  const hasVideoFilters = Boolean(selectedClass || selectedSubject || searchTerm.trim());
  const hasSessionFilters = Boolean(selectedClass || selectedSubject || sessionSearchTerm.trim());

  type EmptyStateContent = {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
  };

  const videoEmptyContent = useMemo((): EmptyStateContent => {
    if (!showOnDemandVideos) {
      return {
        icon: 'school-outline' as const,
        title: 'Videos Not Available',
        subtitle:
          'On-demand videos are included with Asli Prep schools. You can still join live classes from the Live tab.',
        actionLabel: 'View Live Sessions',
        onAction: () => setActiveTab('live-sessions'),
      };
    }
    if (videosFetchFailed) {
      return {
        icon: 'cloud-offline-outline' as const,
        title: 'Couldn’t Load Videos',
        subtitle:
          'The video library is temporarily unavailable. Pull down to refresh, or try again in a moment.',
        actionLabel: 'Try Again',
        onAction: (): void => {
          void onRefresh();
        },
      };
    }
    if (searchTerm.trim() && classSubjectFilteredVideos.length > 0) {
      return {
        icon: 'search-outline' as const,
        title: 'No Matching Videos',
        subtitle: `Nothing matched “${searchTerm.trim()}”. Try a different keyword or clear your search.`,
        actionLabel: 'Clear Search',
        onAction: () => setSearchTerm(''),
      };
    }
    if (hasVideoFilters && videoCatalog.length > 0) {
      const parts: string[] = [];
      if (selectedClass) parts.push(`Class ${selectedClass}`);
      if (selectedSubject) parts.push(selectedSubject);
      return {
        icon: 'filter-outline' as const,
        title: 'No Videos For These Filters',
        subtitle:
          parts.length > 0
            ? `No videos found for ${parts.join(' · ')}. Try another class or subject, or clear filters to browse all videos.`
            : 'No videos match your current filters. Clear filters to see everything available.',
        actionLabel: 'Clear Filters',
        onAction: clearAllFilters,
      };
    }
    if (videoCatalog.length === 0) {
      return {
        icon: 'videocam-outline' as const,
        title: 'No Videos Yet',
        subtitle: 'Your school has not published any videos yet. Pull down to refresh, or check live sessions for upcoming classes.',
        actionLabel: 'Refresh',
        onAction: () => void onRefresh(),
      };
    }
    return {
      icon: 'videocam-outline' as const,
      title: 'No Videos Found',
      subtitle: 'Try another class, subject, or search term—or clear filters to see all available videos.',
      actionLabel: hasVideoFilters ? 'Clear Filters' : undefined,
      onAction: hasVideoFilters ? clearAllFilters : undefined,
    };
  }, [
    showOnDemandVideos,
    videosFetchFailed,
    searchTerm,
    classSubjectFilteredVideos.length,
    hasVideoFilters,
    videoCatalog.length,
    selectedClass,
    selectedSubject,
    clearAllFilters,
    onRefresh,
  ]);

  const sessionEmptyContent = useMemo(() => {
    if (sessionSearchTerm.trim() && classSubjectFilteredSessions.length > 0) {
      return {
        icon: 'search-outline' as const,
        title: 'No Matching Sessions',
        subtitle: `Nothing matched “${sessionSearchTerm.trim()}”. Try another keyword or clear your search.`,
        actionLabel: 'Clear Search',
        onAction: () => setSessionSearchTerm(''),
      };
    }
    if (hasSessionFilters && sessionCatalog.length > 0) {
      return {
        icon: 'filter-outline' as const,
        title: 'No Sessions For These Filters',
        subtitle: 'Try another class or subject, or clear filters to see all scheduled live classes.',
        actionLabel: 'Clear Filters',
        onAction: clearAllFilters,
      };
    }
    if (sessionCatalog.length === 0) {
      return {
        icon: 'radio-outline' as const,
        title: 'No Live Sessions Right Now',
        subtitle: 'When your teachers schedule a class, it will show up here. Pull down to refresh.',
        actionLabel: 'Refresh',
        onAction: () => void onRefresh(),
      };
    }
    return {
      icon: 'radio-outline' as const,
      title: 'No Sessions Match Filters',
      subtitle: 'Try another search or clear filters to browse all live sessions.',
      actionLabel: hasSessionFilters ? 'Clear Filters' : undefined,
      onAction: hasSessionFilters ? clearAllFilters : undefined,
    };
  }, [
    sessionSearchTerm,
    classSubjectFilteredSessions.length,
    hasSessionFilters,
    sessionCatalog.length,
    clearAllFilters,
    onRefresh,
  ]);

  const renderEmptyStateCard = (content: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => (
    <GlassPanel style={styles.emptyCard} radius={STUDENT_RADIUS.card}>
      {/* Child centering lives on this inner view — GlassPanel wraps children itself. */}
      <View style={styles.emptyCardInner}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name={content.icon} size={32} color={STUDENT.primaryDark} />
        </View>
        <Text style={styles.emptyTitle}>{content.title}</Text>
        <Text style={styles.emptyText}>{content.subtitle}</Text>
        {content.actionLabel && content.onAction ? (
          <TouchableOpacity style={styles.emptyActionBtn} activeOpacity={0.85} onPress={content.onAction}>
            <Text style={styles.emptyActionText}>{content.actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </GlassPanel>
  );

  const renderVideoItem = useCallback(({ item: video }: { item: VideoItem }) => (
    <EduOTTVideoCard
      variant="student"
      style={gridCardWidth != null ? { width: gridCardWidth } : undefined}
      title={video.title}
      durationSeconds={video.duration}
      subjectLabel={extractPlainSubjectName(video.subjectName || '').trim() || undefined}
      classLabel={
        getSubjectClassLabel({
          name: video.subjectName,
          classNumber: video.classNumber,
        }) || undefined
      }
      thumbnailUrl={video.thumbnailUrl}
      youtubeUrl={video.youtubeUrl}
      fileUrl={video.fileUrl}
      videoUrl={video.videoUrl}
      onPress={() => handlePlayVideo(video)}
    />
  ), [handlePlayVideo, gridCardWidth]);

  const groupTrackLabel = useCallback((group: SubjectGroup) => {
    return group.productCategories[0]
      ? formatSubjectWithIitCategory(group.subject, group.productCategories[0])
      : `${group.subject} IIT`;
  }, []);

  const renderSubjectHero = useCallback(
    (trackLabel: string, classLabel: string | undefined, videoCountLabel: string) => (
      <View style={styles.focusHero}>
        <View style={styles.focusHeroIcon}>
          <Ionicons name="play-circle" size={26} color={STUDENT.primaryDark} />
        </View>
        <View style={styles.focusHeroBody}>
          <View style={styles.focusHeroTitleRow}>
            <Text style={styles.focusHeroTitle} numberOfLines={2}>
              {trackLabel}
            </Text>
            <View style={styles.focusIitBadge}>
              <Text style={styles.focusIitBadgeText}>IIT</Text>
            </View>
          </View>
          <View style={styles.focusChipRow}>
            {classLabel ? (
              <View style={styles.focusChip}>
                <Ionicons name="school-outline" size={12} color={STUDENT.primaryDark} />
                <Text style={styles.focusChipText}>Class {classLabel}</Text>
              </View>
            ) : null}
            <View style={styles.focusChip}>
              <Ionicons name="videocam-outline" size={12} color={STUDENT.primaryDark} />
              <Text style={styles.focusChipText}>{videoCountLabel}</Text>
            </View>
          </View>
        </View>
      </View>
    ),
    [],
  );

  const renderSubjectGroup = useCallback(
    ({ item: group }: { item: SubjectGroup }) => {
      const preview = group.videos.slice(0, PREVIEW_VIDEO_COUNT);
      const trackLabel = groupTrackLabel(group);
      return (
        <View style={styles.subjectSection}>
          {renderSubjectHero(
            trackLabel,
            group.classLabel || undefined,
            `${group.videos.length} video${group.videos.length === 1 ? '' : 's'}`,
          )}
          <View style={isGrid ? styles.previewGrid : styles.previewStack}>
            {preview.map((video) => (
              <EduOTTVideoCard
                key={video._id}
                variant="student"
                style={gridCardWidth != null ? { width: gridCardWidth } : undefined}
                title={video.title}
                durationSeconds={video.duration}
                subjectLabel={extractPlainSubjectName(video.subjectName || '').trim() || undefined}
                classLabel={
                  getSubjectClassLabel({
                    name: video.subjectName,
                    classNumber: video.classNumber,
                  }) || undefined
                }
                thumbnailUrl={video.thumbnailUrl}
                youtubeUrl={video.youtubeUrl}
                fileUrl={video.fileUrl}
                videoUrl={video.videoUrl}
                onPress={() => handlePlayVideo(video)}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.viewLibraryBtn}
            activeOpacity={0.88}
            onPress={() => {
              setActiveTab('videos');
              setSearchTerm('');
              setSubjectFocus(group);
            }}
          >
            <Text style={styles.viewLibraryBtnText}>View Full Library</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      );
    },
    [groupTrackLabel, handlePlayVideo, isGrid, gridCardWidth, renderSubjectHero],
  );

  const renderSessionItem = useCallback(({ item }: { item: LiveSession }) => {
    const statusColor = getStatusColor(item.status);
    const joinable = canJoinLiveSession(item);
    return (
      <GlassPanel style={styles.sessionCard} radius={STUDENT_RADIUS.inner}>
        <View style={styles.sessionTopRow}>
          <Text style={styles.sessionTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.sessionStatus, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.sessionStatusText, { color: statusColor.text }]}>{item.status}</Text>
          </View>
        </View>
        <Text style={styles.sessionDescription} numberOfLines={2}>
          {item.description || 'Live Class Session'}
        </Text>
        <View style={styles.sessionMeta}>
          <Text style={styles.sessionMetaText}>
            {(() => {
              const plain = extractPlainSubjectName(item.subject?.name || 'Live Session');
              const cl = getSubjectClassLabel({
                name: item.subject?.name,
                classNumber: item.classNumber,
              });
              return cl ? `${plain} · Class ${cl}` : plain;
            })()}
          </Text>
        </View>
        {joinable ? (
          <TouchableOpacity
            style={styles.joinSessionButton}
            activeOpacity={0.9}
            onPress={() => handleJoinLive(item)}
          >
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={styles.joinSessionButtonText}>Join Session</Text>
          </TouchableOpacity>
        ) : null}
      </GlassPanel>
    );
  }, [handleJoinLive]);

  const videoKeyExtractor = useCallback((item: VideoItem) => item._id, []);
  const groupKeyExtractor = useCallback((item: SubjectGroup) => item.key, []);

  const listHeader = (
    <>
      {role === 'teacher' ? (
        <View style={{ marginBottom: 12 }}>
          <TeacherPageHero
            tone="eduott"
            badge="EduOTT"
            extraBadge="IIT Exclusive"
            title="IIT prep videos."
            accent="Only for your track."
            accentColor="#FCD34D"
            subtitle="IIT track videos and live sessions for your classes. Board curriculum videos stay in Learning Paths."
            icon="videocam-outline"
          />
        </View>
      ) : (
        <Header username={username} dashboardLabel={dashboardLabel} />
      )}

      {!subjectFocus ? (
        <>
      <GlassPanel style={styles.summaryCard} radius={STUDENT_RADIUS.inner}>
        <View style={styles.summaryTop}>
          <View style={styles.summaryIcon}>
            <Ionicons name="videocam" size={20} color="#2563eb" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>EduOTT</Text>
            <Text style={styles.summarySubtitle}>
              {showOnDemandVideos ? 'Videos & Live Classes' : 'Live Classes'}
            </Text>
          </View>
        </View>
        <View style={styles.summaryStats}>
          {showOnDemandVideos && (
            <TouchableOpacity
              style={[styles.statChip, activeTab === 'videos' && styles.statChipActive]}
              activeOpacity={0.85}
              onPress={() => setActiveTab('videos')}
            >
              <Text style={[styles.statChipText, activeTab === 'videos' && styles.statChipTextActive]}>
                🎥 {classSubjectFilteredVideos.length} Videos
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.statChip, activeTab === 'live-sessions' && styles.statChipActive]}
            activeOpacity={0.85}
            onPress={() => setActiveTab('live-sessions')}
          >
            <Text style={[styles.statChipText, activeTab === 'live-sessions' && styles.statChipTextActive]}>
              🔴 {classSubjectFilteredSessions.filter((x) => x.status === 'live').length} Live
            </Text>
          </TouchableOpacity>
        </View>
      </GlassPanel>

      <View style={styles.filterRow}>
        <StudentFilterDropdown
          label="Class"
          value={selectedClass ?? 'all'}
          placeholder="All Classes"
          options={classDropdownOptions}
          onChange={(v) => setSelectedClass(v === 'all' ? null : v)}
        />
        <StudentFilterDropdown
          label="Subject"
          value={selectedSubject ?? 'all'}
          placeholder="All Subjects"
          options={subjectDropdownOptions}
          onChange={(v) => setSelectedSubject(v === 'all' ? null : v)}
        />
      </View>
        </>
      ) : null}
    </>
  );

  const renderSkeletons = () => (
    <View style={styles.skeletonWrap}>
      {[1, 2, 3].map((n) => (
        <ShimmerCard key={n} />
      ))}
    </View>
  );

  const renderVideoContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          {listHeader}
          {renderSkeletons()}
        </View>
      );
    }

    if (subjectFocus) {
      const trackLabel = groupTrackLabel(subjectFocus);
      return (
        <FlatList
          key={`eduott-focus-${subjectFocus.key}-${numColumns}`}
          data={subjectLibraryLoading ? [] : visibleFocusVideos}
          keyExtractor={videoKeyExtractor}
          renderItem={renderVideoItem}
          numColumns={numColumns}
          columnWrapperStyle={isGrid ? styles.columnWrapper : undefined}
          ListHeaderComponent={
            <>
              {listHeader}
              <TouchableOpacity
                style={styles.backPill}
                onPress={() => {
                  setSubjectFocus(null);
                  setSubjectLibraryVideos([]);
                  setSearchTerm('');
                }}
                accessibilityRole="button"
                accessibilityLabel="Back to all IIT subjects"
              >
                <Ionicons name="chevron-back" size={16} color={STUDENT.primaryDark} />
                <Text style={styles.backPillText}>All subjects</Text>
              </TouchableOpacity>
              {renderSubjectHero(
                trackLabel,
                subjectFocus.classLabel || undefined,
                subjectLibraryLoading
                  ? 'Loading…'
                  : `${focusVideos.length} video${focusVideos.length === 1 ? '' : 's'}`,
              )}
              <SearchBar
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search videos in this subject..."
              />
              {subjectLibraryLoading ? renderSkeletons() : null}
            </>
          }
          ListEmptyComponent={
            subjectLibraryLoading ? null : renderEmptyStateCard(videoEmptyContent)
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.35}
          contentContainerStyle={[
            styles.listContainer,
            { paddingBottom: listScrollBottomPad },
            isGrid && styles.listContainerGrid,
            focusVideos.length === 0 && styles.listContainerEmpty,
          ]}
          maxToRenderPerBatch={8}
          initialNumToRender={8}
          windowSize={9}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
        />
      );
    }

    return (
      <FlatList
        key={`eduott-subjects-${numColumns}`}
        data={subjectGroups}
        keyExtractor={groupKeyExtractor}
        renderItem={renderSubjectGroup}
        ListHeaderComponent={
          <>
            {listHeader}
            <SearchBar
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search IIT Subjects Or Videos..."
            />
            {subjectGroups.length > 0 ? (
              <Text style={styles.resultsCount}>
                {subjectGroups.length} IIT Subject{subjectGroups.length === 1 ? '' : 's'} ·{' '}
                {filteredVideos.length} Video{filteredVideos.length === 1 ? '' : 's'}
              </Text>
            ) : null}
          </>
        }
        ListEmptyComponent={renderEmptyStateCard(videoEmptyContent)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: listScrollBottomPad },
          subjectGroups.length === 0 && styles.listContainerEmpty,
        ]}
        maxToRenderPerBatch={6}
        initialNumToRender={4}
        windowSize={8}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderLiveContent = () => {
    if (loadingSessions) {
      return (
        <View style={styles.skeletonWrap}>
          <ShimmerCard />
          <ShimmerCard />
          <ShimmerCard />
        </View>
      );
    }

    return (
      <FlatList
        data={filteredSessions}
        keyExtractor={(item) => item._id}
        renderItem={renderSessionItem}
        ListHeaderComponent={
          <>
            {listHeader}
            <SearchBar
              value={sessionSearchTerm}
              onChangeText={setSessionSearchTerm}
              placeholder="Search Live Sessions..."
            />
          </>
        }
        ListEmptyComponent={renderEmptyStateCard(sessionEmptyContent)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[
          styles.listContainer,
          { paddingBottom: listScrollBottomPad },
          filteredSessions.length === 0 && styles.listContainerEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {activeTab === 'videos' ? renderVideoContent() : renderLiveContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Transparent so the app background artwork shows through.
    backgroundColor: 'transparent',
    paddingTop: STUDENT_SPACING.sm,
  },
  listContainer: {
    paddingHorizontal: EDUOTT_EDGE_PAD,
    paddingBottom: STUDENT_SPACING.xl,
  },
  listContainerEmpty: {
    flexGrow: 1,
  },
  loadingWrap: {
    flex: 1,
    paddingHorizontal: EDUOTT_EDGE_PAD,
  },
  listContainerGrid: {
    width: '100%',
  },
  columnWrapper: {
    gap: STUDENT_SPACING.md,
  },
  summaryCard: {
    // Fill comes from GlassPanel's blur + white rim.
    borderRadius: STUDENT_RADIUS.inner,
    padding: STUDENT_SPACING.md,
    marginBottom: STUDENT_SPACING.md,
    ...STUDENT.shadow.sm,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: STUDENT_RADIUS.md,
    backgroundColor: STUDENT.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    ...STUDENT_TYPO.section,
    fontSize: 18,
    color: STUDENT.text,
  },
  summarySubtitle: {
    fontSize: 13,
    color: STUDENT.textMuted,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    backgroundColor: STUDENT.surfaceElevated,
    borderRadius: STUDENT_RADIUS.full,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: STUDENT.surfaceBorder,
    alignItems: 'center',
  },
  statChipActive: {
    backgroundColor: STUDENT.navActiveBg,
    borderColor: STUDENT.primary,
  },
  statChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.text,
  },
  statChipTextActive: {
    color: STUDENT.primaryDark,
  },
  filterRow: {
    flexDirection: 'row',
    gap: STUDENT_SPACING.sm,
    marginBottom: STUDENT_SPACING.md,
  },
  resultsCount: {
    ...STUDENT_TYPO.caption,
    color: STUDENT.textMuted,
    marginBottom: STUDENT_SPACING.sm,
  },
  subjectSection: {
    marginBottom: 22,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(109, 91, 208, 0.16)',
  },
  previewStack: {
    gap: 12,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: STUDENT_SPACING.md,
  },
  viewLibraryBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 12,
  },
  viewLibraryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    marginBottom: 10,
    paddingVertical: 6,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: STUDENT.navActiveBg,
    borderWidth: 1,
    borderColor: 'rgba(109, 91, 208, 0.18)',
  },
  backPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: STUDENT.primaryDark,
  },
  focusHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: STUDENT_RADIUS.card,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(109, 91, 208, 0.16)',
    ...STUDENT.shadow.sm,
  },
  focusHeroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STUDENT.navActiveBg,
  },
  focusHeroBody: {
    flex: 1,
    minWidth: 0,
  },
  focusHeroTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  focusHeroTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: STUDENT.text,
    letterSpacing: -0.3,
  },
  focusIitBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
  },
  focusIitBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#B45309',
  },
  focusChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  focusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: STUDENT.bgAccent,
  },
  focusChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: STUDENT.primaryDark,
  },
  emptyCard: {
    marginTop: STUDENT_SPACING.lg,
    marginBottom: STUDENT_SPACING.xl,
    paddingVertical: STUDENT_SPACING.xxl,
    paddingHorizontal: STUDENT_SPACING.lg,
    borderRadius: STUDENT_RADIUS.card,
    ...STUDENT.shadow.sm,
  },
  emptyCardInner: {
    alignItems: 'center',
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: STUDENT.navActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: STUDENT_SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: STUDENT.text,
    textAlign: 'center',
  },
  emptyText: {
    marginTop: STUDENT_SPACING.sm,
    fontSize: 14,
    lineHeight: 21,
    color: STUDENT.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  emptyActionBtn: {
    marginTop: STUDENT_SPACING.lg,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: STUDENT_RADIUS.full,
    backgroundColor: STUDENT.primary,
    ...STUDENT.shadow.sm,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: STUDENT.textOnPrimary,
  },
  sessionCard: {
    // Fill comes from GlassPanel's blur + white rim.
    borderRadius: STUDENT_RADIUS.inner,
    padding: STUDENT_SPACING.md,
    marginBottom: STUDENT_SPACING.sm,
    ...STUDENT.shadow.sm,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: STUDENT.text,
    marginRight: 8,
  },
  sessionStatus: {
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  sessionDescription: {
    fontSize: 13,
    color: STUDENT.textMuted,
    marginBottom: 8,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionMetaText: {
    fontSize: 12,
    color: STUDENT.textMuted,
  },
  joinSessionLabel: {
    color: '#dc2626',
    fontWeight: '700',
  },
  joinSessionButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  joinSessionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  skeletonWrap: {
    marginTop: STUDENT_SPACING.md,
    gap: STUDENT_SPACING.sm,
  },
});

