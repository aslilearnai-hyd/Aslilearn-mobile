import React, { useCallback, useState, type ReactNode } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAdminTheme } from './useAdminTheme';

type Props = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  /** Shown under the row when more content is off-screen to the right. */
  hint?: string;
};

/**
 * Horizontal scroller with a visible cue (fade + chevron + optional hint)
 * so users know they can swipe for more actions.
 */
export default function AdminHorizontalScroll({
  children,
  contentContainerStyle,
  style,
  hint = 'Swipe for more',
}: Props) {
  const { colors } = useAdminTheme();
  const [viewportW, setViewportW] = useState(0);
  const [contentW, setContentW] = useState(0);
  const [offsetX, setOffsetX] = useState(0);

  const canScroll = contentW > viewportW + 4;
  const atEnd = !canScroll || offsetX >= contentW - viewportW - 8;
  const showCue = canScroll && !atEnd;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setViewportW(e.nativeEvent.layout.width);
  }, []);

  const onContentSizeChange = useCallback((w: number) => {
    setContentW(w);
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    // Coarse updates only — avoid setState every frame while swiping.
    setOffsetX((prev) => (Math.abs(prev - x) < 24 ? prev : x));
  }, []);

  return (
    <View style={style}>
      <View style={styles.rowWrap} onLayout={onLayout}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          onScroll={onScroll}
          scrollEventThrottle={64}
          onContentSizeChange={onContentSizeChange}
          contentContainerStyle={contentContainerStyle}
          style={styles.scroll}
        >
          {children}
        </ScrollView>
        {showCue ? (
          <View pointerEvents="none" style={styles.cue}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.fade}
            />
            <View style={[styles.chevronPill, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </View>
          </View>
        ) : null}
      </View>
      {showCue ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          {hint} <Text style={{ color: colors.primary }}>→</Text>
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    position: 'relative',
  },
  scroll: {
    flexGrow: 0,
  },
  cue: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fade: {
    ...StyleSheet.absoluteFillObject,
  },
  chevronPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  hint: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
