import React, { memo } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { adminGreeting } from '../../../src/theme/admin';
import { getSchoolBranding } from '../../../src/lib/school-branding';
import { useAdminTheme } from './useAdminTheme';
import AdminScalePressable from './AdminScalePressable';
import SchoolBrandRow from '../../../src/components/ui/SchoolBrandRow';

type Props = {
  userName: string;
  subtitle?: string;
  schoolUser?: { schoolName?: string; schoolLogo?: string };
  showSchoolBrand?: boolean;
  onMenu?: () => void;
};

function AdminHeader({ userName, subtitle, schoolUser, showSchoolBrand = false, onMenu }: Props) {
  const { colors, radius } = useAdminTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const firstName = userName.split(' ')[0] || userName || 'Admin';
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'A';
  const schoolBranding = getSchoolBranding(schoolUser);
  const schoolLogoUrl = schoolBranding?.schoolLogo ?? null;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <LinearGradient
        colors={[...colors.headerGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          compact ? styles.gradientCompact : null,
          { borderRadius: radius.xl },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.userBlock}>
            <View
              style={[
                styles.avatar,
                {
                  borderRadius: radius.full,
                  backgroundColor: colors.primaryMuted,
                  borderColor: 'rgba(99,102,241,0.28)',
                },
              ]}
            >
              {schoolLogoUrl ? (
                <Image
                  source={{ uri: schoolLogoUrl }}
                  style={styles.avatarLogo}
                  resizeMode="contain"
                  accessibilityLabel={`${schoolBranding?.schoolName || 'School'} logo`}
                />
              ) : (
                <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
              )}
            </View>
            <View style={styles.textBlock}>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                {adminGreeting()}, {firstName}
              </Text>
              {showSchoolBrand ? (
                <SchoolBrandRow
                  schoolName={schoolBranding?.schoolName}
                  variant="onLight"
                  showLogo={!schoolLogoUrl}
                  style={styles.schoolBrand}
                  fullWidth
                />
              ) : null}
              <Text
                style={[
                  styles.roleLabel,
                  compact ? styles.roleLabelCompact : null,
                  { color: colors.text },
                ]}
              >
                Admin Dashboard
              </Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: colors.primary }]}>{subtitle}</Text>
              ) : null}
            </View>
          </View>
          {onMenu ? (
            <AdminScalePressable
              style={[
                styles.iconBtn,
                { backgroundColor: colors.surface, borderColor: 'rgba(99,102,241,0.22)' },
              ]}
              onPress={onMenu}
            >
              <Ionicons name="menu" size={22} color={colors.primary} />
            </AdminScalePressable>
          ) : null}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  gradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.45)',
  },
  gradientCompact: {
    paddingVertical: 12,
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
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLogo: {
    width: 36,
    height: 36,
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 16,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  roleLabel: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  roleLabelCompact: {
    fontSize: 18,
    lineHeight: 22,
  },
  schoolBrand: {
    marginTop: 4,
    marginBottom: 2,
    maxWidth: '100%',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 3,
    fontWeight: '700',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

export default memo(AdminHeader);
