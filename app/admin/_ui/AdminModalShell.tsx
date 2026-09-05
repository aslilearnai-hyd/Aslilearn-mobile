import React, { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminTheme } from './useAdminTheme';
import AdminScalePressable from './AdminScalePressable';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  noAnimation?: boolean;
};

export default function AdminModalShell({ visible, title, onClose, children, footer, noAnimation }: Props) {
  const { colors, radius } = useAdminTheme();
  const insets = useSafeAreaInsets();

  const sheetStyle = [
    styles.sheet,
    {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingBottom: Math.max(insets.bottom, 16),
    },
  ];

  const SheetWrapper = noAnimation ? View : Animated.View;
  const sheetProps = noAnimation
    ? {}
    : { entering: SlideInDown.springify().damping(18) };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
        <SheetWrapper {...sheetProps} style={sheetStyle}>
          <View style={[styles.handle, { backgroundColor: '#E2E8F0' }]} />
          <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <AdminScalePressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </AdminScalePressable>
          </View>
          <View style={styles.body}>{children}</View>
          {footer ? (
            <View style={[styles.footer, { borderTopColor: colors.surfaceBorder }]}>{footer}</View>
          ) : null}
        </SheetWrapper>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    maxHeight: '92%',
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
});
