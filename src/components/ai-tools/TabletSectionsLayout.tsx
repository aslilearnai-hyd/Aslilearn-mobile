import { Fragment, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { aiToolViewerTabletStyles } from './ai-tool-tablet-layout';

export type TabletSectionItem = {
  key: string;
  node: ReactNode;
  fullWidth?: boolean;
};

/** Tablet: independent L/R columns — avoids row-grid gaps between uneven section heights. */
export function TabletSectionsLayout({
  sections,
  isTablet,
  style,
}: {
  sections: TabletSectionItem[];
  isTablet: boolean;
  style?: ViewStyle;
}) {
  if (!isTablet) {
    return (
      <View style={style}>
        {sections.map((section) => (
          <Fragment key={section.key}>{section.node}</Fragment>
        ))}
      </View>
    );
  }

  const blocks: ReactNode[] = [];
  let compact: TabletSectionItem[] = [];

  const flushCompact = () => {
    if (!compact.length) return;
    const left = compact.filter((_, index) => index % 2 === 0);
    const right = compact.filter((_, index) => index % 2 === 1);
    blocks.push(
      <View key={`tablet-cols-${blocks.length}`} style={aiToolViewerTabletStyles.sectionsGrid}>
        <View style={aiToolViewerTabletStyles.sectionsColumn}>
          {left.map((section) => (
            <Fragment key={section.key}>{section.node}</Fragment>
          ))}
        </View>
        <View style={aiToolViewerTabletStyles.sectionsColumn}>
          {right.map((section) => (
            <Fragment key={section.key}>{section.node}</Fragment>
          ))}
        </View>
      </View>,
    );
    compact = [];
  };

  for (const section of sections) {
    if (section.fullWidth) {
      flushCompact();
      blocks.push(<Fragment key={section.key}>{section.node}</Fragment>);
    } else {
      compact.push(section);
    }
  }
  flushCompact();

  return <View style={style}>{blocks}</View>;
}
