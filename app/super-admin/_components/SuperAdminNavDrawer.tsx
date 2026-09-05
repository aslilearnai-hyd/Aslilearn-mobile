import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSuperAdminTheme } from '../_ui/useSuperAdminTheme';

const SLIDE_MS = 220;
const slideEasing = Easing.out(Easing.cubic);

/** Matches web `SuperAdminSidebar` + `super-admin-views.ts`. */
export type SuperAdminView =
  | 'dashboard'
  | 'board'
  | 'admins'
  | 'subjects-and-content'
  | 'content'
  | 'subjects'
  | 'exams'
  | 'iq-rank-boost'
  | 'calendar'
  | 'vidya-ai'
  | 'ai-tool-generations'
  | 'ai-tool-topics'
  | 'ai-generator'
  | 'book-knowledge-base'
  | 'book-based-generator'
  | 'ai-content-engine'
  | 'edu-ott-live'
  | 'analytics'
  | 'ai-analytics'
  | 'board-comparison'
  | 'subscriptions'
  | 'settings'
  | 'audit-logs';

type NavItem = {
  id: SuperAdminView;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Platform',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'bar-chart-outline' },
      { id: 'board', label: 'Board Management', icon: 'people-outline' },
      { id: 'admins', label: 'School Management', icon: 'shield-outline' },
    ],
  },
  {
    title: 'Content & Exams',
    items: [
      { id: 'subjects-and-content', label: 'Subject & Content', icon: 'list-outline' },
      { id: 'edu-ott-live', label: 'Edu OTT Live', icon: 'radio-outline' },
      { id: 'exams', label: 'Exam Management', icon: 'document-text-outline' },
      { id: 'iq-rank-boost', label: 'Quiz', icon: 'trophy-outline' },
      { id: 'calendar', label: 'School Calendar', icon: 'calendar-outline' },
    ],
  },
  {
    title: 'AI Engine',
    items: [
      { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles-outline' },
      { id: 'ai-tool-generations', label: 'AI Tool Data', icon: 'albums-outline' },
      { id: 'ai-tool-topics', label: 'AI Tool Topics', icon: 'radio-button-on-outline' },
      { id: 'ai-generator', label: 'AI Generator', icon: 'flash-outline' },
      { id: 'book-knowledge-base', label: 'Book Knowledge Base', icon: 'library-outline' },
      { id: 'book-based-generator', label: 'Book-Based Generator', icon: 'book-outline' },
    ],
  },
  {
    title: 'Insights & Billing',
    items: [
      { id: 'analytics', label: 'Analytics', icon: 'stats-chart-outline' },
      { id: 'audit-logs', label: 'Audit Logs', icon: 'shield-checkmark-outline' },
      { id: 'subscriptions', label: 'Subscriptions', icon: 'card-outline' },
      { id: 'settings', label: 'Settings', icon: 'settings-outline' },
    ],
  },
];

export const SUPER_ADMIN_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

/** First 5 items — matches web mobile bottom nav. */
export const SUPER_ADMIN_BOTTOM_TABS = SUPER_ADMIN_NAV_ITEMS.slice(0, 5);

export function superAdminNavLabel(view: SuperAdminView): string {
  if (view === 'ai-analytics') return 'AI Analytics';
  if (view === 'board-comparison') return 'Board Comparison';
  if (view === 'content' || view === 'subjects') return 'Subject & Content';
  return SUPER_ADMIN_NAV_ITEMS.find((item) => item.id === view)?.label ?? 'Dashboard';
}

type Props = {
  visible: boolean;
  activeView: SuperAdminView;
  userName: string;
  onClose: () => void;
  onSelect: (view: SuperAdminView) => void;
  onLogout: () => void;
};

