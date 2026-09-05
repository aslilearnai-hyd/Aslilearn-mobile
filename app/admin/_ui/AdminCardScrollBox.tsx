import React, { ReactNode } from 'react';
import { ScrollView, ScrollViewProps, StyleSheet } from 'react-native';

type Props = ScrollViewProps & {
  children: ReactNode;
};

/** Bounded inner scroll area inside admin cards (works with outer AdminScreenShell scroll). */
export default function AdminCardScrollBox({ style, children, contentContainerStyle, ...rest }: Props) {
  return (
    <ScrollView
      {...rest}
      style={[styles.box, style]}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      nestedScrollEnabled
      scrollEnabled
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      overScrollMode="always"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
  },
  content: {
    width: '100%',
  },
});
