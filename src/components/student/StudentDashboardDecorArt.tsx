import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

type ArtProps = {
  color: string;
  opacity?: number;
  width?: number | string;
  height?: number | string;
};

function stroke(color: string, opacity = 0.14) {
  return { stroke: color, strokeWidth: 1.2, fill: 'none', opacity };
}

function Sparkle({ x, y, size, color, opacity }: { x: number; y: number; size: number; color: string; opacity: number }) {
  const h = size / 2;
  return (
    <G opacity={opacity}>
      <Line x1={x} y1={y - h} x2={x} y2={y + h} stroke={color} strokeWidth={1.1} />
      <Line x1={x - h} y1={y} x2={x + h} y2={y} stroke={color} strokeWidth={1.1} />
    </G>
  );
}

function CrossMark({ x, y, size, color, opacity }: { x: number; y: number; size: number; color: string; opacity: number }) {
  const h = size / 2;
  return (
    <G opacity={opacity}>
      <Line x1={x - h} y1={y - h} x2={x + h} y2={y + h} stroke={color} strokeWidth={1} />
      <Line x1={x + h} y1={y - h} x2={x - h} y2={y + h} stroke={color} strokeWidth={1} />
    </G>
  );
}

function PencilIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <G {...stroke(color, opacity)}>
      <Path d="M2 18 L14 6 L18 10 L6 22 Z" />
      <Line x1="14" y1="6" x2="18" y2="10" />
      <Path d="M2 18 L0 22 L4 22 Z" />
    </G>
  );
}

function CompassIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <G {...stroke(color, opacity)}>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 4 L14 12 L12 20 L10 12 Z" />
      <Circle cx="12" cy="12" r="1.5" fill={color} fillOpacity={opacity * 0.5} stroke="none" />
    </G>
  );
}

function TrophyIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <G {...stroke(color, opacity)}>
      <Path d="M6 4 H18 V12 C18 17 15 20 12 20 C9 20 6 17 6 12 Z" />
      <Line x1="12" y1="20" x2="12" y2="24" />
      <Line x1="8" y1="24" x2="16" y2="24" />
      <Path d="M6 6 H2 C2 10 4 12 6 12" />
      <Path d="M18 6 H22 C22 10 20 12 18 12" />
    </G>
  );
}

function RulerIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <G {...stroke(color, opacity)} transform="rotate(-18 14 8)">
      <Rect x="0" y="4" width="28" height="8" rx="2" />
      {[6, 12, 18, 24].map((x) => (
        <Line key={x} x1={x} y1="4" x2={x} y2="8" />
      ))}
    </G>
  );
}

function AtomIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <G {...stroke(color, opacity)}>
      <Circle cx="10" cy="10" r="3" />
      <Ellipse cx="10" cy="10" rx="14" ry="5" />
      <Ellipse cx="10" cy="10" rx="5" ry="14" transform="rotate(60 10 10)" />
      <Ellipse cx="10" cy="10" rx="5" ry="14" transform="rotate(-60 10 10)" />
    </G>
  );
}

function ClockFaceIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <G {...stroke(color, opacity)}>
      <Circle cx="10" cy="10" r="9" />
      <Line x1="10" y1="10" x2="10" y2="5" />
      <Line x1="10" y1="10" x2="14" y2="12" />
    </G>
  );
}

function ChecklistIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <G {...stroke(color, opacity)}>
      <Rect x="0" y="0" width="18" height="22" rx="3" />
      <Line x1="4" y1="6" x2="14" y2="6" />
      <Line x1="4" y1="11" x2="14" y2="11" />
      <Line x1="4" y1="16" x2="10" y2="16" />
      <Path d="M16 4 L18 6 L22 2" />
    </G>
  );
}

function BookmarkIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <G {...stroke(color, opacity)}>
      <Path d="M4 2 H14 V20 L9 16 L4 20 Z" />
    </G>
  );
}

function TrendLineIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <G {...stroke(color, opacity)}>
      <Line x1="2" y1="18" x2="22" y2="18" />
      <Path d="M4 16 L10 10 L14 13 L20 4" />
      <Line x1="16" y1="4" x2="20" y2="4" />
      <Line x1="20" y1="4" x2="20" y2="8" />
    </G>
  );
}

function TargetIcon({ color, opacity }: { color: string; opacity: number }) {
  return (
    <G {...stroke(color, opacity)}>
      <Circle cx="10" cy="10" r="9" />
      <Circle cx="10" cy="10" r="5" />
      <Circle cx="10" cy="10" r="1.5" fill={color} fillOpacity={opacity * 0.4} stroke="none" />
    </G>
  );
}

function OpenBookSmall({ color, opacity }: { color: string; opacity: number }) {
  return (
    <G {...stroke(color, opacity)}>
      <Path d="M0 10 C0 4 8 0 14 0 C16 0 18 1 18 2 V14 C12 16 6 16 0 14 Z" />
      <Path d="M18 2 C24 0 32 4 32 10 V14 C26 16 22 16 18 14 Z" />
      <Line x1="18" y1="2" x2="18" y2="14" />
    </G>
  );
}

/** Header: globe, abacus, molecule, books, pencil, compass, trophy, sparkles */
export function HeroDecorArt({ color, opacity = 0.16, width = '100%', height = '100%' }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 220" preserveAspectRatio="xMidYMid slice">
      <G {...stroke(color, opacity * 0.9)} transform="translate(262 58)">
        <Circle cx="0" cy="0" r="38" />
        <Ellipse cx="0" cy="0" rx="38" ry="13" />
        <Ellipse cx="0" cy="0" rx="13" ry="38" />
        <Line x1="-38" y1="0" x2="38" y2="0" />
        <Line x1="0" y1="-38" x2="0" y2="38" />
      </G>

      <G {...stroke(color, opacity * 0.85)} transform="translate(298 14)">
        <Rect x="0" y="0" width="48" height="56" rx="5" />
        {[16, 30, 44].map((y) => (
          <G key={y}>
            <Line x1="8" y1={y} x2="40" y2={y} />
            {[12, 24, 36].map((x) => (
              <Circle key={`${x}-${y}`} cx={x} cy={y} r="3.4" fill={color} fillOpacity={opacity * 0.5} stroke={color} strokeWidth={0.8} />
            ))}
          </G>
        ))}
      </G>

      <G transform="translate(24 20)">
        <AtomIcon color={color} opacity={opacity * 0.8} />
      </G>

      <G transform="translate(148 12)">
        <AtomIcon color={color} opacity={opacity * 0.55} />
      </G>

      <G transform="translate(52 108)">
        <OpenBookSmall color={color} opacity={opacity * 0.65} />
      </G>

      <G {...stroke(color, opacity * 0.7)} transform="translate(108 188)">
        <Path d="M0 14 C0 6 14 0 28 0 C42 0 56 6 56 14" />
        <Line x1="28" y1="0" x2="28" y2="14" />
        <Path d="M0 14 L28 28 L56 14" />
      </G>

      <G transform="translate(186 168)">
        <OpenBookSmall color={color} opacity={opacity * 0.6} />
      </G>

      <G transform="translate(72 6)">
        <PencilIcon color={color} opacity={opacity * 0.75} />
      </G>

      <G transform="translate(8 72)">
        <CompassIcon color={color} opacity={opacity * 0.7} />
      </G>

      <G transform="translate(128 4)">
        <TrophyIcon color={color} opacity={opacity * 0.65} />
      </G>

      <G transform="translate(232 4)">
        <RulerIcon color={color} opacity={opacity * 0.6} />
      </G>

      <G transform="translate(318 88)">
        <BookmarkIcon color={color} opacity={opacity * 0.55} />
      </G>

      <Sparkle x={88} y={48} size={14} color={color} opacity={opacity} />
      <Sparkle x={168} y={32} size={10} color={color} opacity={opacity * 0.9} />
      <Sparkle x={220} y={24} size={8} color={color} opacity={opacity * 0.85} />
      <Sparkle x={142} y={120} size={9} color={color} opacity={opacity * 0.8} />
      <Sparkle x={280} y={148} size={11} color={color} opacity={opacity * 0.75} />
      <Sparkle x={48} y={156} size={8} color={color} opacity={opacity * 0.7} />
      <CrossMark x={118} y={72} size={10} color={color} opacity={opacity * 0.75} />
      <CrossMark x={196} y={44} size={8} color={color} opacity={opacity * 0.7} />
      <CrossMark x={248} y={168} size={9} color={color} opacity={opacity * 0.65} />
    </Svg>
  );
}

