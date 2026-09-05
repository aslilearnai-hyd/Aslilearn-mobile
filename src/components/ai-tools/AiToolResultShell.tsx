import type { ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AiToolPremiumIcon from './AiToolPremiumIcon';
import { getAiToolIonicon } from '../../lib/ai-tool-icons';
import {
  getAiToolResultTheme,
  type AiToolResultMeta,
} from '../../lib/ai-tool-result-theme';
import { AI, AI_RADIUS, AI_TYPE } from '../../theme/ai';
import { formatAiToolText } from '../../lib/title-case';

type MetaChipProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
};

function MetaChip({ icon, label, value, chipBg, chipBorder, chipText }: MetaChipProps) {
  if (!value.trim()) return null;
  return (
    <View
      style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Ionicons name={icon} size={13} color={chipText} />
      <Text style={[styles.chipLabel, { color: chipText }]}>{formatAiToolText(label)}</Text>
      <Text style={[styles.chipValue, { color: chipText }]} numberOfLines={1}>
        {formatAiToolText(value)}
      </Text>
    </View>
  );
}

type Props = {
  toolType?: string;
  toolName: string;
  toolDescription?: string;
  meta?: AiToolResultMeta;
  actions?: ReactNode;
  citations?: ReactNode;
  isLoading?: boolean;
  empty?: ReactNode;
  children?: ReactNode;
  accent?: string;
  variant?: 'student' | 'teacher';
  /** Fill remaining screen height so child WebView can own vertical scroll. */
  fill?: boolean;
};

