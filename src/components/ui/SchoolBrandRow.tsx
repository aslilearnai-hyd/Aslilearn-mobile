import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSchoolBranding, resolveSchoolLogoUrl } from '../../lib/school-branding';

type Variant = 'onPrimary' | 'onLight';

type Props = {
  user?: Parameters<typeof getSchoolBranding>[0];
  schoolName?: string;
  schoolLogo?: string | null;
  variant?: Variant;
  compact?: boolean;
  fullWidth?: boolean;
  showLogo?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function SchoolBrandRow({
  user,
  schoolName,
  schoolLogo,
  variant = 'onPrimary',
  compact = false,
  fullWidth = false,
  showLogo = true,
  style,
}: Props) {
  const branding =
    schoolName || schoolLogo
      ? {
          schoolName: String(schoolName || '').trim(),
          schoolLogo: resolveSchoolLogoUrl(schoolLogo),
        }
      : getSchoolBranding(user);

  if (!branding?.schoolName && !branding?.schoolLogo) return null;

  const isOnPrimary = variant === 'onPrimary';
  const logoSize = compact ? 28 : 36;
  const iconSize = compact ? 14 : 18;

  return (
    <View style={[styles.row, fullWidth && styles.rowFullWidth, compact && styles.rowCompact, style]}>
      {showLogo ? (
        <View
          style={[
            styles.logoWrap,
            { width: logoSize, height: logoSize, borderRadius: compact ? 8 : 10 },
            isOnPrimary ? styles.logoWrapOnPrimary : styles.logoWrapOnLight,
          ]}
        >
          {branding.schoolLogo ? (
            <Image
              source={{ uri: branding.schoolLogo }}
              style={[styles.logoImg, { width: logoSize - 4, height: logoSize - 4 }]}
              resizeMode="contain"
            />
          ) : (
            <Ionicons
              name="school-outline"
              size={iconSize}
              color={isOnPrimary ? 'rgba(255,255,255,0.92)' : '#ea580c'}
            />
          )}
        </View>
      ) : null}
      <Text
        style={[
          styles.name,
          compact && styles.nameCompact,
          isOnPrimary ? styles.nameOnPrimary : styles.nameOnLight,
        ]}
        numberOfLines={2}
      >
        {branding.schoolName || 'Your School'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: '100%',
  },
  rowFullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  rowCompact: {
    gap: 8,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    flexShrink: 0,
  },
  logoWrapOnPrimary: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  logoWrapOnLight: {
    backgroundColor: 'rgba(255,247,237,0.55)',
    borderColor: '#fed7aa',
  },
  logoImg: {},
  name: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  nameCompact: {
    fontSize: 11,
    fontWeight: '600',
  },
  nameOnPrimary: {
    color: 'rgba(255,255,255,0.96)',
  },
  nameOnLight: {
    color: '#0f172a',
  },
});