/** Today: open book + gear + checklist + pencil + sparkles */
export function TodayProgressDecorArt({ color, opacity = 0.16, width, height }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 110 92">
      <G {...stroke(color, opacity)} transform="translate(10 28)">
        <Path d="M10 46 C10 30 22 20 38 20 C46 20 54 24 58 30" />
        <Path d="M58 30 L58 54 C42 60 26 60 10 54 Z" />
        <Path d="M58 30 C74 20 86 30 86 46 L86 54 C70 60 58 60 58 54 Z" />
        <Line x1="58" y1="30" x2="58" y2="54" />
        <Line x1="22" y1="38" x2="48" y2="38" />
        <Line x1="68" y1="38" x2="78" y2="38" />
      </G>
      <G {...stroke(color, opacity * 1.05)} transform="translate(58 0)">
        <Circle cx="18" cy="18" r="12" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 18 + Math.cos(rad) * 12;
          const y1 = 18 + Math.sin(rad) * 12;
          const x2 = 18 + Math.cos(rad) * 16;
          const y2 = 18 + Math.sin(rad) * 16;
          return <Line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        <Circle cx="18" cy="18" r="4.5" />
      </G>
      <G transform="translate(0 52)">
        <ChecklistIcon color={color} opacity={opacity * 0.85} />
      </G>
      <G transform="translate(2 4)">
        <PencilIcon color={color} opacity={opacity * 0.75} />
      </G>
      <G transform="translate(82 58)">
        <TargetIcon color={color} opacity={opacity * 0.7} />
      </G>
      <Sparkle x={22} y={62} size={8} color={color} opacity={opacity * 0.9} />
      <Sparkle x={92} y={18} size={7} color={color} opacity={opacity * 0.8} />
      <CrossMark x={68} y={72} size={7} color={color} opacity={opacity * 0.65} />
    </Svg>
  );
}

/** Study: hourglass + clock + compass + 3, 6, 9 */
export function StudyTimeDecorArt({ color, opacity = 0.16, width, height }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 104 100">
      <G {...stroke(color, opacity)} transform="translate(22 10)">
        <Path d="M20 6 H36 L28 38 L36 70 H20 L28 38 Z" />
        <Line x1="22" y1="14" x2="34" y2="14" />
        <Line x1="22" y1="62" x2="34" y2="62" />
        <Line x1="24" y1="38" x2="32" y2="38" />
      </G>
      <G transform="translate(72 4)">
        <ClockFaceIcon color={color} opacity={opacity * 0.85} />
      </G>
      <G transform="translate(0 58)">
        <CompassIcon color={color} opacity={opacity * 0.7} />
      </G>
      <G transform="translate(78 68)">
        <RulerIcon color={color} opacity={opacity * 0.65} />
      </G>
      {[
        { n: '3', x: 10, y: 32 },
        { n: '6', x: 86, y: 54 },
        { n: '9', x: 12, y: 78 },
        { n: '12', x: 80, y: 28 },
      ].map(({ n, x, y }) => (
        <SvgText
          key={n}
          x={x}
          y={y}
          fill={color}
          opacity={opacity * 0.9}
          fontSize="11"
          fontWeight="600"
        >
          {n}
        </SvgText>
      ))}
      <Sparkle x={58} y={8} size={7} color={color} opacity={opacity * 0.8} />
    </Svg>
  );
}

