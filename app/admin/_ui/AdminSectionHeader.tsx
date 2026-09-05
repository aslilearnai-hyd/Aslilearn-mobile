import React, { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminTheme } from './useAdminTheme';

type Props = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: ReactNode;
};

export default function AdminSectionHeader({ title, subtitle, icon, action }: Props) {
  const { colors, typo } = useAdminTheme();

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: colors.inputBg, borderColor: colors.surfaceBorder }]}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
        ) : null}
        <View style={styles.textBlock}>
          <Text style={[typo.section, { color: colors.text }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
