import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { isAndroidTv } from '../../lib/device';

/**
 * The shared pastel gradient artwork that sits behind every dashboard. Glass
 * surfaces (see `GlassSurface`) blur whatever is behind them, so they need real
 * colour underneath — a flat page background makes them read as plain grey
 * cards. This is that colour.
 *
 * Drop the artwork at `assets/dashboard-bg.png`. It is a tall portrait mesh
 * gradient, so `cover` is correct: on wide/tablet screens it crops the sides
 * rather than squashing the blobs.
 */

const BG_SOURCE = require('../../../assets/dashboard-bg.png');

/**
 * Very light top-to-bottom wash. The artwork is brightest in its upper-left,
 * which is exactly where the greeting and page titles sit — without this the
 * dark heading text drops below 4.5:1 in that corner.
 */
const SCRIM: [string, string, string] = [
  'rgba(255,255,255,0.30)',
  'rgba(255,255,255,0.04)',
  'rgba(255,255,255,0.22)',
];

type Props = {
  children: React.ReactNode;
  /** Set false on screens that supply their own scrim (e.g. a coloured hero). */
  scrim?: boolean;
};

export default function AppBackground({ children, scrim = true }: Props) {
  // 4K classroom panels OOM if this artwork is decoded at full screen.
  if (isAndroidTv()) {
    return (
      <View style={styles.bg}>
        {scrim ? (
          <LinearGradient
            colors={SCRIM}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        ) : null}
        <View style={styles.content}>{children}</View>
      </View>
    );
  }

  return (
    <ImageBackground source={BG_SOURCE} resizeMode="cover" style={styles.bg}>
      {scrim ? (
        <LinearGradient
          colors={SCRIM}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      ) : null}
      <View style={styles.content}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    // The artwork carries the page colour now; this only shows for the frame
    // before the image decodes, so it matches the artwork's dominant tone.
    backgroundColor: '#DCE4F7',
  },
  content: {
    flex: 1,
  },
});