/** Week: calendar with shapes + bookmark + sparkles */
export function WeekDecorArt({ color, opacity = 0.16, width, height }: ArtProps) {
  const cellShapes = [
    { row: 0, col: 1, type: 'star' },
    { row: 0, col: 3, type: 'circle' },
    { row: 1, col: 2, type: 'square' },
    { row: 1, col: 3, type: 'circle' },
    { row: 2, col: 0, type: 'diamond' },
    { row: 2, col: 2, type: 'star' },
  ];

  return (
    <Svg width={width} height={height} viewBox="0 0 104 100">
      <G {...stroke(color, opacity)}>
        <Rect x="12" y="10" width="76" height="80" rx="8" />
        <Rect x="12" y="10" width="76" height="18" rx="8" />
        <Line x1="12" y1="28" x2="88" y2="28" />
        <Line x1="32" y1="10" x2="32" y2="28" />
        <Line x1="52" y1="10" x2="52" y2="28" />
        <Line x1="72" y1="10" x2="72" y2="28" />
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <Rect
              key={`${row}-${col}`}
              x={20 + col * 16}
              y={34 + row * 16}
              width="10"
              height="10"
              rx="2"
            />
          ))
        )}
      </G>
      {cellShapes.map(({ row, col, type }) => {
        const cx = 25 + col * 16;
        const cy = 39 + row * 16;
        if (type === 'star') {
          return (
            <Path
              key={`${row}-${col}`}
              d={`M${cx} ${cy - 4} L${cx + 1.2} ${cy - 1.2} L${cx + 4} ${cy - 1.2} L${cx + 1.8} ${cy + 0.6} L${cx + 2.8} ${cy + 3.6} L${cx} ${cy + 2} L${cx - 2.8} ${cy + 3.6} L${cx - 1.8} ${cy + 0.6} L${cx - 4} ${cy - 1.2} L${cx - 1.2} ${cy - 1.2} Z`}
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={opacity * 0.95}
            />
          );
        }
        if (type === 'square') {
          return (
            <Rect
              key={`${row}-${col}`}
              x={cx - 3}
              y={cy - 3}
              width="6"
              height="6"
              rx="1"
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={opacity * 0.95}
            />
          );
        }
        if (type === 'circle') {
          return (
            <Circle
              key={`${row}-${col}`}
              cx={cx}
              cy={cy}
              r="3"
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={opacity * 0.95}
            />
          );
        }
        return (
          <Path
            key={`${row}-${col}`}
            d={`M${cx} ${cy - 3.5} L${cx + 3.5} ${cy} L${cx} ${cy + 3.5} L${cx - 3.5} ${cy} Z`}
            fill="none"
            stroke={color}
            strokeWidth={1}
            opacity={opacity * 0.95}
          />
        );
      })}
      <G transform="translate(0 0)">
        <BookmarkIcon color={color} opacity={opacity * 0.8} />
      </G>
      <G transform="translate(82 72)">
        <PencilIcon color={color} opacity={opacity * 0.7} />
      </G>
      <Sparkle x={78} y={48} size={10} color={color} opacity={opacity} />
      <Sparkle x={26} y={66} size={8} color={color} opacity={opacity * 0.85} />
      <CrossMark x={92} y={14} size={7} color={color} opacity={opacity * 0.65} />
    </Svg>
  );
}

