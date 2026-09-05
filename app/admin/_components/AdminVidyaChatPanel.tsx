import { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useVidyaChat } from '../../../src/hooks/useVidyaChat';
import { useKeyboardDockLift } from '../../../src/hooks/useKeyboardDockLift';
import { withAndroidTextSafeEnd } from '../../../src/lib/vidya-subjects';
import type { AIChatContext } from '../../../src/types/vidya';
import { useAdminTheme } from '../_ui/useAdminTheme';
import AdminScalePressable from '../_ui/AdminScalePressable';
import VidyaAvatar from '../../../src/components/vidya/VidyaAvatar';

type Props = {
  adminId: string;
  adminName: string;
};

/**
 * Messages scroll; header + composer stay fixed above the in-flow tab bar.
 */
export default function AdminVidyaChatPanel({ adminId, adminName }: Props) {
  const { colors, radius, spacing } = useAdminTheme();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const { keyboardLift, keyboardOpen, captureBaseline } = useKeyboardDockLift();

  const chatContext = useMemo<AIChatContext>(
    () => ({
      studentName: adminName,
      currentSubject: 'Administration',
    }),
    [adminName]
  );

  const model = useVidyaChat({
    userId: adminId,
    role: 'admin',
    context: chatContext,
  });

  const starterPrompts = model.quickQuestions.slice(0, 4);

  const scrollToBottom = (animated = true) => {
    scrollRef.current?.scrollToEnd({ animated });
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [model.displayMessages, model.isPending, keyboardLift]);

  if (model.isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading Chat...</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.root}
      onLayout={() => {
        if (!keyboardOpen) captureBaseline();
      }}
    >
      <View style={[styles.header, { borderBottomColor: colors.surfaceBorder, paddingHorizontal: spacing.md }]}>
        <View style={styles.headerLeft}>
          <VidyaAvatar size={40} borderColor="#fdba74" />
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Vidya AI</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Admin Assistant</Text>
          </View>
        </View>
        <AdminScalePressable
          style={[
            styles.clearBtn,
            {
              backgroundColor: colors.dangerMuted,
              borderRadius: radius.sm,
              opacity: model.isPending || model.isClearingChat || model.displayMessages.length === 0 ? 0.4 : 1,
            },
          ]}
          onPress={model.clearChat}
          disabled={model.isPending || model.isClearingChat || model.displayMessages.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Clear chat history"
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </AdminScalePressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={[styles.messagesContent, { paddingHorizontal: spacing.md }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {model.displayMessages.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Ask about students, teachers, exams, attendance, or school reports.
            </Text>
            <View style={styles.promptGrid}>
              {starterPrompts.map((question) => (
                <AdminScalePressable
                  key={question}
                  style={[
                    styles.promptCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radius.md,
                    },
                  ]}
                  onPress={() => model.onPromptClick(question)}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
                  <Text style={[styles.promptText, { color: colors.textSecondary }]}>{question}</Text>
                </AdminScalePressable>
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
                <View style={[styles.avatarAssistant, { backgroundColor: colors.primaryMuted }]}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                </View>
              ) : null}
              {msg.role === 'user' ? (
                <LinearGradient
                  colors={[...colors.fabGradient]}
                  style={[styles.bubble, styles.bubbleUser, { borderRadius: radius.lg }]}
                >
                  <Text style={[styles.bubbleText, styles.bubbleTextUser]}>
                    {withAndroidTextSafeEnd(model.formatMessage(msg.content))}
                  </Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.bubble,
                    styles.bubbleAssistant,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      borderRadius: radius.lg,
                    },
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: colors.text }]}>
                    {withAndroidTextSafeEnd(model.formatMessage(msg.content))}
                  </Text>
                </View>
              )}
              {msg.role === 'user' ? (
                <LinearGradient
                  colors={[...colors.fabGradient]}
                  style={[styles.avatarUser, { borderRadius: radius.full }]}
                >
                  <Text style={styles.avatarUserText}>{model.userInitial}</Text>
                </LinearGradient>
              ) : null}
            </View>
          ))
        )}
        {model.isPending ? (
          <View style={[styles.messageRow, styles.messageRowAssistant]}>
            <View style={[styles.avatarAssistant, { backgroundColor: colors.primaryMuted }]}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
            </View>
            <View
              style={[
                styles.bubble,
                styles.bubbleAssistant,
                styles.thinkingBubble,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderRadius: radius.lg },
              ]}
            >
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Docked composer — stays put; tab bar sits below in dashboard layout. */}
      <View
        style={[
          styles.composerDock,
          {
            paddingHorizontal: spacing.md,
            paddingBottom: 8 + keyboardLift,
            borderTopColor: colors.surfaceBorder,
            backgroundColor: 'transparent',
          },
        ]}
      >
        <View style={styles.inputBar}>
          <View
            style={[
              styles.inputShell,
              {
                backgroundColor: '#FFFFFF',
                borderColor: colors.inputBorder,
                borderRadius: radius.md,
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              value={model.message}
              onChangeText={model.setMessage}
              placeholder={model.inputPlaceholder}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={2000}
              editable={!model.isPending}
              cursorColor={colors.primary}
              selectionColor={`${colors.primary}40`}
              textAlignVertical="top"
              underlineColorAndroid="transparent"
              importantForAutofill="no"
              onFocus={() => {
                captureBaseline();
                setTimeout(() => scrollToBottom(true), 120);
              }}
            />
          </View>
          <AdminScalePressable
            style={[
              styles.sendBtn,
              {
                borderRadius: radius.md,
                backgroundColor: !model.message.trim() || model.isPending ? colors.textMuted : colors.primary,
              },
            ]}
            onPress={() => {
              inputRef.current?.blur();
              model.handleSendMessage();
            }}
            disabled={!model.message.trim() || model.isPending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {model.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </AdminScalePressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingTop: 4,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 11, marginTop: 1 },
  clearBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesScroll: { flex: 1, minHeight: 0 },
  messagesContent: { paddingVertical: 16, flexGrow: 1 },
  emptyBlock: { paddingTop: 8, marginBottom: 16 },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  promptGrid: { gap: 8 },
  promptCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    padding: 12,
  },
  promptText: { flex: 1, fontSize: 13, lineHeight: 18 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowAssistant: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    flexShrink: 1,
    minWidth: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    // Extra right pad so Fabric does not clip the last glyph on short bubbles.
    paddingRight: 18,
    overflow: 'visible',
  },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAssistant: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 22,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  bubbleTextUser: { color: '#fff' },
  avatarUser: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUserText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  avatarAssistant: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingBubble: { paddingVertical: 14, paddingHorizontal: 18 },
  composerDock: {
    flexShrink: 0,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputShell: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    maxHeight: 110,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'visible',
  },
  input: {
    width: '100%',
    minHeight: 52,
    maxHeight: 110,
    paddingHorizontal: 14,
    // Extra right pad so the caret + last glyph are never clipped.
    paddingRight: 22,
    paddingTop: Platform.OS === 'android' ? 16 : 14,
    paddingBottom: Platform.OS === 'android' ? 16 : 14,
    margin: 0,
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  sendBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
