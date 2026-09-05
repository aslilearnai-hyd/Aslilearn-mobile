import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAdminTheme } from '../_ui/useAdminTheme';
import AdminNavPanel from './AdminNavPanel';
import { type AdminNavView } from './adminNav';

export type { AdminNavView } from './adminNav';
export { ADMIN_NAV_ITEMS, adminNavLabel } from './adminNav';

type Props = {
  visible: boolean;
  activeView: AdminNavView;
  userName: string;
  onClose: () => void;
  onSelect: (view: AdminNavView) => void;
  onLogout: () => void;
};

const SLIDE_MS = 200;
const slideEasing = Easing.out(Easing.cubic);

export default function AdminNavDrawer({
  visible,
  activeView,
  userName,
  onClose,
  onSelect,
  onLogout,
}: Props) {
  const { width } = useWindowDimensions();
  const { colors } = useAdminTheme();
  const drawerWidth = Math.min(width * 0.82, 320);
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

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay }, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              borderRightColor: colors.drawerBorder,
            },
            drawerStyle,
          ]}
        >
          <AdminNavPanel
            activeView={activeView}
            userName={userName}
            onSelect={onSelect}
            onLogout={onLogout}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRightWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
});
