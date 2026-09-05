import type { Ionicons } from '@expo/vector-icons';

export type AiToolIcon = {
  emoji: string;
  ionicon: keyof typeof Ionicons.glyphMap;
};

const DEFAULT_ICON: AiToolIcon = { emoji: '✨', ionicon: 'sparkles' };

/** Per-tool hero icons — used in native viewers and WebView HTML output. */
export const AI_TOOL_ICONS: Record<string, AiToolIcon> = {
  'activity-project-generator': { emoji: '✨', ionicon: 'sparkles' },
  'worksheet-mcq-generator': { emoji: '📝', ionicon: 'document-text' },
  'concept-mastery-helper': { emoji: '💡', ionicon: 'bulb' },
  'lesson-planner': { emoji: '📅', ionicon: 'calendar' },
  'exam-question-paper-generator': { emoji: '📄', ionicon: 'help-circle' },
  'daily-class-plan-maker': { emoji: '✅', ionicon: 'checkbox-outline' },
  'homework-creator': { emoji: '🚀', ionicon: 'rocket' },
  'story-passage-creator': { emoji: '📖', ionicon: 'book-outline' },
  'short-notes-summaries-maker': { emoji: '📋', ionicon: 'layers' },
  'flashcard-generator': { emoji: '🃏', ionicon: 'card' },
  'smart-study-guide-generator': { emoji: '📚', ionicon: 'bookmark-outline' },
  'concept-breakdown-explainer': { emoji: '💡', ionicon: 'bulb-outline' },
  'smart-qa-practice-generator': { emoji: '❓', ionicon: 'help-circle-outline' },
  'chapter-summary-creator': { emoji: '📑', ionicon: 'document-text-outline' },
  'key-points-formula-extractor': { emoji: '🔑', ionicon: 'key-outline' },
  'quick-assignment-builder': { emoji: '📋', ionicon: 'clipboard-outline' },
  'my-study-decks': { emoji: '🃏', ionicon: 'albums-outline' },
  'mock-test-builder': { emoji: '✅', ionicon: 'checkmark-circle-outline' },
  'project-idea-lab': { emoji: '🧪', ionicon: 'grid-outline' },
  'reading-practice-room': { emoji: '📖', ionicon: 'document-outline' },
  'study-schedule-maker': { emoji: '📅', ionicon: 'calendar-outline' },
  'ai-chat': { emoji: '💬', ionicon: 'chatbubble-outline' },
};

export function getAiToolIcon(toolType: string): AiToolIcon {
  return AI_TOOL_ICONS[toolType] ?? DEFAULT_ICON;
}

export function getAiToolHeroEmoji(toolType: string): string {
  return getAiToolIcon(toolType).emoji;
}

export function getAiToolIonicon(toolType: string): keyof typeof Ionicons.glyphMap {
  return getAiToolIcon(toolType).ionicon;
}
