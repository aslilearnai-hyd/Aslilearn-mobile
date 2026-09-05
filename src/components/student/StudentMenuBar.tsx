import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { STUDENT } from '../../theme/student';

type Props = {
  title: string;
  onMenu: () => void;
};

export default function StudentMenuBar({ title, onMenu }: Props) {
  return (
    <View style={styles.bar}>
      <Pressable
        style={styles.menuBtn}
        onPress={onMenu}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        <Ionicons name="menu" size={22} color={STUDENT.text} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    color: STUDENT.text,
  },
});
