import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { mergeSubjectOptions, formatVidyaMessage } from '../lib/vidya-subjects';
import vidyaService from '../services/api/vidyaService';
import type {
  AIChatContext,
  UseVidyaChatOptions,
  UseVidyaChatResult,
  VidyaMessage,
} from '../types/vidya';

const CONTROL_ASSISTANT_QUICK_QUESTIONS = [
  'How many students are there in the application?',
  'How is Class 7 performing?',
  "Show today's attendance summary",
  'Platform or school dashboard overview',
  'How many exams are scheduled this week?',
  'Tell me about a student by name (e.g. how is Rahul doing?)',
  'How many teachers are active?',
  'How many AI requests were generated today?',
];

const QUICK_QUESTIONS_BY_ROLE: Record<
  'student' | 'teacher' | 'admin' | 'super_admin',
  string[]
> = {
  student: [
    'What is my learning progress?',
    'What videos have I watched?',
    'What is my exam status — did I improve?',
    'Where am I weak and what should I study?',
  ],
  teacher: [
    'Which students in my class need extra attention?',
    'How is Class performance this month?',
    'Give me 10 MCQs on [current topic]',
    'Tell me about a student in my class by name',
  ],
  admin: [
    'How is Class 7 performing?',
    'Show school dashboard overview',
    'How many students are active?',
    'Tell me about a student by name',
  ],
  super_admin: [
    'Platform overview — schools, students, teachers',
    'How is Class 8 performing across schools?',
    'Details about a school by name',
    'How is a student or teacher doing by name?',
  ],
};

const INPUT_PLACEHOLDER_BY_ROLE: Record<
  'student' | 'teacher' | 'admin' | 'super_admin',
  string
> = {
  student: 'Ask Vidya or upload a photo…',
  teacher: 'Ask about teaching, lessons, or doubts...',
  admin: 'Ask about school management...',
  super_admin: 'Ask about system analytics, AI monitoring...',
};

const CONTROL_INPUT_PLACEHOLDER =
  'Ask for live metrics: students, teachers, exams, attendance, AI generations…';

