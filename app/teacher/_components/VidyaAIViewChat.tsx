import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVidyaChat } from '../../../src/hooks/useVidyaChat';
import { useKeyboardDockLift } from '../../../src/hooks/useKeyboardDockLift';
import SubjectPickerModal from '../../../src/components/vidya/SubjectPickerModal';
import VidyaAvatar from '../../../src/components/vidya/VidyaAvatar';
import VidyaChatMessageText from '../../../src/components/vidya/VidyaChatMessageText';
import type { AIChatContext, TeachingTab } from '../../../src/types/vidya';
import { TEACHER, TEACHER_RADIUS, TEACHER_SPACING, glassCard } from '../../../src/theme/teacher';
import { GlassPanel } from '../../../src/components/ui';

function ThinkingDots() {
  const dots = [0, 1, 2];
  return (
    <View style={styles.thinkingDots}>
      {dots.map((i) => (
        <ThinkingDot key={i} delay={i * 120} />
      ))}
    </View>
  );
}

function ThinkingDot({ delay }: { delay: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 350 }),
          withTiming(0, { duration: 350 }),
        ),
        -1,
        false,
      ),
    );
  }, [y, delay]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.thinkingDot, style]} />;
}

function SendButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePress = () => {
    scale.value = withSpring(0.8, { damping: 10, stiffness: 400 });
    setTimeout(() => {
      scale.value = withSpring(1.2, { damping: 8, stiffness: 400 });
      setTimeout(() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }, 80);
    }, 80);
    onPress();
  };
  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View style={scaleStyle}>
        <LinearGradient
          colors={disabled ? [TEACHER.surfaceElevated, TEACHER.surfaceElevated] : [TEACHER.primary, TEACHER.primaryDark]}
          style={[styles.sendButton, disabled && styles.sendButtonDisabled]}
        >
          <Ionicons
            name="send"
            size={18}
            color={disabled ? TEACHER.textMuted : TEACHER.textOnPrimary}
          />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const TEACHING_MODES: Record<
  TeachingTab,
  {
    label: string;
    quickA: { label: string; prompt: string };
    quickB: { label: string; prompt: string };
  }
> = {
  lesson: {
    label: 'Lesson',
    quickA: { label: 'Plan Lesson', prompt: 'Create a 45-minute lesson plan with learning outcomes and activities.' },
    quickB: { label: 'Explain Topic', prompt: 'Explain this topic with examples and misconceptions to avoid.' },
  },
  quiz: {
    label: 'Quiz',
    quickA: { label: 'Create Quiz', prompt: 'Generate 10 MCQs with answers, bloom level, and difficulty tags.' },
    quickB: { label: 'Worksheet', prompt: 'Create a worksheet with 3 easy, 3 medium, and 2 challenge questions.' },
  },
  help: {
    label: 'Help',
    quickA: { label: 'Engagement', prompt: 'Suggest practical strategies to improve classroom engagement.' },
    quickB: { label: 'Mixed Ability', prompt: 'How should I support mixed-ability learners in this lesson?' },
  },
};


interface VidyaAIViewChatProps {
  teacherId: string;
  teacherName?: string;
  subject?: string;
  subjectOptions?: string[];
  fullPage?: boolean;
  standalone?: boolean;
}

