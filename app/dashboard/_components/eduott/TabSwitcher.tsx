import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import ChipNav from '../../../../src/components/student/ChipNav';
import { STUDENT_SPACING } from '../../../../src/theme/student';

export type EduOTTTab = 'videos' | 'live-sessions';

interface TabSwitcherProps {
  activeTab: EduOTTTab;
  onChange: (tab: EduOTTTab) => void;
}

const TABS = [
  { id: 'videos' as const, label: 'Videos' },
  { id: 'live-sessions' as const, label: 'Live Classes' },
];

function TabSwitcherComponent({ activeTab, onChange }: TabSwitcherProps) {
  return (
    <View style={styles.wrapper}>
      <ChipNav
        chips={TABS}
        active={activeTab}
        onChange={(id) => onChange(id as EduOTTTab)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: STUDENT_SPACING.md,
  },
});

export default memo(TabSwitcherComponent);
