import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVidyaChat } from '../../../src/hooks/useVidyaChat';
import { useKeyboardDockLift } from '../../../src/hooks/useKeyboardDockLift';
import { withAndroidTextSafeEnd } from '../../../src/lib/vidya-subjects';
import type { AIChatContext } from '../../../src/types/vidya';
import VidyaAvatar from '../../../src/components/vidya/VidyaAvatar';

type Props = {
  userId?: string;
};

export default function SuperAdminVidyaChatPanel({ userId = 'super-admin' }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [composerHeight, setComposerHeight] = useState(64);
  const { keyboardLift, keyboardOpen, captureBaseline } = useKeyboardDockLift();

  const chatContext = useMemo<AIChatContext>(
    () => ({
      studentName: 'Super Admin',
      currentSubject: 'System Control',
    }),
    [],
  );

  const model = useVidyaChat({
    userId,
    role: 'super_admin',
    context: chatContext,
  });

  const scrollToBottom = (animated = true) => {
    scrollRef.current?.scrollToEnd({ animated });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [model.displayMessages, model.isPending, keyboardLift]);

  if (model.isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.loadingText}>Loading Vidya AI…</Text>
      </View>
    );
  }

  const canClear =
    !model.isPending && !model.isClearingChat && model.displayMessages.length > 0;
  const composerBottomPad = keyboardOpen ? 8 : 10;

  return (
    <View
      style={styles.root}
      onLayout={() => {
        if (!keyboardOpen) captureBaseline();
      }}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <VidyaAvatar size={36} borderColor="#fdba74" />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Vidya AI</Text>
            <Text style={styles.headerSub}>Platform Metrics Assistant</Text>
          </View>
        </View>
        <Pressable
          style={[styles.clearBtn, !canClear && styles.clearBtnDisabled]}
          onPress={model.clearChat}
          disabled={!canClear}
        >
          <Ionicons name="trash-outline" size={16} color="#ea580c" />
          <Text style={styles.clearBtnText}>
            {model.isClearingChat ? 'Clearing…' : 'Clear'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: composerHeight + keyboardLift + 12 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {model.displayMessages.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyTitle}>Ask About Platform Metrics</Text>
            <Text style={styles.emptyText}>
              Students, teachers, exams, attendance, and AI usage — answered from live data.
            </Text>
            <View style={styles.promptGrid}>
              {model.quickQuestions.map((question) => (
                <Pressable
                  key={question}
                  style={styles.promptCard}
                  onPress={() => model.onPromptClick(question)}
                >
                  <Text style={styles.promptText}>{question}</Text>
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
              <View
                style={[
                  styles.avatar,
                  msg.role === 'user' ? styles.avatarUser : styles.avatarAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.avatarText,
                    msg.role === 'assistant' && styles.avatarTextAssistant,
                  ]}
                >
                  {msg.role === 'user' ? model.userInitial : 'AI'}
                </Text>
              </View>
              <View
                style={[
                  styles.bubble,
                  msg.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant,
                  ]}
                >
                  {/* Trailing hair-space: Android otherwise clips the last glyph. */}
                  {withAndroidTextSafeEnd(model.formatMessage(msg.content))}
                </Text>
              </View>
            </View>
          ))
        )}
        {model.isPending ? (
          <View style={[styles.messageRow, styles.messageRowAssistant]}>
            <View style={[styles.avatar, styles.avatarAssistant]}>
              <Text style={styles.avatarTextAssistant}>AI</Text>
            </View>
            <View style={[styles.bubble, styles.bubbleAssistant, styles.thinkingBubble]}>
              <ActivityIndicator size="small" color="#f97316" />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={[styles.composerDock, { bottom: keyboardLift }]}
        onLayout={(e) => setComposerHeight(Math.ceil(e.nativeEvent.layout.height))}
      >
        <View style={[styles.inputBar, { paddingBottom: composerBottomPad }]}>
          <View style={styles.inputWrap}>
            <View style={styles.inputShell}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={model.message}
                onChangeText={model.setMessage}
                placeholder="Ask about students, teachers, exams…"
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={2000}
                editable={!model.isPending}
                cursorColor="#f97316"
                selectionColor="rgba(249, 115, 22, 0.28)"
                textAlignVertical="top"
                blurOnSubmit={false}
                underlineColorAndroid="transparent"
                importantForAutofill="no"
                onFocus={() => {
                  captureBaseline();
                  setTimeout(() => scrollToBottom(true), 120);
                }}
              />
            </View>
            <Pressable
              style={[
                styles.sendBtn,
                (!model.message.trim() || model.isPending) && styles.sendBtnDisabled,
              ]}
              onPress={() => {
                // Blur first so Android IME commits the composing last character.
                inputRef.current?.blur();
                model.handleSendMessage();
              }}
              disabled={!model.message.trim() || model.isPending}
            >
              {model.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    // Do not use overflow:'hidden' here — it clips the last glyph in bubbles/inputs on Android.
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  loadingText: { fontSize: 14, color: '#64748b' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#fdba74',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff7ed',
  },
  clearBtnDisabled: { opacity: 0.4 },
  clearBtnText: { fontSize: 12, fontWeight: '600', color: '#ea580c' },
  messagesScroll: { flex: 1, minHeight: 0, backgroundColor: '#FFFFFF' },
  messagesContent: { padding: 14, flexGrow: 1 },
  emptyBlock: { paddingTop: 8 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  promptGrid: { gap: 8 },
  promptCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  promptText: { fontSize: 13, color: '#334155', lineHeight: 18 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  messageRowUser: { flexDirection: 'row-reverse' },
  messageRowAssistant: {},
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUser: { backgroundColor: '#334155' },
  avatarAssistant: { backgroundColor: '#ffedd5' },
  avatarText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  avatarTextAssistant: { color: '#c2410c', fontSize: 11, fontWeight: '700' },
  bubble: {
    maxWidth: '78%',
    flexShrink: 1,
    minWidth: 44,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    // Extra right pad so Fabric does not clip the last glyph on short bubbles.
    paddingRight: 18,
    overflow: 'visible',
  },
  bubbleUser: { backgroundColor: '#334155', borderBottomRightRadius: 4 },
  bubbleAssistant: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 22,
    // Do not flexShrink Text — Android will clip the last character.
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  bubbleTextUser: { color: '#fff' },
  bubbleTextAssistant: { color: '#1e293b' },
  thinkingBubble: { paddingVertical: 14, paddingHorizontal: 18 },
  composerDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputShell: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'visible',
  },
  input: {
    width: '100%',
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 14,
    // Extra right pad so the caret + last glyph are never clipped.
    paddingRight: 22,
    paddingVertical: Platform.OS === 'ios' ? 10 : 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#0f172a',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
