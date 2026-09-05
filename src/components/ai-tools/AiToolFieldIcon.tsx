import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  accent: string;
  size?: number;
};

export default function AiToolFieldIcon({ name, accent, size = 40 }: Props) {
  const iconSize = Math.round(size * 0.48);
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <LinearGradient
        colors={[`${accent}22`, `${accent}10`]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <Ionicons name={name} size={iconSize} color={accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
});
