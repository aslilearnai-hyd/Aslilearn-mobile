import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminTheme } from './useAdminTheme';

type Props = {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  gradientIndex?: number;
  subtext?: string;
  loading?: boolean;
  delay?: number;
  /** Shorter horizontal layout for tablet stat rows */
  compact?: boolean;
  /** Two-column mobile stat grid (default when not compact) */
  grid?: boolean;
};

export default function AdminStatCard({
  label,
  value,
  icon,
  gradientIndex = 0,
  subtext,
  loading,
  delay: _delay,
  compact = false,
  grid = !compact,
}: Props) {
  const { colors, radius, typo } = useAdminTheme();
  const palette = colors.dashboardStatCards[gradientIndex % colors.dashboardStatCards.length];

  const displayValue = loading ? '—' : value;
  const horizontal = compact || grid;

  return (
    <View
      style={[
        styles.wrap,
        horizontal && styles.wrapCompact,
        { borderRadius: radius.lg },
      ]}
    >
      <View
        style={[
          styles.fill,
          horizontal && styles.fillHorizontal,
          {
            borderRadius: radius.lg,
            backgroundColor: palette.bg,
            borderWidth: 1,
            borderColor: 'rgba(15, 118, 110, 0.08)',
          },
        ]}
      >
        <View style={styles.compactInner}>
          <View style={[styles.iconWrapCompact, { backgroundColor: palette.iconBg }]}>
            <Ionicons name={icon} size={20} color={palette.accent} />
          </View>
          <View style={styles.textBlock}>
            <Text style={[styles.label, { color: palette.accent }]} numberOfLines={2}>
              {label}
            </Text>
            <Text
              style={[
                typo.stat,
                styles.value,
                { color: colors.text },
                horizontal ? styles.valueHorizontal : null,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {displayValue}
            </Text>
            {subtext ? (
              <Text style={[styles.subtext, { color: colors.textMuted }]} numberOfLines={1}>
                {subtext}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
  },
  wrapCompact: {
    minWidth: 0,
    width: '100%',
    alignSelf: 'stretch',
  },
  fill: {
    padding: 14,
    minHeight: 96,
    justifyContent: 'center',
  },
  fillHorizontal: {
    minHeight: 92,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  compactInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapCompact: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  value: {},
  valueHorizontal: {
    fontSize: 24,
    lineHeight: 28,
  },
  subtext: {
    fontSize: 10,
    marginTop: 2,
  },
});
