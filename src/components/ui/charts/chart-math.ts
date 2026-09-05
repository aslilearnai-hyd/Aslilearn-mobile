export function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export type ChartPadding = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export const DEFAULT_CHART_PADDING: ChartPadding = {
  left: 36,
  top: 14,
  right: 12,
  bottom: 36,
};

export function getPlotArea(width: number, height: number, padding: ChartPadding) {
  return {
    width: width - padding.left - padding.right,
    height: height - padding.top - padding.bottom,
    baseX: padding.left,
    baseY: height - padding.bottom,
    topY: padding.top,
  };
}
