import { View, StyleSheet } from 'react-native';
import {
  CalendarDecorArt,
  EfficiencyDecorArt,
  HeroDecorArt,
  ScreenDecorArt,
  StudyTimeDecorArt,
  TodayProgressDecorArt,
  WeekDecorArt,
} from './StudentDashboardDecorArt';

export type StudentCardDecorVariant =
  | 'hero'
  | 'today'
  | 'study'
  | 'week'
  | 'efficiency'
  | 'calendar'
  | 'screen';

type Layout = {
  width: number | `${number}%`;
  height: number | `${number}%`;
  right?: number;
  bottom?: number;
  top?: number;
  left?: number;
  opacity?: number;
};

const LAYOUT: Record<StudentCardDecorVariant, Layout> = {
  hero: { width: '100%', height: '100%', right: 0, bottom: 0, opacity: 0.2 },
  today: { width: 110, height: 92, right: 0, bottom: -6, opacity: 0.22 },
  study: { width: 104, height: 100, right: -6, bottom: 0, opacity: 0.22 },
  week: { width: 104, height: 100, right: 0, bottom: 0, opacity: 0.22 },
  efficiency: { width: 104, height: 92, right: 0, bottom: 0, opacity: 0.22 },
  calendar: { width: 148, height: 84, right: 4, top: 4, opacity: 0.24 },
  screen: { width: '100%', height: '100%', right: 0, bottom: 0, opacity: 0.1 },
};

type Props = {
  variant: StudentCardDecorVariant;
  color?: string;
};

export default function StudentCardDecor({ variant, color = '#ffffff' }: Props) {
  const layout = LAYOUT[variant];
  const artColor =
    variant === 'hero' || variant === 'calendar'
      ? '#ffffff'
      : variant === 'screen'
        ? '#86efac'
        : color;
  const opacity = layout.opacity ?? 0.18;

  const artProps = {
    color: artColor,
    opacity,
    width: typeof layout.width === 'number' ? layout.width : 320,
    height: typeof layout.height === 'number' ? layout.height : 180,
  };

  let art = null;
  switch (variant) {
    case 'hero':
      art = <HeroDecorArt color={artColor} opacity={opacity} />;
      break;
    case 'today':
      art = <TodayProgressDecorArt {...artProps} />;
      break;
    case 'study':
      art = <StudyTimeDecorArt {...artProps} />;
      break;
    case 'week':
      art = <WeekDecorArt {...artProps} />;
      break;
    case 'efficiency':
      art = <EfficiencyDecorArt {...artProps} />;
      break;
    case 'calendar':
      art = <CalendarDecorArt {...artProps} />;
      break;
    case 'screen':
      art = <ScreenDecorArt color={artColor} opacity={opacity} />;
      break;
    default:
      art = null;
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          top: layout.top,
          right: layout.right,
          bottom: layout.bottom,
          left: layout.left,
          width: layout.width,
          height: layout.height,
        },
      ]}
      pointerEvents="none"
    >
      {art}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
