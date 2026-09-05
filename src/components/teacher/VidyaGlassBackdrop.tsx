import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { AI_RADIUS } from '../../theme/ai';

const ANDROID_BLUR_METHOD = Platform.OS === 'android' ? 'dimezisBlurView' : undefined;

/**
 * Full-screen soft blurred colour blobs behind the Vidya AI tab — sits at the
 * root of the teacher dashboard so the header and floating tab bar's glass
 * surfaces have real colour behind them to blur, not just a flat white page.
 */
export default function VidyaGlassBackdrop() {
  return (
    <View style={styles.backdrop} pointerEvents="none">
      <View style={[styles.orb, styles.orbIndigo]} />
      <View style={[styles.orb, styles.orbBlue]} />
      <View style={[styles.orb, styles.orbPink]} />
      <View style={[styles.orb, styles.orbSky]} />
      <BlurView
        intensity={60}
        tint="default"
        experimentalBlurMethod={ANDROID_BLUR_METHOD}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: AI_RADIUS.full,
  },
  orbIndigo: {
    width: 260,
    height: 260,
    left: -70,
    top: -60,
    backgroundColor: '#C7D2FE',
  },
  orbBlue: {
    width: 220,
    height: 220,
    right: -40,
    top: 60,
    backgroundColor: '#93C5FD',
  },
  orbPink: {
    width: 220,
    height: 220,
    right: -50,
    top: 300,
    backgroundColor: '#FBCFE8',
  },
  orbSky: {
    width: 280,
    height: 280,
    left: '15%',
    bottom: -60,
    backgroundColor: '#BAE6FD',
  },
});
