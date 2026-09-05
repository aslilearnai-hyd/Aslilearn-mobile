import { useCallback, useEffect, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { scrollTo, useAnimatedRef } from 'react-native-reanimated';
import type Animated from 'react-native-reanimated';

/** Scroll phone tool pages to generated output — single instant jump, no animated overscroll. */
export function useAiToolOutputScroll(isTablet: boolean) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const outputOffsetY = useRef(0);
  const pendingScroll = useRef(false);

  const performScroll = useCallback(() => {
    if (isTablet || outputOffsetY.current <= 0) return;
    scrollTo(scrollRef, 0, Math.max(0, outputOffsetY.current - 12), false);
  }, [isTablet, scrollRef]);

  const resetOutputScroll = useCallback(() => {
    pendingScroll.current = false;
    outputOffsetY.current = 0;
  }, []);

  const queueScrollToOutput = useCallback(() => {
    if (isTablet) return;
    pendingScroll.current = true;
    if (outputOffsetY.current > 0) {
      pendingScroll.current = false;
      requestAnimationFrame(performScroll);
    }
  }, [isTablet, performScroll]);

  const onOutputLayout = useCallback(
    (event: LayoutChangeEvent) => {
      outputOffsetY.current = event.nativeEvent.layout.y;
      if (!pendingScroll.current || isTablet) return;
      pendingScroll.current = false;
      requestAnimationFrame(performScroll);
    },
    [isTablet, performScroll],
  );

  return { scrollRef, onOutputLayout, queueScrollToOutput, resetOutputScroll };
}

/** Queue scroll after generate finishes or an inline output message is shown. */
export function useQueueAiToolScrollOnGenerate(
  generatedContent: string,
  isGenerating: boolean,
  isTablet: boolean,
  queueScrollToOutput: () => void,
  fallbackEmptyMessage = '',
) {
  useEffect(() => {
    if (isGenerating || isTablet) return;
    if (!generatedContent && !fallbackEmptyMessage) return;
    const timer = setTimeout(queueScrollToOutput, 120);
    return () => clearTimeout(timer);
  }, [generatedContent, fallbackEmptyMessage, isGenerating, isTablet, queueScrollToOutput]);
}
