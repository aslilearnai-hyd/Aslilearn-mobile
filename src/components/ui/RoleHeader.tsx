import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT, RADIUS, SPACING, UserRole, getGreeting, getRoleGradient } from '../../theme';
import Badge from './Badge';

type Props = {
  role: UserRole;
  userName: string;
  subtitle?: string;
  badge?: string;
  onMenu?: () => void;
  onProfile?: () => void;
};

export default function RoleHeader({
  role,
  userName,
  subtitle,
  badge,
  onMenu,
  onProfile,
}: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabel =
    role === 'super-admin'
      ? 'Super Admin'
      : role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <LinearGradient
      colors={[...getRoleGradient(role)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, compact && styles.wrapCompact]}
    >
      <View style={styles.topRow}>
        <Pressable
          style={styles.userBlock}
          onPress={onProfile}
          accessibilityRole="button"
          accessibilityLabel={`Open profile for ${userName}`}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.textBlock}>
            <Text style={styles.greeting}>
              {getGreeting()}, {userName.split(' ')[0]}
            </Text>
            <Text style={[styles.roleLabel, compact && styles.roleLabelCompact]}>{roleLabel} Dashboard</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </Pressable>
        <View style={styles.actions}>
          {onMenu ? (
            <Pressable
              style={styles.iconBtn}
              onPress={onMenu}
              hitSlop={2}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
            >
              <Ionicons name="menu" size={22} color={COLORS.textInverse} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {badge ? (
        <View style={styles.badgeRow}>
          <Badge label={badge} color={COLORS.textInverse} />
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  wrapCompact: {
    paddingBottom: SPACING.lg,
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
    gap: SPACING.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.textInverse,
    fontWeight: FONT.extrabold,
    fontSize: FONT.lg,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: FONT.sm,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: FONT.medium,
  },
  roleLabel: {
    fontSize: FONT.xxl,
    fontWeight: FONT.extrabold,
    color: COLORS.textInverse,
    marginTop: 2,
  },
  roleLabelCompact: {
    fontSize: FONT.xl,
  },
  subtitle: {
    fontSize: FONT.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  badgeRow: {
    marginTop: SPACING.md,
  },
});
