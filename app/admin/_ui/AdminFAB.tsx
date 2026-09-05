import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdminTheme } from './useAdminTheme';
import AdminScalePressable from './AdminScalePressable';
import { useAdminResponsiveLayout } from './useAdminResponsiveLayout';

type Props = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
};

export default function AdminFAB({ onPress, icon = 'add' }: Props) {
  const { colors, radius } = useAdminTheme();
  const { showBottomTabBar } = useAdminResponsiveLayout();

  return (
    <AdminScalePressable
      onPress={onPress}
      scaleTo={0.92}
      style={[styles.wrap, { bottom: showBottomTabBar ? 20 : 28 }]}
    >
      <LinearGradient
        colors={[...colors.fabGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, { borderRadius: radius.full }]}
      >
        <Ionicons name={icon} size={26} color="#fff" />
      </LinearGradient>
    </AdminScalePressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    zIndex: 50,
  },
  btn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