export default function SuperAdminNavDrawer({
  visible,
  activeView,
  userName,
  onClose,
  onSelect,
  onLogout,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, radius } = useSuperAdminTheme();
  const drawerWidth = Math.min(width * 0.92, 320);
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0
  );
  const [mounted, setMounted] = useState(visible);
  const translateX = useSharedValue(-drawerWidth);
  const backdropOpacity = useSharedValue(0);

  // The modal window re-measures after it mounts on Android, so `drawerWidth`
  // must not drive the effect or the slide-in replays from the left.
  const drawerWidthRef = useRef(drawerWidth);
  drawerWidthRef.current = drawerWidth;
  const wasVisible = useRef(false);

  useEffect(() => {
    if (visible === wasVisible.current) return;
    wasVisible.current = visible;
    const offscreen = -drawerWidthRef.current;

    if (visible) {
      setMounted(true);
      translateX.value = offscreen;
      backdropOpacity.value = 0;
      translateX.value = withTiming(0, { duration: SLIDE_MS, easing: slideEasing });
      backdropOpacity.value = withTiming(1, { duration: SLIDE_MS, easing: slideEasing });
      return;
    }

    translateX.value = withTiming(offscreen, { duration: SLIDE_MS, easing: slideEasing });
    backdropOpacity.value = withTiming(
      0,
      { duration: SLIDE_MS, easing: slideEasing },
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      }
    );
  }, [visible, translateX, backdropOpacity]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const isActive = (itemId: SuperAdminView) =>
    activeView === itemId ||
    (itemId === 'analytics' && activeView === 'ai-analytics') ||
    (itemId === 'subjects-and-content' &&
      (activeView === 'subjects' || activeView === 'content'));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              backgroundColor: colors.drawerBg,
              borderRightColor: colors.drawerBorder,
            },
            drawerStyle,
          ]}
        >
          <LinearGradient colors={[...colors.drawerGradient]} style={StyleSheet.absoluteFill} />

          <SafeAreaView
            edges={['top', 'bottom']}
            style={[
              styles.drawerSafe,
              insets.top === 0 && topInset > 0 ? { paddingTop: topInset } : null,
            ]}
          >
          <View style={styles.logoSection}>
            <View style={[styles.logoBadge, { borderRadius: radius.md }]}>
              <Ionicons name="school" size={24} color="#fff" />
            </View>
            <View style={styles.logoTextWrap}>
              <Text style={styles.logoTitle}>Aslilearn AI</Text>
              <Text style={styles.logoSubtitle}>Super Admin</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.navScroll}
            contentContainerStyle={styles.navContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {NAV_SECTIONS.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionLabel}>{section.title}</Text>
                {section.items.map((item) => {
                  const active = isActive(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.navItem,
                        { borderRadius: radius.md },
                        active && styles.navItemActive,
                      ]}
                      onPress={() => onSelect(item.id)}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={active ? colors.navActiveColor : colors.drawerTextMuted}
                      />
                      <Text
                        style={[
                          styles.navLabel,
                          { color: active ? colors.navActiveColor : colors.drawerText },
                          active && styles.navLabelActive,
                        ]}
                        numberOfLines={2}
                      >
                        {item.label}
                      </Text>
                      {active ? (
                        <View style={[styles.activeDot, { backgroundColor: colors.navActiveColor }]} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={styles.userRow}>
              <View style={[styles.userAvatar, { borderRadius: radius.full }]}>
                <Ionicons name="person" size={16} color="#fff" />
              </View>
              <View style={styles.userTextWrap}>
                <Text style={styles.userName} numberOfLines={1}>
                  {userName}
                </Text>
                <Text style={styles.userRole}>Super Administrator</Text>
              </View>
            </View>
            <Pressable style={styles.logoutBtn} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={18} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    height: '100%',
    borderRightWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    overflow: 'hidden',
  },
  drawerSafe: {
    flex: 1,
    minHeight: 0,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  logoBadge: {
    width: 42,
    height: 42,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  logoTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  logoSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navScroll: {
    flex: 1,
  },
  navContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: '#FFFFFF',
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  navLabelActive: {
    fontWeight: '800',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 10,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 34,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  userRole: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
