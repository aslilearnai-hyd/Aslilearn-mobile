import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { STUDENT, STUDENT_RADIUS, STUDENT_TYPO } from '../../theme/student';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export default function StudentBottomSheet({ visible, onClose, title, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropPress}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={title ? `Close ${title}` : 'Close sheet'}
        />
        <Animated.View
          entering={SlideInDown.duration(280)}
          exiting={SlideOutDown.duration(220)}
          style={styles.sheet}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 1,
  },
  sheet: {
    backgroundColor: STUDENT.surface,
    borderTopLeftRadius: STUDENT_RADIUS.xxl,
    borderTopRightRadius: STUDENT_RADIUS.xxl,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 12,
    maxHeight: '80%',
    zIndex: 2,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: STUDENT.surfaceBorder,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    ...STUDENT_TYPO.section,
    fontSize: 18,
    color: STUDENT.text,
    marginBottom: 12,
  },
  content: {
    gap: 4,
  },
});
