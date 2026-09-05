import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Keyboard,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVidyaChat } from '../../hooks/useVidyaChat';
import type { AIChatContext } from '../../types/vidya';
import VidyaAvatar from './VidyaAvatar';
import VidyaChatMessageText from './VidyaChatMessageText';

const STUDENT_QUICK_COLORS = [
  { border: '#fbcfe8', bg: '#fdf2f8', text: '#9d174d' },
  { border: '#c7d2fe', bg: '#eef2ff', text: '#3730a3' },
  { border: '#99f6e4', bg: '#f0fdfa', text: '#115e59' },
  { border: '#fde68a', bg: '#fffbeb', text: '#92400e' },
];

type StudentVidyaChatPanelProps = {
  userId: string;
  context?: AIChatContext;
  embedded?: boolean;
};

type ComposerProps = {
  placeholder: string;
  isPending: boolean;
  isListening: boolean;
  bottomInset: number;
  showVoice?: boolean;
  onSend: (text: string) => void;
  onPickImage: () => void;
  onVoice: () => void;
  onFocusInput?: () => void;
  onHeightChange?: (height: number) => void;
};

/** Local draft state so typing does not re-render the message list. */
const ChatComposer = memo(function ChatComposer({
  placeholder,
  isPending,
  isListening,
  bottomInset,
  showVoice = true,
  onSend,
  onPickImage,
  onVoice,
  onFocusInput,
  onHeightChange,
}: ComposerProps) {
  const [draft, setDraft] = useState('');
  const draftRef = useRef('');
  const inputRef = useRef<TextInput>(null);
  const canSend = Boolean(draft.trim()) && !isPending;

  const setDraftTracked = useCallback((value: string) => {
    draftRef.current = value;
    setDraft(value);
  }, []);

  const flushSend = useCallback(
    (raw: string) => {
      const text = String(raw || '').trim();
      if (!text) return;
      onSend(text);
      draftRef.current = '';
      setDraft('');
    },
    [onSend],
  );

  const submit = useCallback(() => {
    if (isPending) return;
    // Blur + dismiss so Android IME commits the composing glyph before we read draft
    // (otherwise some devices send "Hell" / "H" instead of "Hello").
    inputRef.current?.blur();
    Keyboard.dismiss();
    const delay = Platform.OS === 'android' ? 120 : 0;
    setTimeout(() => flushSend(draftRef.current), delay);
  }, [flushSend, isPending]);

  const onSubmitEditing = useCallback(
    (e: { nativeEvent?: { text?: string } }) => {
      if (isPending) return;
      const fromEvent = e?.nativeEvent?.text;
      if (typeof fromEvent === 'string' && fromEvent.trim()) {
        flushSend(fromEvent);
        return;
      }
      submit();
    },
    [flushSend, isPending, submit],
  );

  return (
    <View
      style={[styles.inputBar, { paddingBottom: bottomInset }]}
      onLayout={(e) => onHeightChange?.(Math.ceil(e.nativeEvent.layout.height))}
    >
      <View style={styles.inputWrap}>
        <Pressable
          style={styles.iconBtn}
          onPress={onPickImage}
          disabled={isPending}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Attach an image"
          accessibilityState={{ disabled: isPending }}
        >
          <Ionicons name="image-outline" size={20} color="#64748b" />
        </Pressable>
        {showVoice ? (
          <Pressable
            style={styles.iconBtn}
            onPress={onVoice}
            disabled={isPending || isListening}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={isListening ? 'Listening, voice input active' : 'Start voice input'}
            accessibilityState={{ disabled: isPending || isListening }}
          >
            <Ionicons
              name="mic-outline"
              size={20}
              color={isListening ? '#ef4444' : '#64748b'}
            />
          </Pressable>
        ) : null}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={draft}
          onChangeText={setDraftTracked}
          accessibilityLabel="Message Vidya"
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={2000}
          editable={!isPending}
          cursorColor="#0284C7"
          selectionColor="rgba(2, 132, 199, 0.28)"
          textAlignVertical="center"
          onFocus={onFocusInput}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={false}
          // Avoid Android under-measure clipping the last typed glyph in the field.
          underlineColorAndroid="transparent"
        />
        <Pressable
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={submit}
          disabled={!canSend}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend, busy: isPending }}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
});

/**
 * Android often uses adjustResize (window already shrinks). Adding the full
 * keyboard height on top doubles the lift. Only apply the leftover gap.
 */
function leftoverKeyboardLift(keyboardH: number, baselineWindowH: number): number {
  const winNow = Dimensions.get('window').height;
  const alreadyShrunk = Math.max(0, baselineWindowH - winNow);
  return Math.max(0, Math.round(keyboardH - alreadyShrunk));
}

