import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import PortalNavChrome from '../layout/PortalNavChrome';
import { isIndividualAccount } from '../../lib/individual-signup';

/** Matches web `teacherNav` in asli-frontend/src/lib/app-nav.ts */
export type TeacherNavId =
  | 'overview'
  | 'classes'
  | 'students'
  | 'eduott'
  | 'learning-paths'
  | 'vidya-ai'
  | 'calendar'
  | 'results'
  | 'settings'
  | 'reports'
  | 'subscription';

export type TeacherNavItem = {
  id: TeacherNavId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const TEACHER_NAV_ITEMS: TeacherNavItem[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'classes', label: 'My Classes', icon: 'school-outline' },
  { id: 'students', label: 'Students', icon: 'people-outline' },
  { id: 'eduott', label: 'EduOTT', icon: 'videocam-outline' },
  { id: 'learning-paths', label: 'Learning Paths', icon: 'book-outline' },
  { id: 'vidya-ai', label: 'Vidya AI', icon: 'sparkles-outline' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar-outline' },
  { id: 'results', label: 'Offline Results', icon: 'scan-outline' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline' },
  { id: 'reports', label: 'Reports', icon: 'bar-chart-outline' },
];

const SUBSCRIPTION_NAV_ITEM: TeacherNavItem = {
  id: 'subscription',
  label: 'Subscription',
  icon: 'card-outline',
};

export function teacherNavItemsForUser(user?: any): TeacherNavItem[] {
  const items = isIndividualAccount(user)
    ? TEACHER_NAV_ITEMS.filter(
        (item) => !['classes', 'students', 'calendar', 'results', 'reports'].includes(item.id),
      )
    : TEACHER_NAV_ITEMS;
  if (isIndividualAccount(user)) {
    return [...items, SUBSCRIPTION_NAV_ITEM];
  }
  return items;
}

export function teacherNavLabel(id: string): string {
  if (id === 'subscription') return SUBSCRIPTION_NAV_ITEM.label;
  return TEACHER_NAV_ITEMS.find((item) => item.id === id)?.label ?? 'Overview';
}

type PanelProps = {
  activeId: string;
  user?: any;
  compact?: boolean;
  onSelect: (id: TeacherNavId) => void;
  onLogout: () => void;
  onClose?: () => void;
};

export function TeacherNavPanel({ activeId, user, compact, onSelect, onLogout, onClose }: PanelProps) {
  return (
    <PortalNavChrome
      items={teacherNavItemsForUser(user)}
      activeId={activeId}
      compact={compact}
      onSelect={(id) => onSelect(id as TeacherNavId)}
      onLogout={onLogout}
      onBrandPress={() => onSelect('overview')}
      onClose={onClose}
    />
  );
}

type DrawerProps = {
  visible: boolean;
  activeId: string;
  user?: any;
  onClose: () => void;
  onSelect: (id: TeacherNavId) => void;
  onLogout: () => void;
};

const SLIDE_MS = 200;
const slideEasing = Easing.out(Easing.cubic);

export default function TeacherNavDrawer({
  visible,
  activeId,
  user,
  onClose,
  onSelect,
  onLogout,
}: DrawerProps) {
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.82, 320);
  const [mounted, setMounted] = useState(visible);
  const translateX = useSharedValue(-drawerWidth);
  const backdropOpacity = useSharedValue(0);
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
    backdropOpacity.value = withTiming(0, { duration: SLIDE_MS, easing: slideEasing }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [visible, translateX, backdropOpacity]);

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.drawer, { width: drawerWidth }, drawerStyle]}>
          <TeacherNavPanel
            activeId={activeId}
            user={user}
            onSelect={(id) => {
              onSelect(id);
              onClose();
            }}
            onLogout={onLogout}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.6)',
    shadowColor: '#6366F1',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
});
