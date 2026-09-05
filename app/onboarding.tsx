import { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ActionButton } from '../src/components/ui';
import { COLORS, FONT, RADIUS, SPACING } from '../src/theme';

const slides = [
  {
    title: 'Smart Learning',
    subtitle: 'Personalized lessons and homework guidance tailored to your pace.',
    icon: 'book' as const,
    gradient: COLORS.gradientSky,
  },
  {
    title: 'Track Progress',
    subtitle: 'Monitor attendance, assignments, exams, and rankings in one place.',
    icon: 'bar-chart' as const,
    gradient: COLORS.gradientStudent,
  },
  {
    title: 'AI-Powered',
    subtitle: 'Vidya AI tutor helps students learn and assists teachers instantly.',
    icon: 'sparkles' as const,
    gradient: COLORS.gradientBlue,
  },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  const finish = () => router.replace('/auth/login');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {index < slides.length - 1 ? (
        <Pressable style={styles.skip} onPress={finish}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      ) : null}

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <LinearGradient colors={[...slide.gradient]} style={styles.illustration}>
              <Ionicons name={slide.icon} size={64} color={COLORS.textInverse} />
            </LinearGradient>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.subtitle}>{slide.subtitle}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {index === slides.length - 1 ? (
          <ActionButton label="Get Started" onPress={finish} gradient={COLORS.gradientBlue} />
        ) : (
          <ActionButton
            label="Next"
            onPress={() => scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true })}
            variant="secondary"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // transparent so the app-wide pastel artwork shows behind the slides
    backgroundColor: 'transparent',
  },
  skip: {
    position: 'absolute',
    top: 56,
    right: SPACING.lg,
    zIndex: 10,
    padding: SPACING.sm,
  },
  skipText: {
    color: COLORS.primary,
    fontWeight: FONT.semibold,
    fontSize: FONT.base,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxxl,
    paddingTop: 80,
  },
  illustration: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxxl,
  },
  title: {
    fontSize: FONT.h1,
    fontWeight: FONT.extrabold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: FONT.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: COLORS.primary,
  },
});