export default function StudentVidyaChatPanel({
  userId,
  context,
  embedded = false,
}: StudentVidyaChatPanelProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const baselineWindowHRef = useRef(Dimensions.get('window').height);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [keyboardLift, setKeyboardLift] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const model = useVidyaChat({ userId, role: 'student', context });

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const captureBaseline = useCallback(() => {
    baselineWindowHRef.current = Dimensions.get('window').height;
  }, []);

  const hasNotifications = Boolean(
    model.todayFocusAction || model.studyStreakMessage || model.proactivePrompt
  );
  const hasMessages = model.displayMessages.length > 0;
  // Same as web: insights stay open until the user collapses them; also show when chat is empty
  const showInsightsExpanded = hasNotifications && (insightsOpen || !hasMessages);

  useEffect(() => {
    scrollToBottom(true);
  }, [model.displayMessages.length, model.isPending, scrollToBottom]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: { endCoordinates?: { height?: number } }) => {
      const kb = Math.ceil(e?.endCoordinates?.height ?? 0);
      setKeyboardOpen(true);

      const applyLift = () => {
        // iOS: use full keyboard height (KAV not used; absolute dock).
        // Android: subtract whatever adjustResize already took.
        const lift =
          Platform.OS === 'ios' ? kb : leftoverKeyboardLift(kb, baselineWindowHRef.current);
        setKeyboardLift(lift);
      };

      applyLift();
      setTimeout(applyLift, 32);
      setTimeout(applyLift, 100);
      setTimeout(applyLift, 220);
      setTimeout(() => scrollToBottom(true), 140);
    };

    const onHide = () => {
      setKeyboardOpen(false);
      setKeyboardLift(0);
      captureBaseline();
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [captureBaseline, scrollToBottom]);

  const handleSend = useCallback(
    (text: string) => {
      model.sendSpecificMessage(text);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model.sendSpecificMessage]
  );

  const composerBottomPad = Math.max(insets.bottom, 8);

  if (model.isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#0284C7" />
      </View>
    );
  }

  return (
    <View
      style={[styles.root, embedded && styles.rootEmbedded]}
      onLayout={() => {
        if (!keyboardOpen) captureBaseline();
      }}
    >
      {/* Fixed chrome — matches web StudentChatUI (header + insights stay put) */}
      {!embedded ? (
        <View style={styles.header}>
          <VidyaAvatar size={36} borderColor="#bae6fd" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Vidya AI</Text>
            <Text style={styles.headerSub}>Your study buddy</Text>
          </View>
          {hasNotifications ? (
            <Pressable
              style={styles.insightsChip}
              onPress={() => setInsightsOpen((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={showInsightsExpanded ? 'Hide insights' : 'Show insights'}
              accessibilityState={{ expanded: showInsightsExpanded }}
            >
              <Ionicons name="sparkles" size={12} color="#d97706" />
              <Text style={styles.insightsChipText}>Insights</Text>
              <Ionicons
                name={showInsightsExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color="#64748b"
              />
            </Pressable>
          ) : null}
        </View>
      ) : hasNotifications ? (
        <View style={styles.embeddedChrome}>
          <Pressable
            style={styles.insightsChip}
            onPress={() => setInsightsOpen((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showInsightsExpanded ? 'Hide insights' : 'Show insights'}
            accessibilityState={{ expanded: showInsightsExpanded }}
          >
            <Ionicons name="sparkles" size={12} color="#d97706" />
            <Text style={styles.insightsChipText}>Insights</Text>
            <Ionicons
              name={showInsightsExpanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#64748b"
            />
          </Pressable>
        </View>
      ) : null}

      {showInsightsExpanded ? (
        <View style={styles.notifications}>
          {model.todayFocusAction ? (
            <View style={styles.focusCard}>
              <Text style={styles.focusLabel}>Today Focus</Text>
              <Text style={styles.focusAction}>{model.todayFocusAction}</Text>
              {model.todayFocusReason ? (
                <Text style={styles.focusReason}>{model.todayFocusReason}</Text>
              ) : null}
            </View>
          ) : null}
          {model.studyStreakMessage ? (
            <View style={styles.streakCard}>
              <Text style={styles.streakText}>{model.studyStreakMessage}</Text>
            </View>
          ) : null}
          {model.proactivePrompt ? (
            <Pressable
              style={styles.proactiveCard}
              onPress={() => model.onPromptClick(model.proactivePrompt!)}
              accessibilityRole="button"
              accessibilityLabel={`Ask Vidya: ${model.proactivePrompt}`}
            >
              <Text style={styles.proactiveText}>{model.proactivePrompt}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Messages only scroll — same as web flex-1 overflow-y-auto */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.mainScroll}
        contentContainerStyle={[
          styles.mainScrollContent,
          { paddingBottom: 12 + (Platform.OS === 'ios' ? keyboardLift : 0) },
        ]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.messagesBlock}>
          {!hasMessages ? (
            <View style={styles.starterBlock}>
              <Text style={styles.starterTitle}>Ask about your learning on Asli</Text>
              <Text style={styles.starterSub}>
                Progress, videos watched, exam status, weak areas — or any subject doubt
              </Text>
              <View style={styles.starterGrid}>
                {model.quickQuestions.map((question, index) => {
                  const colors = STUDENT_QUICK_COLORS[index % STUDENT_QUICK_COLORS.length];
                  return (
                    <Pressable
                      key={question}
                      style={[
                        styles.starterCard,
                        { borderColor: colors.border, backgroundColor: colors.bg },
                      ]}
                      onPress={() => model.onPromptClick(question)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ask Vidya: ${question}`}
                    >
                      <Text style={[styles.starterCardText, { color: colors.text }]}>{question}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            model.displayMessages.map((msg, idx) => (
              <View
                key={`${msg.role}-${idx}`}
                style={[
                  styles.messageRow,
                  msg.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant,
                ]}
              >
                {msg.role === 'assistant' ? (
                  <VidyaAvatar size={28} borderColor="#bae6fd" borderWidth={1} />
                ) : null}
                <View style={styles.bubbleColumn}>
                  {msg.role === 'assistant' ? (
                    <Text style={styles.assistantLabel}>Vidya AI</Text>
                  ) : null}
                  <View
                    style={[
                      styles.bubble,
                      msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                    ]}
                  >
                    <VidyaChatMessageText
                      text={String(msg.content || '')}
                      tone={msg.role === 'user' ? 'user' : 'assistant'}
                    />
                  </View>
                </View>
                {msg.role === 'user' ? (
                  <View style={styles.userAvatar}>
                    <Text style={styles.userInitial}>{model.userInitial}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}

          {model.isPending ? (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <VidyaAvatar size={28} borderColor="#bae6fd" borderWidth={1} />
              <View style={[styles.bubble, styles.bubbleAssistant, styles.thinkingBubble]}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.thinkingText}>Vidya is thinking…</Text>
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Composer pinned in layout flow (web pattern), with keyboard lift padding on iOS */}
      <View style={{ paddingBottom: Platform.OS === 'ios' ? keyboardLift : 0 }}>
        <ChatComposer
          placeholder={model.inputPlaceholder}
          isPending={model.isPending}
          isListening={model.isListening}
          bottomInset={composerBottomPad}
          showVoice={false}
          onSend={handleSend}
          onPickImage={model.pickAndAnalyzeImage}
          onVoice={model.handleVoiceInput}
          onHeightChange={undefined}
          onFocusInput={() => {
            captureBaseline();
            setTimeout(() => scrollToBottom(true), 120);
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  rootEmbedded: {
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: '#F0F9FF',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
    backgroundColor: '#E0F2FE',
  },
  embeddedChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
    backgroundColor: '#FFFFFF',
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#0C4A6E' },
  headerSub: { fontSize: 11, color: '#0369A1', marginTop: 1 },
  insightsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  insightsChipText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  notifications: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  focusCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  focusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  focusAction: { fontSize: 12, fontWeight: '700', color: '#78350f', marginTop: 2 },
  focusReason: { fontSize: 11, color: '#92400e', marginTop: 2 },
  streakCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#6ee7b7',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  streakText: { fontSize: 11, fontWeight: '600', color: '#047857' },
  proactiveCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#7DD3FC',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  proactiveText: { fontSize: 11, color: '#0C4A6E', lineHeight: 16 },
  mainScroll: { flex: 1, minHeight: 0 },
  mainScrollContent: { flexGrow: 1 },
  messagesBlock: { padding: 12 },
  starterBlock: { paddingVertical: 8 },
  starterTitle: { fontSize: 15, fontWeight: '700', color: '#0C4A6E', textAlign: 'center' },
  starterSub: { marginTop: 4, fontSize: 12, color: '#64748b', textAlign: 'center' },
  starterGrid: { marginTop: 12, gap: 8 },
  starterCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  starterCardText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAssistant: { justifyContent: 'flex-start' },
  bubbleColumn: {
    maxWidth: '82%',
    minWidth: 0,
    flexShrink: 1,
  },
  assistantLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 4,
    marginLeft: 2,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: { fontSize: 11, fontWeight: '700', color: '#fff' },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexShrink: 1,
    minWidth: 44,
    // Extra right padding — Android OEM fonts clip the last glyph in hug-fit bubbles
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 18,
    borderRadius: 14,
    overflow: 'visible',
  },
  bubbleUser: {
    backgroundColor: '#0284C7',
    borderBottomRightRadius: 4,
    alignSelf: 'flex-end',
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  thinkingText: { fontSize: 13, color: '#64748b' },
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: '#bae6fd',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#7DD3FC',
    backgroundColor: '#FFFFFF',
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    maxHeight: 110,
    fontSize: 16,
    lineHeight: 22,
    color: '#0f172a',
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingLeft: 6,
    // Room so placeholder / last typed char is not clipped beside the send button
    paddingRight: 16,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.45 },
});
