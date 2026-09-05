import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GLASS_RIM, GLASS_ROW, glassFillColor } from '../../theme/glass';
import { uiTheme } from './theme';

type Props = {
  title: string;
  onBack?: () => void;
  rightActionIcon?: keyof typeof Ionicons.glyphMap;
  onRightAction?: () => void;
};

export default function AppHeader({ title, onBack, rightActionIcon, onRightAction }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={onBack}
        disabled={!onBack}
        hitSlop={5}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityElementsHidden={!onBack}
        importantForAccessibility={onBack ? 'yes' : 'no-hide-descendants'}
        accessibilityState={{ disabled: !onBack }}
      >
        {onBack ? <Ionicons name="arrow-back" size={20} color={uiTheme.colors.text} /> : null}
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <TouchableOpacity
        style={styles.iconButton}
        onPress={onRightAction}
        disabled={!onRightAction}
        hitSlop={5}
        accessibilityRole="button"
        accessibilityLabel={`${title} actions`}
        accessibilityElementsHidden={!onRightAction}
        importantForAccessibility={onRightAction ? 'yes' : 'no-hide-descendants'}
        accessibilityState={{ disabled: !onRightAction }}
      >
        {rightActionIcon && onRightAction ? (
          <Ionicons name={rightActionIcon} size={20} color={uiTheme.colors.text} />
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: uiTheme.spacing.md,
    paddingVertical: 12,
    backgroundColor: glassFillColor('medium'),
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GLASS_RIM.border,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: uiTheme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS_ROW.fillSoft,
    zIndex: 1,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: uiTheme.colors.text,
    zIndex: 1,
  },
});
