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

export type StudentNavId =
  | 'home'
  | 'learning'
  | 'eduott'
  | 'exams'
  | 'quiz'
  | 'results'
  | 'timetable'
  | 'vidya'
  | 'profile'
  | 'subscription';

export type StudentNavItem = {
  id: StudentNavId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const STUDENT_NAV_ITEMS: StudentNavItem[] = [
  { id: 'home', label: 'Dashboard', icon: 'grid-outline' },
  { id: 'learning', label: 'Learning Paths', icon: 'book-outline' },
  { id: 'eduott', label: 'EduOTT', icon: 'videocam-outline' },
  { id: 'exams', label: 'Exams', icon: 'document-text-outline' },
  { id: 'quiz', label: 'Quiz', icon: 'trophy-outline' },
  { id: 'results', label: 'Offline Results', icon: 'scan-outline' },
  { id: 'timetable', label: 'Timetable', icon: 'calendar-outline' },
  { id: 'vidya', label: 'Vidya AI', icon: 'sparkles-outline' },
  { id: 'profile', label: 'Profile', icon: 'person-outline' },
];

const SUBSCRIPTION_NAV_ITEM: StudentNavItem = {
  id: 'subscription',
  label: 'Subscription',
  icon: 'card-outline',
};

export function studentNavItemsForUser(user?: any): StudentNavItem[] {
  if (isIndividualAccount(user)) {
    return [
      ...STUDENT_NAV_ITEMS.filter((item) => item.id !== 'results' && item.id !== 'timetable').map((item) =>
        item.id === 'exams' ? { ...item, label: 'Practice Exams' } : item,
      ),
      SUBSCRIPTION_NAV_ITEM,
    ];
  }
  return STUDENT_NAV_ITEMS;
}

export function studentNavLabel(id: string): string {
  if (id === 'subscription') return SUBSCRIPTION_NAV_ITEM.label;
  return STUDENT_NAV_ITEMS.find((item) => item.id === id)?.label ?? 'Dashboard';
}

type PanelProps = {
  activeId: string;
  user?: any;
  compact?: boolean;
  onSelect: (id: StudentNavId) => void;
  onLogout: () => void;
  onClose?: () => void;
};

export function StudentNavPanel({ activeId, user, compact, onSelect, onLogout, onClose }: PanelProps) {
  return (
    <PortalNavChrome
      items={studentNavItemsForUser(user)}
      activeId={activeId}
      compact={compact}
      onSelect={(id) => onSelect(id as StudentNavId)}
      onLogout={onLogout}
      onBrandPress={() => onSelect('home')}
      onClose={onClose}
    />
  );
}

type DrawerProps = {
  visible: boolean;
  activeId: string;
  user?: any;
  onClose: () => void;
  onSelect: (id: StudentNavId) => void;
  onLogout: () => void;
};

const SLIDE_MS = 200;
const slideEasing = Easing.out(Easing.cubic);

export default function StudentNavDrawer({
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
          <StudentNavPanel
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
