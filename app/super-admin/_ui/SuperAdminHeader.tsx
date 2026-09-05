import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminGreeting } from '../../../src/theme/admin';
import { useSuperAdminTheme } from './useSuperAdminTheme';

type Props = {
  userName: string;
  subtitle?: string;
  onMenu?: () => void;
};

export default function SuperAdminHeader({ userName, subtitle, onMenu }: Props) {
  const { colors, radius } = useSuperAdminTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const firstName = userName.split(' ')[0] || userName || 'Super Admin';
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SA';

  // `wrap` is transparent so the app artwork shows through the gradient's
  // rounded bottom corners instead of an opaque square block.
  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[...colors.headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          compact ? styles.gradientCompact : null,
          { paddingTop: insets.top + 14 },
        ]}
      >
        <View style={styles.decorCircle} />
        <View style={[styles.decorCircle, styles.decorCircleSm]} />

        <View style={styles.topRow}>
          <View style={styles.userBlock}>
            <View style={[styles.avatar, { borderRadius: radius.full }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.greeting}>
                {adminGreeting()}, {firstName}
              </Text>
              <Text style={[styles.roleLabel, compact ? styles.roleLabelCompact : null]}>
                Super Admin Dashboard
              </Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
          </View>
          {onMenu ? (
            <Pressable style={styles.iconBtn} onPress={onMenu}>
              <Ionicons name="menu" size={22} color="#fff" />
            </Pressable>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  gradient: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  gradientCompact: {
    paddingBottom: 18,
  },
  decorCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -30,
  },
  decorCircleSm: {
    width: 80,
    height: 80,
    borderRadius: 40,
    top: 20,
    right: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  roleLabel: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  roleLabelCompact: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 3,
    fontWeight: '500',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
});
