import { useEffect } from 'react';
import { TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

Animated.addWhitelistedNativeProps({ text: true });

export const AnimatedStatInput = Animated.createAnimatedComponent(TextInput);

export function useCountUp(target: number, duration = 800): SharedValue<number> {
  const value = useSharedValue(0);

  useEffect(() => {
    value.value = withTiming(target, { duration });
  }, [target, duration, value]);

  return value;
}
