import React from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND_LOGO = require('../../../assets/logo-transparent.png');
const SUPPORT_EMAIL = 'info@aslilearn.ai';

export type PortalNavItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const NAV_ACCENTS: { colors: [string, string, string]; glow: string }[] = [
  { colors: ['#F97316', '#FBBF24', '#FDE047'], glow: '#F97316' },
  { colors: ['#0EA5E9', '#22D3EE', '#5EEAD4'], glow: '#0EA5E9' },
  { colors: ['#8B5CF6', '#A78BFA', '#F0ABFC'], glow: '#8B5CF6' },
  { colors: ['#F43F5E', '#F472B6', '#FDBA74'], glow: '#F43F5E' },
  { colors: ['#10B981', '#4ADE80', '#A3E635'], glow: '#10B981' },
  { colors: ['#6366F1', '#60A5FA', '#67E8F9'], glow: '#6366F1' },
  { colors: ['#14B8A6', '#34D399', '#7DD3FC'], glow: '#14B8A6' },
  { colors: ['#D946EF', '#EC4899', '#A78BFA'], glow: '#D946EF' },
];

const SPARKLES = [
  { left: '12%', top: '8%', size: 4 },
  { left: '78%', top: '14%', size: 3 },
  { left: '22%', top: '28%', size: 5 },
  { left: '88%', top: '36%', size: 3 },
  { left: '8%', top: '48%', size: 4 },
  { left: '70%', top: '58%', size: 3 },
  { left: '16%', top: '72%', size: 4 },
  { left: '84%', top: '80%', size: 5 },
];

const FLOATERS: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  style: object;
  size: number;
}[] = [
  { name: 'book-outline', color: 'rgba(14,165,233,0.38)', style: { left: 8, top: 88 }, size: 22 },
  { name: 'pencil-outline', color: 'rgba(249,115,22,0.34)', style: { right: 10, top: 148 }, size: 18 },
  { name: 'school-outline', color: 'rgba(245,158,11,0.32)', style: { right: 16, bottom: 168 }, size: 20 },
  { name: 'star', color: 'rgba(250,204,21,0.4)', style: { left: 28, top: '46%' }, size: 14 },
  { name: 'sparkles', color: 'rgba(217,70,239,0.32)', style: { right: 28, top: '56%' }, size: 16 },
  { name: 'flash-outline', color: 'rgba(139,92,246,0.3)', style: { left: 40, bottom: 120 }, size: 14 },
];

type Props = {
  items: PortalNavItem[];
  activeId: string;
  compact?: boolean;
  onSelect: (id: string) => void;
  onLogout: () => void;
  onBrandPress?: () => void;
  onClose?: () => void;
};

async function openSupport() {
  Alert.alert('Contact Support', `Email the AsliLearn team at ${SUPPORT_EMAIL}`, [
    {
      text: 'Copy email',
      onPress: async () => {
        try {
          await Clipboard.setStringAsync(SUPPORT_EMAIL);
        } catch {
          /* still show the address in the alert */
        }
      },
    },
    {
      text: 'Open mail',
      onPress: () => {
        void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
      },
    },
    { text: 'Close', style: 'cancel' },
  ]);
}

function SidebarAtmosphere() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#EEF8FF', '#FFF7ED', '#F0FDFA', '#FAF5FF']}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.blob, styles.blobSky]} />
      <View style={[styles.blob, styles.blobOrange]} />
      <View style={[styles.blob, styles.blobViolet]} />
      {SPARKLES.map((dot, i) => (
        <View
          key={i}
          style={[
            styles.sparkle,
            {
              left: dot.left as any,
              top: dot.top as any,
              width: dot.size,
              height: dot.size,
              borderRadius: dot.size / 2,
            },
          ]}
        />
      ))}
      {FLOATERS.map((floater, i) => (
        <Ionicons
          key={i}
          name={floater.name}
          size={floater.size}
          color={floater.color}
          style={[styles.floater, floater.style]}
        />
      ))}
    </View>
  );
}

