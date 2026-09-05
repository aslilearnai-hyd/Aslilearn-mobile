import { StyleSheet, useWindowDimensions } from 'react-native';
import { COLORS, FONT, RADIUS, SHADOW, SPACING } from '../../../../src/theme';

export const ANALYSIS_TABLET_MIN = 768;
export const ANALYSIS_WIDE_MIN = 1024;
export const ANALYSIS_CONTENT_MAX = 960;

export function useExamAnalysisLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width >= ANALYSIS_TABLET_MIN;
  const isWide = width >= ANALYSIS_WIDE_MIN;
  const contentWidth = Math.min(width, ANALYSIS_CONTENT_MAX);
  return { width, isTablet, isWide, contentWidth };
}

export const ANALYSIS = {
  gradient: ['#F8FAFC', '#EFF6FF', '#E0F2FE'] as const,
  gradientHero: ['#EFF6FF', '#DBEAFE', '#E0F2FE'] as const,
  accent: '#3B82F6',
  accentSoft: '#EFF6FF',
  accentBorder: '#BFDBFE',
  surface: '#FFFFFF',
  canvas: 'transparent',
  correct: '#34D399',
  correctSoft: '#ECFDF5',
  wrong: '#F87171',
  wrongSoft: '#FEF2F2',
  skipped: '#94A3B8',
  purple: '#818CF8',
  purpleSoft: '#EEF2FF',
  amber: '#FBBF24',
  amberSoft: '#FFFBEB',
};

export const TAB_META = {
  ai: { label: 'AI Report', icon: 'sparkles' as const },
  questions: { label: 'Questions', icon: 'list' as const },
  advanced: { label: 'Advanced', icon: 'stats-chart' as const },
  insights: { label: 'Insights', icon: 'bulb' as const },
  plan: { label: 'Plan', icon: 'calendar' as const },
};

export const ANALYSIS_TAB_ORDER = Object.keys(TAB_META) as (keyof typeof TAB_META)[];

export const analysisStyles = StyleSheet.create({
  // Transparent so the app background artwork shows through.
  canvas: { flex: 1, backgroundColor: 'transparent' },
  header: {
    backgroundColor: ANALYSIS.surface,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: ANALYSIS.accentBorder,
    zIndex: 20,
    ...SHADOW.sm,
    elevation: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: ANALYSIS.surface,
    borderWidth: 1,
    borderColor: ANALYSIS.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: FONT.xl, fontWeight: FONT.extrabold, color: COLORS.text },
  headerSub: { fontSize: FONT.sm, color: COLORS.textSecondary, marginTop: 2 },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: ANALYSIS.accentSoft,
    borderWidth: 1,
    borderColor: ANALYSIS.accentBorder,
  },
  retakeBtnText: { fontSize: FONT.sm, fontWeight: FONT.bold, color: ANALYSIS.accent },
  statsStrip: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  statChip: {
    flex: 1,
    backgroundColor: ANALYSIS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ANALYSIS.accentBorder,
    minWidth: 0,
  },
  statChipVal: { fontSize: FONT.lg, fontWeight: FONT.extrabold, color: ANALYSIS.accent },
  statChipLab: { fontSize: FONT.xs, color: COLORS.textSecondary, marginTop: 2, fontWeight: FONT.semibold },
  tabsWrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: ANALYSIS.surface,
    zIndex: 21,
    elevation: 21,
  },
  tabsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexGrow: 1,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 40,
    borderRadius: RADIUS.full,
    backgroundColor: ANALYSIS.canvas,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabPillActive: {
    backgroundColor: ANALYSIS.accentSoft,
    borderColor: ANALYSIS.accentBorder,
  },
  tabPillText: { fontSize: FONT.sm, fontWeight: FONT.semibold, color: COLORS.textSecondary },
  tabPillTextActive: { color: ANALYSIS.accent, fontWeight: FONT.bold },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.lg },
  scrollContentTablet: {
    width: '100%',
    maxWidth: ANALYSIS_CONTENT_MAX,
    alignSelf: 'center',
    paddingHorizontal: SPACING.xl,
  },
  headerConstrained: {
    width: '100%',
    maxWidth: ANALYSIS_CONTENT_MAX,
    alignSelf: 'center',
    paddingHorizontal: SPACING.lg,
  },
  tabsRowTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  hero: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    gap: SPACING.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ANALYSIS.accentBorder,
  },
  heroEyebrow: {
    fontSize: FONT.xs,
    fontWeight: FONT.bold,
    color: ANALYSIS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: { fontSize: FONT.h1, fontWeight: FONT.extrabold, color: COLORS.text },
  heroSub: { fontSize: FONT.base, color: COLORS.textSecondary },
  scoreCard: {
    backgroundColor: ANALYSIS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: ANALYSIS.accentBorder,
    ...SHADOW.md,
  },
  // Box props only — `card` is passed to GlassPanel, so the child spacing that
  // used to live here now sits on `cardInner`.
  card: {
    position: 'relative',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  cardInner: { gap: SPACING.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: ANALYSIS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: FONT.lg, fontWeight: FONT.extrabold, color: COLORS.text, flex: 1 },
  cardBody: { gap: SPACING.sm, width: '100%' },
  filterPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: ANALYSIS.surface,
  },
  filterPillActive: {
    backgroundColor: ANALYSIS.accentSoft,
    borderColor: ANALYSIS.accentBorder,
  },
  filterPillText: { fontSize: FONT.sm, fontWeight: FONT.semibold, color: COLORS.textSecondary },
  filterPillTextActive: { color: ANALYSIS.accent, fontWeight: FONT.bold },
});