/** Compact AI tool result chrome — sky/teal surfaces, clearer hierarchy. */
export default function AiToolResultShell({
  toolType = '',
  toolName,
  toolDescription,
  meta,
  actions,
  citations,
  isLoading,
  empty,
  children,
  accent,
  variant: _variant = 'student',
  fill = false,
}: Props) {
  const theme = getAiToolResultTheme(toolType);
  const heroColor = accent || theme.badgeText || '#0369A1';
  const board = String(meta?.board || '').trim();
  const classLabel = String(meta?.classLabel || '').trim();
  const subject = String(meta?.subject || '').trim();
  const chapter = String(meta?.chapter || '').trim();
  const subtopic = String(meta?.subtopic || '').trim();
  const hasMeta = Boolean(board || classLabel || subject || chapter || subtopic);
  const hasResult = Boolean(children) && !isLoading;
  const displayToolName = formatAiToolText(toolName);
  const displayToolDescription = toolDescription ? formatAiToolText(toolDescription) : undefined;
  const showTitleRow = !hasResult;

  return (
    <View style={[styles.outer, fill && styles.outerFill]}>
      {showTitleRow || actions ? (
      <View style={[styles.header, !showTitleRow && styles.headerActionsOnly]}>
        {showTitleRow ? (
        <View style={styles.headerMain}>
          <View style={[styles.iconBox, { borderColor: `${heroColor}44`, backgroundColor: '#F0F9FF' }]}>
            <AiToolPremiumIcon
              name={getAiToolIonicon(toolType)}
              color={heroColor}
              size={44}
              iconSize={22}
            />
          </View>
          <View style={styles.headerText}>
            <View style={styles.titleRow}>
              <Text style={styles.toolName} numberOfLines={2}>
                {displayToolName}
              </Text>
              <View style={[styles.badge, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                <Ionicons name="sparkles" size={12} color="#0369A1" />
                <Text style={[styles.badgeText, { color: '#0369A1' }]}>
                  {formatAiToolText('AI Powered')}
                </Text>
              </View>
            </View>
            {displayToolDescription ? (
              <Text style={styles.description} numberOfLines={2}>
                {displayToolDescription}
              </Text>
            ) : null}
            {citations}
          </View>
        </View>
        ) : citations ? (
          <View>{citations}</View>
        ) : null}
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      ) : null}

      {hasMeta && (hasResult || (!children && !isLoading)) ? (
        <ScrollView
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metaOrbit}
          style={styles.metaOrbitWrap}
          keyboardShouldPersistTaps="handled"
        >
          <MetaChip icon="school-outline" label="Board" value={board} {...theme} />
          <MetaChip icon="people-outline" label="Class" value={classLabel} {...theme} />
          <MetaChip icon="library-outline" label="Subject" value={subject} {...theme} />
          <MetaChip icon="book-outline" label="Chapter" value={chapter} {...theme} />
          <MetaChip icon="pricetag-outline" label="Subtopic" value={subtopic} {...theme} />
        </ScrollView>
      ) : null}

      <View style={[styles.contentArea, fill && styles.contentAreaFill]}>
        {isLoading ? (
          <View style={styles.loadingBox} accessibilityRole="progressbar" accessibilityLiveRegion="polite">
            <AiToolPremiumIcon name={getAiToolIonicon(toolType)} color={heroColor} size={64} iconSize={28} />
            <Text style={styles.loadingTitle}>{formatAiToolText('Creating your content')}</Text>
            <Text style={styles.loadingSub}>
              {formatAiToolText('Organising each section for a clear, classroom-ready result.')}
            </Text>
          </View>
        ) : children ? (
          <View style={[styles.resultBody, fill && styles.resultBodyFill]}>{children}</View>
        ) : (
          empty || (
            <View style={styles.emptyBox} accessibilityLiveRegion="polite">
              <Text style={styles.emptyTitle}>{formatAiToolText('Ready when you are')}</Text>
              <Text style={styles.emptyText}>
                {formatAiToolText('Choose curriculum filters above, then generate.')}
              </Text>
            </View>
          )
        )}
      </View>
    </View>
  );
}

/** Equal left/right inset for header, meta chips, and result card. */
const SHELL_GUTTER = 12;

const styles = StyleSheet.create({
  outer: {
    alignSelf: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: AI_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E0F2FE',
    overflow: 'hidden',
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  outerFill: {
    flex: 1,
    minHeight: 0,
    overflow: 'visible',
  },
  header: {
    paddingHorizontal: SHELL_GUTTER,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0F2FE',
    backgroundColor: '#F8FCFF',
    gap: 10,
  },
  headerActionsOnly: {
    paddingVertical: 10,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
  },
  headerText: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  toolName: { ...AI_TYPE.title, fontSize: 18, lineHeight: 24, color: AI.text, flexShrink: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  description: { marginTop: 4, ...AI_TYPE.body, fontSize: 13, color: AI.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaOrbitWrap: {
    maxHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0F2FE',
    backgroundColor: '#F0F9FF',
  },
  metaOrbit: {
    paddingHorizontal: SHELL_GUTTER,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 220,
    backgroundColor: '#FFFFFF',
  },
  chipLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  chipValue: { fontSize: 12, lineHeight: 14, fontWeight: '700', flexShrink: 1 },
  contentArea: {
    paddingVertical: SHELL_GUTTER,
    paddingHorizontal: SHELL_GUTTER,
    backgroundColor: '#F8FAFC',
  },
  contentAreaFill: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  resultBody: {
    // stretch + horizontal padding on parent — never width:100% with side margins
    // (that overflows and makes left/right gutters look unequal).
    alignSelf: 'stretch',
    paddingHorizontal: SHELL_GUTTER,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  resultBodyFill: {
    flex: 1,
    minHeight: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 10,
  },
  loadingTitle: { ...AI_TYPE.title, color: AI.text, textAlign: 'center' },
  loadingSub: { ...AI_TYPE.caption, color: AI.textMuted, textAlign: 'center', lineHeight: 18 },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyTitle: { ...AI_TYPE.title, marginBottom: 6, color: AI.text, textAlign: 'center' },
  emptyText: { ...AI_TYPE.body, color: AI.textMuted, textAlign: 'center' },
});