const EMPTY_SESSION_MESSAGES: VidyaMessage[] = [];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function useVidyaChat({ userId, role, context }: UseVidyaChatOptions): UseVidyaChatResult {
  const isDatabaseBackedAssistant = role === 'admin' || role === 'super_admin';
  const isStudentMentorMode = role === 'student';
  const queryClient = useQueryClient();

  const [message, setMessageState] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [localMessages, setLocalMessages] = useState<VidyaMessage[]>([]);
  const [todayFocusAction, setTodayFocusAction] = useState('');
  const [todayFocusReason, setTodayFocusReason] = useState('');
  const [studyStreakMessage, setStudyStreakMessage] = useState('');
  const [proactivePrompt, setProactivePrompt] = useState('');
  const [lastControlLatencyMs, setLastControlLatencyMs] = useState<number | null>(null);

  const localMessagesRef = useRef<VidyaMessage[]>([]);
  const messageRef = useRef('');
  const contextRef = useRef(context);
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  contextRef.current = context;

  useEffect(() => {
    return () => {
      if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
      if (sendFlushTimerRef.current) clearTimeout(sendFlushTimerRef.current);
    };
  }, []);

  useEffect(() => {
    localMessagesRef.current = localMessages;
  }, [localMessages]);

  const setMessage = useCallback((value: SetStateAction<string>) => {
    setMessageState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      messageRef.current = next;
      return next;
    });
  }, []);

  const mergedSubjectOptions = useMemo(
    () => mergeSubjectOptions(context?.subjectOptions, context?.currentSubject),
    [
      context?.currentSubject,
      Array.isArray(context?.subjectOptions) ? context!.subjectOptions!.join('\u0001') : '',
    ]
  );

  const [selectedSubject, setSelectedSubject] = useState(
    () => mergedSubjectOptions[0] || 'General Study'
  );
  const selectedSubjectRef = useRef(selectedSubject);
  selectedSubjectRef.current = selectedSubject;

  useEffect(() => {
    const fallback = mergedSubjectOptions[0] || 'General Study';
    setSelectedSubject((prev) =>
      mergedSubjectOptions.some((s) => s === prev) ? prev : fallback
    );
  }, [mergedSubjectOptions]);

  const { data: sessions, isLoading: sessionsLoading, refetch } = useQuery({
    queryKey: ['/api/users', userId, 'chat-sessions'],
    queryFn: () => vidyaService.getChatSessions(userId),
    refetchInterval: false,
    staleTime: 30_000,
    enabled: Boolean(userId) && !isStudentMentorMode && !isDatabaseBackedAssistant,
  });

  const { data: controlHistory, isLoading: controlHistoryLoading } = useQuery({
    queryKey: ['vidya-control-history', userId],
    queryFn: () => vidyaService.getControlHistory(50),
    enabled: Boolean(userId) && isDatabaseBackedAssistant,
  });

  useEffect(() => {
    if (role !== 'student' || !userId) return;
    let mounted = true;
    vidyaService
      .getStudentFocusCard()
      .then((data) => {
        if (!mounted || !data?.success) return;
        setTodayFocusAction(data.focusCard?.action || data.todayFocus?.action || '');
        setTodayFocusReason(data.focusCard?.reason || '');
        const streakCount = Number(data.studyStreak?.count || 0);
        setStudyStreakMessage(
          streakCount > 0 ? `🔥 ${streakCount}-day streak!` : data.studyStreak?.message || ''
        );
        setProactivePrompt(data.proactivePrompt?.promptText || '');
        if (data.autoGreeting && localMessagesRef.current.length === 0) {
          setLocalMessages([
            {
              role: 'assistant',
              content: String(data.autoGreeting),
              timestamp: new Date(),
            },
          ]);
        }
      })
      .catch(() => null);
    return () => {
      mounted = false;
    };
  }, [role, userId]);

  const currentSession = sessions?.[0];
  const sessionMessages: VidyaMessage[] = currentSession?.messages
    ? (currentSession.messages as VidyaMessage[])
    : EMPTY_SESSION_MESSAGES;

  useEffect(() => {
    if (isDatabaseBackedAssistant) return;
    if (
      sessionMessages.length > 0 &&
      (localMessages.length === 0 || sessionMessages.length > localMessages.length)
    ) {
      setLocalMessages(
        sessionMessages.map((m) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }))
      );
    }
  }, [isDatabaseBackedAssistant, sessionMessages.length, localMessages.length]);

  useEffect(() => {
    if (!isDatabaseBackedAssistant) return;
    if (controlHistory === undefined) return;
    if (!controlHistory?.success) return;
    const items = controlHistory.items || [];
    if (items.length === 0) {
      setLocalMessages([]);
      return;
    }
    setLocalMessages((prev) => {
      if (prev.length > 0) return prev;
      const mapped: VidyaMessage[] = [];
      for (const item of items) {
        const ts = item.createdAt ? new Date(item.createdAt) : new Date();
        mapped.push({ role: 'user', content: item.prompt, timestamp: ts });
        mapped.push({ role: 'assistant', content: item.responseText, timestamp: ts });
      }
      return mapped;
    });
  }, [isDatabaseBackedAssistant, controlHistory]);

  const buildRequestContext = useCallback(
    (extra?: AIChatContext): AIChatContext => ({
      ...contextRef.current,
      ...extra,
      studentName: contextRef.current?.studentName || extra?.studentName || 'Student',
      currentSubject:
        extra?.currentSubject ??
        selectedSubjectRef.current ??
        contextRef.current?.currentSubject,
      currentTopic: extra?.currentTopic ?? contextRef.current?.currentTopic,
      teacherMode: extra?.teacherMode ?? contextRef.current?.teacherMode,
      subjectOptions: contextRef.current?.subjectOptions,
    }),
    []
  );

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { message: string; context?: AIChatContext }) => {
      const userMessage: VidyaMessage = {
        role: 'user',
        content: data.message,
        timestamp: new Date(),
      };

      setLocalMessages((prev) => [...prev, userMessage]);

      if (isDatabaseBackedAssistant) {
        const historyPayload = localMessagesRef.current
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-12)
          .map((m) => ({
            role: m.role,
            content: String(m.content || '').slice(0, 6000),
          }));

        const result = await vidyaService.controlQuery({
          message: data.message,
          history: historyPayload,
        });

        if (result.message) {
          setLastControlLatencyMs(
            typeof result.latencyMs === 'number' ? result.latencyMs : null
          );
          const aiMessage: VidyaMessage = {
            role: 'assistant',
            content: result.message,
            timestamp: new Date(),
          };
          setLocalMessages((prev) => [...prev, aiMessage]);
        }
        return result;
      }

      if (isStudentMentorMode) {
        const historyPayload = localMessagesRef.current
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .slice(-12)
          .map((m) => ({
            role: m.role,
            content: String(m.content || '').slice(0, 4000),
            ...(Array.isArray(m.citations) && m.citations.length ? { citations: m.citations } : {}),
          }));
        const result = await vidyaService.studentChat({
          message: data.message,
          studentId: userId,
          history: historyPayload,
        });
        const replyText = String(
          result?.message ||
            result?.reply ||
            result?.data?.message ||
            result?.data?.reply ||
            ''
        ).trim();
        if (replyText) {
          const aiMessage: VidyaMessage = {
            role: 'assistant',
            content: replyText,
            timestamp: new Date(),
            ...(Array.isArray(result.citations) && result.citations.length ? { citations: result.citations } : {}),
          };
          setLocalMessages((prev) => [...prev, aiMessage]);
        } else {
          const aiMessage: VidyaMessage = {
            role: 'assistant',
            content:
              'I could not generate a reply just now. Please try asking again in a moment.',
            timestamp: new Date(),
          };
          setLocalMessages((prev) => [...prev, aiMessage]);
        }
        return result;
      }

      const result = await vidyaService.aiChat({
        userId,
        message: data.message,
        context: buildRequestContext(data.context) as Record<string, unknown>,
      });

      if (result.session?.messages) {
        setLocalMessages(
          result.session.messages.map((m: VidyaMessage) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }))
        );
      } else if (result.message) {
        const aiMessage: VidyaMessage = {
          role: 'assistant',
          content: result.message,
          timestamp: new Date(),
        };
        setLocalMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.role === 'assistant' && lastMessage.content === result.message) {
            return prev;
          }
          return [...prev, aiMessage];
        });
      }

      return result;
    },
    onSuccess: () => {
      if (isStudentMentorMode) {
        queryClient.invalidateQueries({ queryKey: ['vidya-student-focus', userId] });
      } else if (isDatabaseBackedAssistant) {
        queryClient.invalidateQueries({ queryKey: ['vidya-control-history', userId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'chat-sessions'] });
        if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current);
        refetchTimerRef.current = setTimeout(() => {
          refetchTimerRef.current = null;
          refetch();
        }, 1000);
      }
      setMessage('');
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Failed to send message.';
      Alert.alert('Error', msg);
      setLocalMessages((prev) => prev.slice(0, -1));
    },
  });

  const analyzeImageMutation = useMutation({
    mutationFn: (data: { image: string; context?: string }) => vidyaService.analyzeImage(data),
    onSuccess: (data) => {
      sendMessageMutation.mutate({
        message: `Please analyze this image: ${data.analysis}`,
        context: buildRequestContext(),
      });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to analyze image. Please try again.');
    },
  });

  const sendSpecificMessage = useCallback(
    (text: string) => {
      if (!userId || !text.trim() || sendMessageMutation.isPending) return;
      sendMessageMutation.mutate({
        message: text.trim(),
        context: buildRequestContext(),
      });
    },
    [buildRequestContext, sendMessageMutation, userId]
  );

  /**
   * Android IME often keeps the last character in composition until blur.
   * Sending immediately drops it (e.g. "hi" → "h", "how are u" → "how are").
   * Defer a tick so the final onChangeText can land in messageRef first.
   */
  const handleSendMessage = useCallback(() => {
    if (sendFlushTimerRef.current) clearTimeout(sendFlushTimerRef.current);
    sendFlushTimerRef.current = setTimeout(() => {
      sendFlushTimerRef.current = null;
      sendSpecificMessage(messageRef.current);
    }, 80);
  }, [sendSpecificMessage]);

  const onPromptClick = useCallback(
    (question: string) => {
      setMessage(question);
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
      promptTimerRef.current = setTimeout(() => {
        promptTimerRef.current = null;
        sendSpecificMessage(question);
      }, 100);
    },
    [sendSpecificMessage]
  );

  const pickAndAnalyzeImage = useCallback(async () => {
    if (isDatabaseBackedAssistant && role !== 'super_admin') {
      Alert.alert('Not available', 'Image upload is not supported for school AI assistant.');
      return;
    }
    if (analyzeImageMutation.isPending || sendMessageMutation.isPending) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const asset = result.assets[0];
      if (typeof asset.size === 'number' && asset.size > MAX_IMAGE_BYTES) {
        Alert.alert('Image too large', 'Please choose an image smaller than 5 MB.');
        return;
      }
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      analyzeImageMutation.mutate({
        image: base64,
        context: `Subject: ${selectedSubjectRef.current || contextRef.current?.currentSubject || 'General Study'}. Please analyze this educational image and help me understand the concepts.`,
      });
    } catch {
      Alert.alert('Error', 'Could not open image. Please try again.');
    }
  }, [analyzeImageMutation, isDatabaseBackedAssistant, role, sendMessageMutation.isPending]);

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      if (!isDatabaseBackedAssistant) return { success: true };
      return vidyaService.clearControlHistory();
    },
    onSuccess: () => {
      setLocalMessages([]);
      setMessage('');
      if (isDatabaseBackedAssistant) {
        queryClient.invalidateQueries({ queryKey: ['vidya-control-history', userId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/users', userId, 'chat-sessions'] });
      }
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'Failed to clear chat history.';
      Alert.alert('Error', msg);
    },
  });

  const handleVoiceInput = useCallback(() => {
    setIsListening(true);
    Alert.alert(
      'Voice input',
      'Voice input is not supported on mobile yet. Type your question or use image upload.',
      [{ text: 'OK', onPress: () => setIsListening(false) }]
    );
  }, []);

  const displayMessages = useMemo(() => {
    if (isDatabaseBackedAssistant || isStudentMentorMode) return localMessages;
    return localMessages.length > 0 ? localMessages : sessionMessages;
  }, [isDatabaseBackedAssistant, isStudentMentorMode, localMessages, sessionMessages]);

  const quickQuestions = isDatabaseBackedAssistant
    ? CONTROL_ASSISTANT_QUICK_QUESTIONS
    : QUICK_QUESTIONS_BY_ROLE[role];

  const inputPlaceholder = isDatabaseBackedAssistant
    ? CONTROL_INPUT_PLACEHOLDER
    : INPUT_PLACEHOLDER_BY_ROLE[role];

  const isLoading = !userId
    ? true
    : isDatabaseBackedAssistant
    ? controlHistoryLoading && localMessages.length === 0
    : !isStudentMentorMode &&
      sessionsLoading &&
      localMessages.length === 0 &&
      displayMessages.length === 0;

  return {
    message,
    setMessage,
    isListening,
    isLoading,
    isPending: sendMessageMutation.isPending || analyzeImageMutation.isPending,
    displayMessages,
    quickQuestions,
    inputPlaceholder,
    currentSubject: selectedSubject,
    subjectOptions: mergedSubjectOptions,
    setSelectedSubject,
    userInitial:
      role === 'super_admin'
        ? 'SA'
        : context?.studentName?.charAt(0)?.toUpperCase() || 'A',
    handleSendMessage,
    sendSpecificMessage,
    pickAndAnalyzeImage,
    handleVoiceInput,
    onPromptClick,
    formatMessage: formatVidyaMessage,
    todayFocusAction,
    todayFocusReason,
    studyStreakMessage,
    proactivePrompt,
    clearChat: () => {
      if (clearChatMutation.isPending) return;
      clearChatMutation.mutate();
    },
    isClearingChat: clearChatMutation.isPending,
    isDatabaseBackedAssistant,
    lastControlLatencyMs,
  };
}
