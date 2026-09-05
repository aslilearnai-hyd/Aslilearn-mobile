import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
  iconSize?: number;
};

export default function AiToolPremiumIcon({
  name,
  color,
  size = 56,
  iconSize = 24,
}: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.32 }]}>
      <LinearGradient
        colors={[`${color}28`, `${color}12`, '#ffffff']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.inner, { backgroundColor: `${color}18` }]}>
        <Ionicons name={name} size={iconSize} color={color} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  inner: {
    width: '72%',
    height: '72%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
