import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  visible: boolean;
  children: ReactNode;
};

/** Renders children while hidden so tab state and scroll position are preserved. */
export function VisitedTabPane({ visible, children }: Props) {
  return (
    <View
      style={[styles.pane, !visible && styles.hidden]}
      collapsable={false}
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pane: {
    flex: 1,
    minHeight: 0,
  },
  hidden: {
    display: 'none',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
});
