/**
 * SVG icons for teacher card — renders reliably on Android/iOS
 * without depending on icon font loading (MaterialCommunityIcons / Ionicons).
 */
import Svg, { Path, Rect } from 'react-native-svg';

type IconProps = { size?: number; color?: string };

/** Modal close (X) — stroke only, works without icon fonts */
export function SvgIconClose({ size = 24, color = '#64748b' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        fill="none"
        d="M18 6L6 18M6 6l12 12"
      />
    </Svg>
  );
}

/**
 * Checkbox for assign modals — same look as web (unchecked square / checked blue + white tick).
 * Uses SVG only so it always renders on Android.
 */
export function SvgCheckbox({ checked, size = 22 }: { checked: boolean; size?: number }) {
  if (checked) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path fill="#2563eb" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
        <Path
          stroke="#fff"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          d="M7 12l3 3 7-7"
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="4" y="4" width="16" height="16" rx="3" stroke="#94a3b8" strokeWidth={2} fill="#fff" />
    </Svg>
  );
}

/** Two people / group — "manage" */
export function SvgIconPeople({ size = 22, color = '#c2410c' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        fill={color}
        d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
      />
    </Svg>
  );
}

/** Open book — subjects / learning */
export function SvgIconBook({ size = 22, color = '#047857' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        fill={color}
        d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"
      />
    </Svg>
  );
}

/** Book with bookmark — daily diary (matches web BookMarked) */
export function SvgIconBookMarked({ size = 22, color = '#4338ca' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        fill={color}
        d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12V4H6V2zm0 4h10v12H6V6zm12 0h2v14h-2V6z"
      />
      <Path fill={color} d="M14 2v4h4L14 2z" />
    </Svg>
  );
}

/** Trash — delete */
export function SvgIconTrash({ size = 22, color = '#b91c1c' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        fill={color}
        d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
      />
    </Svg>
  );
}

/** Detail rows */
export function SvgIconPhone({ size = 18, color = '#64748b' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
      />
    </Svg>
  );
}

export function SvgIconSchool({ size = 18, color = '#64748b' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z"
      />
    </Svg>
  );
}

export function SvgIconCertificate({ size = 18, color = '#64748b' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
      />
    </Svg>
  );
}

/** Email */
export function SvgIconMail({ size = 18, color = '#64748b' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
      />
    </Svg>
  );
}

/** View / preview */
export function SvgIconEye({ size = 24, color = '#0284c7' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      />
    </Svg>
  );
}

/** Edit */
export function SvgIconPencil({ size = 24, color = '#0d9488' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
      />
    </Svg>
  );
}
