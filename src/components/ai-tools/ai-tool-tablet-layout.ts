import { StyleSheet, useWindowDimensions } from 'react-native';
import { useIsTablet } from '../../hooks/useIsTablet';
import { AI_SPACING } from '../../theme/ai';

export const AI_TOOL_TABLET_MIN = 768;
export const AI_TOOL_SPLIT_MAX_WIDTH = 1200;
export const AI_TOOL_DIGITAL_BOARD_MIN_WIDTH = 1024;
export const AI_TOOL_TABLET_FONT_SCALE = 1.28;
export const AI_TOOL_OUTPUT_TABLET_SCALE = 1.18;
export const AI_TOOL_OUTPUT_BOARD_SCALE = 1.35;
export const AI_TOOL_PAGE_PAD_MOBILE = AI_SPACING.lg;
export const AI_TOOL_PAGE_PAD_TABLET = 28;

/** Native / WebView output — mobile baseline (px). */
export const AI_TOOL_OUTPUT_MOBILE = {
  body: 16,
  bodyLh: 24,
  small: 15,
  smallLh: 22,
  sectionTitle: 14,
  sectionNum: 10,
  heroTitle: 22,
  heroEyebrow: 11,
  shellTitle: 18,
  shellEyebrow: 11,
  tab: 12,
  badge: 11,
  caption: 12,
  chip: 13,
  concept: 15,
  formula: 14,
} as const;

export function scaleAiToolFont(size: number): number {
  return Math.round(size * AI_TOOL_TABLET_FONT_SCALE);
}

export function scaleOutputFont(mobilePx: number, variant: 'tablet' | 'board'): number {
  const scale = variant === 'board' ? AI_TOOL_OUTPUT_BOARD_SCALE : AI_TOOL_OUTPUT_TABLET_SCALE;
  return Math.round(mobilePx * scale);
}

function outputType(fontSize: number, lineHeight?: number) {
  return lineHeight != null ? { fontSize, lineHeight } : { fontSize };
}

const M = AI_TOOL_OUTPUT_MOBILE;
const tablet = (n: number) => scaleOutputFont(n, 'tablet');
const board = (n: number) => scaleOutputFont(n, 'board');

export function useAiToolTabletLayout() {
  const { width } = useWindowDimensions();
  const isTablet = useIsTablet();
  const isDigitalBoard = isTablet && width >= AI_TOOL_DIGITAL_BOARD_MIN_WIDTH;
  const splitMaxWidth = Math.min(width, AI_TOOL_SPLIT_MAX_WIDTH);
  // Stacked form → output on tablet; split panes stay off for readability on boards.
  const useSplitLayout = false;
  const pagePad = isTablet ? AI_TOOL_PAGE_PAD_TABLET : AI_TOOL_PAGE_PAD_MOBILE;
  /** Full-bleed output — equal negative margins only (no fixed window width). */
  const outputBleedStyle = {
    marginHorizontal: -pagePad,
    alignSelf: 'stretch' as const,
  };
  return { isTablet, isDigitalBoard, useSplitLayout, splitMaxWidth, pagePad, outputBleedStyle };
}

export const aiToolTabletStyles = StyleSheet.create({
  tabletSplit: {
    flex: 1,
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: AI_TOOL_SPLIT_MAX_WIDTH,
    paddingHorizontal: 16,
    gap: 16,
    minHeight: 0,
  },
  tabletFormPane: {
    flex: 1,
    minWidth: 0,
  },
  tabletOutputPane: {
    flex: 1.1,
    minWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(148, 163, 184, 0.35)',
    paddingLeft: 16,
  },
  tabletPaneContent: {
    paddingVertical: 16,
    paddingBottom: 24,
    gap: 14,
  },
});

/** Tool page chrome — parameters bar, form fields, footer (tablet only). */
export const aiToolTabletPageStyles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    gap: 18,
    maxWidth: AI_TOOL_SPLIT_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  paramsSummary: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  paramsSummaryTitle: {
    fontSize: scaleAiToolFont(15),
    lineHeight: scaleAiToolFont(22),
  },
  paramsSummaryMeta: {
    fontSize: scaleAiToolFont(12),
    lineHeight: scaleAiToolFont(18),
  },
  sectionHeaderText: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: scaleAiToolFont(15),
    lineHeight: scaleAiToolFont(22),
  },
  sectionSubtitle: {
    fontSize: scaleAiToolFont(12),
    lineHeight: scaleAiToolFont(18),
  },
  sectionBody: {
    padding: 20,
    gap: 16,
  },
  fieldLabel: {
    fontSize: scaleAiToolFont(15),
    lineHeight: scaleAiToolFont(22),
  },
  dropdownValue: {
    fontSize: scaleAiToolFont(15),
    lineHeight: scaleAiToolFont(22),
  },
  lockedValue: {
    fontSize: scaleAiToolFont(15),
    lineHeight: scaleAiToolFont(22),
  },
  textInput: {
    fontSize: scaleAiToolFont(15),
    minHeight: 56,
  },
  infoBannerText: {
    fontSize: scaleAiToolFont(12),
    lineHeight: scaleAiToolFont(18),
  },
  generatingTitle: {
    fontSize: scaleAiToolFont(16),
    lineHeight: scaleAiToolFont(24),
  },
  generatingText: {
    fontSize: scaleAiToolFont(13),
    lineHeight: scaleAiToolFont(20),
  },
  emptyResultTitle: {
    fontSize: scaleAiToolFont(15),
    lineHeight: scaleAiToolFont(22),
  },
  emptyResultText: {
    fontSize: scaleAiToolFont(12),
    lineHeight: scaleAiToolFont(18),
  },
  footer: {
    paddingHorizontal: 28,
    maxWidth: AI_TOOL_SPLIT_MAX_WIDTH,
    alignSelf: 'center',
    width: '100%',
  },
  generateBtnGradient: {
    paddingVertical: 18,
  },
  generateBtnText: {
    fontSize: scaleAiToolFont(16),
    lineHeight: scaleAiToolFont(24),
  },
  compactHeaderTitle: {
    fontSize: scaleAiToolFont(15),
    lineHeight: scaleAiToolFont(22),
  },
});

