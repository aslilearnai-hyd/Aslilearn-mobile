import { useEffect } from 'react';
import { Platform, View, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { isAndroidTv } from '../lib/device';

/** Hold long enough for the entrance spring to settle before exit. */
export const SPLASH_DURATION_MS = 3800;
const EXIT_DURATION_MS = 520;
const MAX_LOGO_SCALE = 1.06;
const BRAND_LOGO = require('../../assets/logo-transparent.png');

/**
 * Opaque ink bounds inside the square canvas (1254×1254 with transparent pad).
 * Using content aspect keeps the mark from looking tiny / jumping on scale.
 */
const LOGO_CONTENT_ASPECT = 1112 / 779;

type AppSplashProps = {
  exiting?: boolean;
};

function PulseRing({ size, delay, color }: { size: number; delay: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [delay, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.72, 1.38]) }],
    opacity: interpolate(progress.value, [0, 0.25, 1], [0, 0.42, 0]),
    borderColor: color,
  }));

  return <Animated.View style={[styles.ring, ringStyle]} pointerEvents="none" />;
}

function useSplashLogoSize() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Foldables can report 0×0 briefly while unfolding — never animate from invalid size.
  const safeW = Math.max(width || 0, 320);
  const safeH = Math.max(height || 0, 480);
  const availableWidth = safeW - insets.left - insets.right;
  const availableHeight = safeH - insets.top - insets.bottom;
  const logoWidth = Math.min(
    Math.max(availableWidth * 0.96, 120),
    Math.min(520, (availableHeight * 0.68) * LOGO_CONTENT_ASPECT),
  );
  const logoHeight = logoWidth / LOGO_CONTENT_ASPECT;
  return {
    logoWidth,
    logoHeight,
    stageWidth: logoWidth * MAX_LOGO_SCALE,
    stageHeight: logoHeight * MAX_LOGO_SCALE,
  };
}

function TvStaticSplash() {
  const { logoWidth, logoHeight, stageWidth, stageHeight } = useSplashLogoSize();
  return (
    <View style={styles.safeArea}>
      <SafeAreaView style={styles.safeInner} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.container}>
          <View style={[styles.stage, { width: stageWidth, height: stageHeight }]}>
            <View style={[styles.logoWrap, { width: logoWidth, height: logoHeight }]}>
              <Image
                source={BRAND_LOGO}
                style={{ width: logoWidth, height: logoHeight }}
                resizeMode="contain"
                accessibilityLabel="AsliLearn.ai"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function AnimatedPhoneSplash({ exiting = false }: AppSplashProps) {
  const { logoWidth, logoHeight, stageWidth, stageHeight } = useSplashLogoSize();

  const logoScale = useSharedValue(0.82);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(18);
  const breathe = useSharedValue(1);
  const containerOpacity = useSharedValue(1);
  const ringOpacity = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
    logoTranslateY.value = withSpring(0, { damping: 18, stiffness: 90, mass: 1 });
    logoScale.value = withSpring(1, { damping: 16, stiffness: 85, mass: 1 });

    breathe.value = withDelay(
      900,
      withRepeat(
        withSequence(
          withTiming(1.025, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(logoOpacity);
      cancelAnimation(logoTranslateY);
      cancelAnimation(logoScale);
      cancelAnimation(breathe);
    };
  }, [breathe, logoOpacity, logoScale, logoTranslateY]);

  useEffect(() => {
    if (!exiting) return;

    cancelAnimation(breathe);
    breathe.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) });
    ringOpacity.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
    logoScale.value = withTiming(MAX_LOGO_SCALE, {
      duration: EXIT_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    logoOpacity.value = withTiming(0, {
      duration: EXIT_DURATION_MS,
      easing: Easing.in(Easing.cubic),
    });
    containerOpacity.value = withTiming(0, {
      duration: EXIT_DURATION_MS,
      easing: Easing.in(Easing.cubic),
    });
  }, [breathe, containerOpacity, exiting, logoOpacity, logoScale, ringOpacity]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: logoTranslateY.value },
      { scale: logoScale.value * breathe.value },
    ],
    opacity: logoOpacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const ringsStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  const ringBase = Math.min(logoWidth, logoHeight) * 0.78;

  return (
    <Animated.View style={[styles.safeArea, containerStyle]}>
      <SafeAreaView style={styles.safeInner} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.container}>
          <View style={[styles.stage, { width: stageWidth, height: stageHeight }]}>
            <Animated.View style={[styles.rings, ringsStyle]} pointerEvents="none">
              <PulseRing size={ringBase} delay={0} color="rgba(17,49,106,0.35)" />
              <PulseRing size={ringBase} delay={750} color="rgba(202,121,17,0.32)" />
              <PulseRing size={ringBase} delay={1500} color="rgba(79,70,229,0.28)" />
            </Animated.View>

            <Animated.View style={[styles.logoWrap, { width: logoWidth, height: logoHeight }, logoStyle]}>
              <Image
                source={BRAND_LOGO}
                style={{ width: logoWidth, height: logoHeight }}
                resizeMode="contain"
                accessibilityLabel="AsliLearn.ai"
              />
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

export function AppSplash({ exiting = false }: AppSplashProps) {
  if (isAndroidTv() || Platform.isTV) {
    return <TvStaticSplash />;
  }
  return <AnimatedPhoneSplash exiting={exiting} />;
}

export const SPLASH_EXIT_DURATION_MS = EXIT_DURATION_MS;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Match AppBackground so the handoff to login does not flash a different wash.
    backgroundColor: '#DCE4F7',
  },
  safeInner: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  rings: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