function NavRow({
  item,
  active,
  accentIndex,
  onPress,
}: {
  item: PortalNavItem;
  active: boolean;
  accentIndex: number;
  onPress: () => void;
}) {
  const accent = NAV_ACCENTS[accentIndex % NAV_ACCENTS.length];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.navPress, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
    >
      {active ? (
        <LinearGradient
          colors={accent.colors}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.navRow, styles.navRowActive, { shadowColor: accent.glow }]}
        >
          <View style={styles.navGlow} />
          <View style={[styles.iconTile, styles.iconTileActive]}>
            <Ionicons name={item.icon} size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.navLabelActive} numberOfLines={1}>
            {item.label}
          </Text>
          <Ionicons name="sparkles" size={14} color="rgba(255,255,255,0.92)" />
        </LinearGradient>
      ) : (
        <View style={styles.navRow}>
          <View style={styles.iconTile}>
            <Ionicons name={item.icon} size={18} color="#64748B" />
          </View>
          <Text style={styles.navLabel} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function PortalNavChrome({
  items,
  activeId,
  compact,
  onSelect,
  onLogout,
  onBrandPress,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.panel}>
      <SidebarAtmosphere />

      {onClose ? (
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          hitSlop={8}
          style={[styles.closeBtn, { top: insets.top + 12 }]}
        >
          <Ionicons name="close" size={22} color="#0f172a" />
        </Pressable>
      ) : null}

      {!compact ? (
        <Pressable
          onPress={onBrandPress}
          disabled={!onBrandPress}
          style={[
            styles.brandCard,
            { marginTop: insets.top + 10 },
            onClose ? styles.brandCardWithClose : null,
          ]}
          accessibilityLabel="Go to overview"
        >
          <View style={styles.logoOrbit}>
            <View style={styles.logoWrap}>
              <Image source={BRAND_LOGO} style={styles.logo} resizeMode="contain" />
            </View>
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandTitle} numberOfLines={1}>
              <Text style={styles.brandAsli}>AsliLearn</Text>
              <Text style={styles.brandAi}> AI</Text>
            </Text>
            <Text style={styles.brandSub} numberOfLines={1}>
              Your learning library ✨
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={{ height: insets.top + 8 }} />
      )}

      <View style={styles.menuRule}>
        <LinearGradient colors={['transparent', 'rgba(217,70,239,0.5)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.menuLine} />
        <Text style={styles.menuLabel}>Menu</Text>
        <LinearGradient colors={['transparent', 'rgba(14,165,233,0.5)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.menuLine} />
      </View>

      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, index) => (
          <NavRow
            key={item.id}
            item={item}
            active={activeId === item.id}
            accentIndex={index}
            onPress={() => onSelect(item.id)}
          />
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable style={styles.supportBtn} onPress={() => void openSupport()}>
          <Ionicons name="mail-outline" size={16} color="#F97316" />
          <Text style={styles.supportText}>Contact Support</Text>
        </Pressable>
        <Pressable style={styles.logoutBtn} onPress={onLogout} accessibilityLabel="Log out">
          <Ionicons name="log-out-outline" size={16} color="#64748B" />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
        <Text style={styles.copyright}>© {new Date().getFullYear()} AsliLearn AI</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobSky: {
    width: 176,
    height: 176,
    right: -48,
    top: 40,
    backgroundColor: 'rgba(56,189,248,0.28)',
  },
  blobOrange: {
    width: 192,
    height: 192,
    left: -56,
    bottom: 48,
    backgroundColor: 'rgba(251,146,60,0.22)',
  },
  blobViolet: {
    width: 128,
    height: 128,
    left: '32%',
    top: '42%',
    backgroundColor: 'rgba(167,139,250,0.22)',
  },
  sparkle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  floater: {
    position: 'absolute',
  },
  closeBtn: {
    position: 'absolute',
    right: 12,
    zIndex: 30,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  brandCard: {
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  brandCardWithClose: {
    paddingRight: 48,
  },
  logoOrbit: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249,115,22,0.18)',
  },
  logoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 36, height: 36 },
  brandCopy: { flex: 1, minWidth: 0 },
  brandTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  brandAsli: { color: '#0369A1' },
  brandAi: { color: '#F97316' },
  brandSub: { marginTop: 2, fontSize: 11, fontWeight: '600', color: '#0369A1' },
  menuRule: {
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuLine: { flex: 1, height: 1 },
  menuLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: '#7C3AED',
  },
  navScroll: { flex: 1 },
  navContent: { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  navPress: { borderRadius: 16 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  navRowActive: {
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  navGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(186,230,253,0.9)',
  },
  iconTileActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: '#475569' },
  navLabelActive: { flex: 1, fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 8,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(224,242,254,0.9)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 10,
  },
  supportText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  logoutText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  copyright: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.4,
    color: '#94A3B8',
  },
});