/** Efficiency: lightbulb with bar chart + trend line + target */
export function EfficiencyDecorArt({ color, opacity = 0.16, width, height }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 104 92">
      <G {...stroke(color, opacity)} transform="translate(28 6)">
        <Path d="M22 4 C10 4 2 16 2 28 C2 36 8 42 12 48 L12 56 H32 L32 48 C36 42 42 36 42 28 C42 16 34 4 22 4 Z" />
        <Line x1="16" y1="56" x2="28" y2="56" />
        <Line x1="18" y1="60" x2="26" y2="60" />
        <Line x1="20" y1="4" x2="20" y2="0" />
        <Line x1="24" y1="4" x2="24" y2="0" />
        <Line x1="10" y1="44" x2="34" y2="44" />
        <Rect x="12" y="32" width="6" height="12" rx="1.5" />
        <Rect x="20" y="24" width="6" height="20" rx="1.5" />
        <Rect x="28" y="16" width="6" height="28" rx="1.5" />
      </G>
      <G transform="translate(0 52)">
        <TrendLineIcon color={color} opacity={opacity * 0.8} />
      </G>
      <G transform="translate(78 4)">
        <TargetIcon color={color} opacity={opacity * 0.75} />
      </G>
      <G transform="translate(4 8)">
        <AtomIcon color={color} opacity={opacity * 0.6} />
      </G>
      <Sparkle x={88} y={68} size={8} color={color} opacity={opacity * 0.85} />
      <CrossMark x={68} y={78} size={7} color={color} opacity={opacity * 0.65} />
    </Svg>
  );
}

/** Calendar header: graduation cap + book + pencil + sparkles */
export function CalendarDecorArt({ color, opacity = 0.18, width, height }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 148 84">
      <G {...stroke(color, opacity)} transform="translate(28 8)">
        <Path d="M50 10 L6 28 L50 46 L94 28 Z" />
        <Path d="M24 34 V54 C24 62 36 66 50 66 C64 66 76 62 76 54 V34" />
        <Line x1="94" y1="28" x2="94" y2="50" />
        <Circle cx="94" cy="54" r="3.5" fill={color} fillOpacity={opacity * 0.4} stroke={color} strokeWidth={1} />
        <Line x1="50" y1="46" x2="50" y2="58" />
      </G>
      <G transform="translate(0 20)">
        <OpenBookSmall color={color} opacity={opacity * 0.75} />
      </G>
      <G transform="translate(6 2)">
        <PencilIcon color={color} opacity={opacity * 0.7} />
      </G>
      <G transform="translate(118 48)">
        <TrophyIcon color={color} opacity={opacity * 0.65} />
      </G>
      <Sparkle x={122} y={18} size={12} color={color} opacity={opacity * 1.1} />
      <Sparkle x={108} y={42} size={8} color={color} opacity={opacity * 0.85} />
      <CrossMark x={100} y={28} size={7} color={color} opacity={opacity * 0.75} />
      <CrossMark x={134} y={8} size={6} color={color} opacity={opacity * 0.65} />
    </Svg>
  );
}

/** Faint screen-level education icons between cards */
export function ScreenDecorArt({ color = '#86efac', opacity = 0.12, width = '100%', height = '100%' }: ArtProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 360 800" preserveAspectRatio="xMidYMid slice">
      <G transform="translate(300 120)">
        <AtomIcon color={color} opacity={opacity} />
      </G>
      <G transform="translate(16 280)">
        <OpenBookSmall color={color} opacity={opacity * 0.9} />
      </G>
      <G transform="translate(310 420)">
        <CompassIcon color={color} opacity={opacity * 0.85} />
      </G>
      <G transform="translate(24 560)">
        <PencilIcon color={color} opacity={opacity * 0.8} />
      </G>
      <G transform="translate(290 640)">
        <BookmarkIcon color={color} opacity={opacity * 0.75} />
      </G>
      <G transform="translate(40 720)">
        <TrophyIcon color={color} opacity={opacity * 0.7} />
      </G>
      <Sparkle x={180} y={200} size={10} color={color} opacity={opacity} />
      <Sparkle x={320} y={320} size={8} color={color} opacity={opacity * 0.85} />
      <Sparkle x={48} y={480} size={9} color={color} opacity={opacity * 0.8} />
      <CrossMark x={200} y={380} size={8} color={color} opacity={opacity * 0.7} />
      <CrossMark x={100} y={620} size={7} color={color} opacity={opacity * 0.65} />
    </Svg>
  );
}