export default function VidyaAIViewChat({
  teacherId,
  teacherName,
  subject,
  subjectOptions = [],
  fullPage = false,
  standalone = false,
}: VidyaAIViewChatProps) {
  const insets = useSafeAreaInsets();
  const [teachingTab, setTeachingTab] = useState<TeachingTab>('lesson');
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [composerHeight, setComposerHeight] = useState(64);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const { keyboardLift, keyboardOpen, captureBaseline } = useKeyboardDockLift();

  const chatContext = useMemo<AIChatContext>(
    () => ({
      studentName: teacherName || 'Teacher',
      currentSubject: subject || subjectOptions[0] || 'General',
      subjectOptions: subjectOptions.length > 0 ? subjectOptions : subject ? [subject] : ['General'],
      teacherMode: teachingTab,
    }),
    [teacherName, subject, subjectOptions, teachingTab]
  );

  const model = useVidyaChat({
    userId: teacherId,
    role: 'teacher',
    context: chatContext,
  });

  const mode = TEACHING_MODES[teachingTab];
  const composerBottomPad = keyboardOpen ? 8 : Math.max(insets.bottom, TEACHER_SPACING.sm);
  const showSubjectPicker = model.subjectOptions.length > 1;
  /** The opaque dock rounds itself instead of the card clipping it. */
  const cardRadius = fullPage || standalone ? 0 : TEACHER_RADIUS.lg;

  const canClearChat =
    !model.isPending && !model.isClearingChat && model.displayMessages.length > 0;

  const confirmClearChat = () => {
    if (!canClearChat) return;
    Alert.alert('Clear Chat', 'This will delete the conversation history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: model.clearChat },
    ]);
  };

  const scrollToBottom = (animated = true) => {
    scrollViewRef.current?.scrollToEnd({ animated });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [model.displayMessages, model.isPending, keyboardLift]);

  if (model.isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={TEACHER.primaryLight} />
      </View>
    );
  }

  return (
    <View style={[styles.chatRoot, fullPage && styles.chatRootFull, standalone && styles.chatRootStandalone]}>
      <View style={styles.chrome}>
        <View style={styles.modeTabs}>
          {(Object.keys(TEACHING_MODES) as TeachingTab[]).map((tab) => {
            const active = teachingTab === tab;
            return (
              <Pressable key={tab} onPress={() => setTeachingTab(tab)} style={styles.modeTabPress}>
                {active ? (
                  <LinearGradient
                    colors={[TEACHER.primary, TEACHER.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.modeTab, styles.modeTabActive]}
                  >
                    <Text style={[styles.modeTabText, styles.modeTabTextActive]}>
                      {TEACHING_MODES[tab].label}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.modeTab}>
                    <Text style={styles.modeTabText}>{TEACHING_MODES[tab].label}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.quickRow}>
          <Pressable
            style={styles.subjectBadge}
            onPress={() => showSubjectPicker && setSubjectPickerOpen(true)}
            disabled={!showSubjectPicker}
          >
            <Text style={styles.subjectBadgeText}>{model.currentSubject}</Text>
            {showSubjectPicker ? (
              <Ionicons name="chevron-down" size={12} color={TEACHER.primaryLight} />
            ) : null}
          </Pressable>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.quickChipsScroll}
            contentContainerStyle={styles.quickChips}
          >
            <Pressable style={styles.quickChip} onPress={() => model.onPromptClick(mode.quickA.prompt)}>
              <Text style={styles.quickChipText}>{mode.quickA.label}</Text>
            </Pressable>
            <Pressable style={styles.quickChip} onPress={() => model.onPromptClick(mode.quickB.prompt)}>
              <Text style={styles.quickChipText}>{mode.quickB.label}</Text>
            </Pressable>
          </ScrollView>
          <Pressable
            onPress={confirmClearChat}
            disabled={!canClearChat}
            style={[styles.clearChatBtn, !canClearChat && styles.clearChatBtnDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Clear Chat"
          >
            <Ionicons name="trash-outline" size={15} color={TEACHER.danger} />
            <Text style={styles.clearChatText}>Clear Chat</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.mainScroll}
        contentContainerStyle={[
          styles.mainScrollContent,
          { paddingBottom: composerHeight + keyboardLift + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bounces
      >
        <View style={styles.messagesBlock}>
          {model.displayMessages.length === 0 ? (
            <View style={styles.starterBlock}>
              <Text style={styles.starterTitle}>Start With A Teaching Prompt</Text>
              <Text style={styles.starterSub}>Tap a suggestion below or type your own question.</Text>
              <View style={styles.starterGrid}>
                {model.quickQuestions.map((question) => (
                  <Pressable
                    key={question}
                    onPress={() => model.onPromptClick(question)}
                  >
                    <GlassPanel style={styles.starterCard} radius={TEACHER_RADIUS.md} tone="strong">
                      <Text style={styles.starterCardText}>{question}</Text>
                    </GlassPanel>
                  </Pressable>
                ))}
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
                  <VidyaAvatar size={28} borderColor="#93c5fd" borderWidth={1} />
                ) : null}
                {msg.role === 'user' ? (
                  <LinearGradient
                    colors={[TEACHER.primary, TEACHER.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bubble, styles.bubbleUser]}
                  >
                    <VidyaChatMessageText
                      text={model.formatMessage(msg.content)}
                      tone="user"
                      style={styles.bubbleTextUser}
                    />
                  </LinearGradient>
                ) : (
                  <GlassPanel style={[styles.bubble, styles.bubbleAssistant]} radius={16} tone="strong">
                    <VidyaChatMessageText
                      text={model.formatMessage(msg.content)}
                      tone="assistant"
                      style={styles.bubbleText}
                    />
                  </GlassPanel>
                )}
                {msg.role === 'user' ? (
                  <View style={styles.avatarUser}>
                    <Text style={styles.avatarInitial}>{model.userInitial}</Text>
                  </View>
                ) : null}
              </View>
            ))
          )}

          {model.isPending ? (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <VidyaAvatar size={28} borderColor="#93c5fd" borderWidth={1} />
              <GlassPanel style={[styles.bubble, styles.bubbleAssistant]} radius={16} tone="strong">
                <View style={styles.thinkingBubbleRow}>
                  <ThinkingDots />
                </View>
              </GlassPanel>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.composerDock,
          {
            bottom: keyboardLift,
            borderBottomLeftRadius: keyboardLift > 0 ? 0 : cardRadius,
            borderBottomRightRadius: keyboardLift > 0 ? 0 : cardRadius,
          },
        ]}
        onLayout={(e) => setComposerHeight(Math.ceil(e.nativeEvent.layout.height))}
      >
        <View style={[styles.inputBar, { paddingBottom: composerBottomPad }]}>
          <View style={styles.inputWrap}>
            <Pressable style={styles.iconBtn} onPress={model.pickAndAnalyzeImage} disabled={model.isPending}>
              <Ionicons name="image-outline" size={20} color={TEACHER.textMuted} />
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={model.handleVoiceInput}
              disabled={model.isPending || model.isListening}
            >
              <Ionicons
                name="mic-outline"
                size={20}
                color={model.isListening ? '#ef4444' : TEACHER.textMuted}
              />
            </Pressable>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={model.message}
              onChangeText={model.setMessage}
              placeholder={model.inputPlaceholder}
              placeholderTextColor={TEACHER.textMuted}
              multiline
              maxLength={2000}
              editable={!model.isPending}
              textAlignVertical="top"
              underlineColorAndroid="transparent"
              onFocus={() => {
                captureBaseline();
                setTimeout(() => scrollToBottom(true), 120);
              }}
            />
            <SendButton
              disabled={model.isPending || !model.message.trim()}
              onPress={() => {
                // Commit composing glyph on Android before reading draft
                inputRef.current?.blur();
                const delay = Platform.OS === 'android' ? 120 : 0;
                setTimeout(() => model.handleSendMessage(), delay);
              }}
            />
          </View>
        </View>
      </View>

      <SubjectPickerModal
        visible={subjectPickerOpen}
        subjects={model.subjectOptions}
        selected={model.currentSubject}
        onSelect={model.setSelectedSubject}
        onClose={() => setSubjectPickerOpen(false)}
        accentColor={TEACHER.primaryLight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minHeight: 0 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Transparent so AppBackground's artwork shows through.
    backgroundColor: 'transparent',
  },
  chatRoot: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: TEACHER_SPACING.lg,
    marginTop: TEACHER_SPACING.md,
    marginBottom: TEACHER_SPACING.sm,
    borderRadius: TEACHER_RADIUS.lg,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    // Transparent so AppBackground's artwork shows through.
    backgroundColor: 'transparent',
    // No overflow:'hidden' — it clips the last glyph in bubbles/inputs on Android
    // and eats the composer's elevation shadow. The dock rounds its own corners.
  },
  chatRootFull: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: '#F4F7FB',
  },
  chatRootStandalone: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 0,
    borderWidth: 0,
    backgroundColor: '#F4F7FB',
  },
  composerDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
    backgroundColor: TEACHER.surface,
  },
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surface,
    paddingHorizontal: TEACHER_SPACING.md,
    paddingTop: TEACHER_SPACING.sm,
  },
  chrome: {
    flexShrink: 0,
    backgroundColor: '#F4F7FB',
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
    paddingTop: TEACHER_SPACING.md,
  },
  modeTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: TEACHER_SPACING.md,
    marginBottom: TEACHER_SPACING.md,
  },
  modeTabPress: {
    flex: 1,
    minWidth: 0,
  },
  modeTab: {
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: TEACHER_RADIUS.full,
    backgroundColor: TEACHER.surface,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearChatBtn: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: TEACHER_RADIUS.full,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
  },
  clearChatBtnDisabled: {
    opacity: 0.4,
  },
  clearChatText: {
    fontSize: 11,
    fontWeight: '700',
    color: TEACHER.danger,
  },
  modeTabActive: {
    borderColor: TEACHER.primary,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEACHER.textMuted,
  },
  modeTabTextActive: {
    color: TEACHER.textOnPrimary,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: TEACHER_SPACING.md,
    paddingTop: TEACHER_SPACING.sm,
    paddingBottom: TEACHER_SPACING.md,
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: TEACHER_RADIUS.full,
    backgroundColor: TEACHER.navActiveBg,
    borderWidth: 1,
    borderColor: TEACHER.primary,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: TEACHER.primaryLight,
    maxWidth: 100,
  },
  quickChipsScroll: {
    flex: 1,
    minWidth: 0,
  },
  quickChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickChip: {
    ...glassCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: TEACHER_RADIUS.chip,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: TEACHER.primaryLight,
  },
  messages: {
    flex: 1,
    minHeight: 0,
  },
  mainScroll: {
    flex: 1,
    minHeight: 0,
  },
  mainScrollContent: {
    paddingBottom: TEACHER_SPACING.xl,
  },
  messagesBlock: {
    padding: TEACHER_SPACING.lg,
  },
  messagesContent: {
    padding: TEACHER_SPACING.lg,
  },
  starterBlock: {
    marginBottom: TEACHER_SPACING.lg,
  },
  starterTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TEACHER.text,
    textAlign: 'center',
  },
  starterSub: {
    marginTop: 6,
    fontSize: 13,
    color: TEACHER.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  starterGrid: {
    marginTop: TEACHER_SPACING.lg,
    gap: TEACHER_SPACING.sm,
  },
  starterCard: {
    padding: TEACHER_SPACING.md,
    borderRadius: TEACHER_RADIUS.md,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  starterCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEACHER.textSecondary,
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: TEACHER_SPACING.md,
    gap: 8,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  avatarAssistant: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEACHER.navActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
  avatarUser: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TEACHER.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 11,
    fontWeight: '700',
    color: TEACHER.textOnPrimary,
  },
  bubble: {
    maxWidth: '78%',
    flexShrink: 1,
    minWidth: 44,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 20,
    borderRadius: 16,
    overflow: 'visible',
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
  },
  bubbleAssistant: {
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    borderBottomLeftRadius: 4,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 22,
    color: TEACHER.text,
  },
  bubbleTextUser: {
    color: TEACHER.textOnPrimary,
  },
  thinkingBubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  thinkingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEACHER.primaryLight,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
    backgroundColor: TEACHER.surface,
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 6,
    overflow: 'visible',
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
    maxHeight: 100,
    fontSize: 15,
    lineHeight: 22,
    color: TEACHER.text,
    paddingVertical: 8,
    paddingHorizontal: 10,
    paddingRight: 16,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    borderWidth: 1,
    borderColor: TEACHER.surfaceBorder,
  },
});
