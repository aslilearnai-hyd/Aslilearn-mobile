import { StyleSheet, View } from 'react-native';
import { TimetableView } from '../../../src/components/teacher';
import { TEACHER_SPACING } from '../../../src/theme/teacher';
import ScheduleCalendarView from './ScheduleCalendarView';

export default function CalendarView() {
  return (
    <View style={styles.root}>
      <TimetableView scrollable={false} />
      <ScheduleCalendarView />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: TEACHER_SPACING.md },
});