/** Native AI tool viewers — tablet output typography. */
export const aiToolViewerTabletStyles = StyleSheet.create({
  shellHeader: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  shellEyebrow: outputType(tablet(M.shellEyebrow)),
  shellTitle: outputType(tablet(M.shellTitle), tablet(26)),
  tabText: { ...outputType(tablet(M.tab)), maxWidth: 200 },
  scrollBody: { width: '100%' },
  activityBody: { padding: 8, gap: 12 },
  heroCard: { padding: 14 },
  heroTitle: outputType(tablet(M.heroTitle), tablet(30)),
  heroEyebrow: outputType(tablet(M.heroEyebrow)),
  sectionsBadgeText: outputType(tablet(M.badge)),
  sectionNum: outputType(tablet(M.sectionNum)),
  sectionTitle: outputType(tablet(M.sectionTitle), tablet(20)),
  sectionHeader: { paddingHorizontal: 12, paddingVertical: 12 },
  sectionBody: { paddingHorizontal: 12, paddingBottom: 12 },
  preWrap: outputType(tablet(M.body), tablet(M.bodyLh)),
  checkText: outputType(tablet(M.body), tablet(M.bodyLh)),
  bulletText: outputType(tablet(M.body), tablet(M.bodyLh)),
  matText: outputType(tablet(M.body), tablet(M.bodyLh)),
  stepText: outputType(tablet(M.body), tablet(M.bodyLh + 2)),
  progressLabel: outputType(tablet(M.caption)),
  guideTitle: outputType(tablet(M.heroTitle), tablet(30)),
  bodyText: outputType(tablet(M.body), tablet(M.bodyLh)),
  conceptName: outputType(tablet(M.concept)),
  conceptExplanation: outputType(tablet(M.small), tablet(M.smallLh)),
  practiceQuestion: outputType(tablet(M.body), tablet(M.bodyLh)),
  section1Title: outputType(tablet(M.heroTitle), tablet(30)),
  perCardText: outputType(tablet(M.small), tablet(M.smallLh)),
  chipValue: outputType(tablet(M.chip), tablet(18)),
  sectionsGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionsColumn: {
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  practiceListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  practiceCardCol: {
    width: '48.5%',
    minWidth: 0,
    alignSelf: 'flex-start',
  },
});

/** Digital board — largest output typography. */
export const aiToolViewerBoardStyles = StyleSheet.create({
  shellEyebrow: outputType(board(M.shellEyebrow)),
  shellTitle: outputType(board(M.shellTitle), board(28)),
  tabText: { ...outputType(board(M.tab)), maxWidth: 240 },
  heroTitle: outputType(board(M.heroTitle), board(34)),
  heroEyebrow: outputType(board(M.heroEyebrow)),
  sectionsBadgeText: outputType(board(M.badge)),
  sectionNum: outputType(board(M.sectionNum)),
  sectionTitle: outputType(board(M.sectionTitle), board(24)),
  preWrap: outputType(board(M.body), board(M.bodyLh + 2)),
  checkText: outputType(board(M.body), board(M.bodyLh + 2)),
  bulletText: outputType(board(M.body), board(M.bodyLh + 2)),
  matText: outputType(board(M.body), board(M.bodyLh + 2)),
  stepText: outputType(board(M.body), board(M.bodyLh + 4)),
  progressLabel: outputType(board(M.caption)),
  guideTitle: outputType(board(M.heroTitle), board(34)),
  bodyText: outputType(board(M.body), board(M.bodyLh + 2)),
  conceptName: outputType(board(M.concept)),
  conceptExplanation: outputType(board(M.small), board(M.smallLh + 2)),
  practiceQuestion: outputType(board(M.body), board(M.bodyLh + 2)),
  section1Title: outputType(board(M.heroTitle), board(34)),
  perCardText: outputType(board(M.small), board(M.smallLh + 2)),
  chipValue: outputType(board(M.chip), board(20)),
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 14 },
  sectionBody: { paddingHorizontal: 16, paddingBottom: 16 },
});

type ViewerOutputStyleKey = keyof typeof aiToolViewerTabletStyles;

export function viewerTabletStyle<K extends ViewerOutputStyleKey>(
  isTablet: boolean,
  key: K,
  isDigitalBoard = false,
): (typeof aiToolViewerTabletStyles)[K] | undefined {
  if (isDigitalBoard && key in aiToolViewerBoardStyles) {
    return aiToolViewerBoardStyles[key as keyof typeof aiToolViewerBoardStyles] as (typeof aiToolViewerTabletStyles)[K];
  }
  return isTablet ? aiToolViewerTabletStyles[key] : undefined;
}
