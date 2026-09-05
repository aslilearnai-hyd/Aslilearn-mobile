import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api/api';
import { useSchoolProgram } from '../../hooks/useSchoolProgram';
import { prepareLibraryContents } from '../../lib/dedupe-library-content';
import { openDigitalLibraryType } from '../../lib/digital-library-nav';
import PremiumSectionHeader from './PremiumSectionHeader';
import { STUDENT, STUDENT_RADIUS, SUBJECT_COLORS } from '../../theme/student';
import { GLASS_ROW } from '../../theme/glass';
import GlassPanel from '../ui/GlassPanel';

type Props = {
  returnTo?: 'learning';
  showHeader?: boolean;
  dark?: boolean;
};

const GRID_GAP = 8;

export default function DigitalLibraryBrowseSection({
  returnTo = 'learning',
  showHeader = true,
  dark,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const { isAsliPrepExclusive, libraryTiles, loading: programLoading } = useSchoolProgram();
  const [allContent, setAllContent] = useState<{ type?: string }[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [gridWidth, setGridWidth] = useState(0);

  // Phones: 2 cols (tight 2×3). Tablets: 3 cols.
  const cols = windowWidth >= 768 ? 3 : 2;
  const tileWidth =
    gridWidth > 0 ? Math.floor((gridWidth - GRID_GAP * (cols - 1)) / cols) : undefined;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingContent(true);
      try {
        const { data } = await api.get('/api/student/asli-prep-content', {
          params: { surface: 'learning-path' },
        });
        if (cancelled) return;
        setAllContent(prepareLibraryContents(data?.data || data || [], isAsliPrepExclusive, { surface: 'learning-path' }));
      } catch {
        if (!cancelled) setAllContent([]);
      } finally {
        if (!cancelled) setIsLoadingContent(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isAsliPrepExclusive]);

  const libraryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    libraryTiles.forEach((tile) => {
      counts[tile.type] = 0;
    });
    allContent.forEach((item) => {
      const t = item.type || 'Material';
      if (counts[t] != null) counts[t] += 1;
    });
    return counts;
  }, [allContent, libraryTiles]);

  return (
    <View style={styles.wrap}>
      {showHeader ? (
        <PremiumSectionHeader
          title="Digital Library"
          subtitle="Browse By Type"
          icon="library-outline"
          accent={STUDENT.accent}
        />
      ) : null}

      {programLoading || isLoadingContent ? (
        <ActivityIndicator color={STUDENT.primary} style={styles.loader} />
      ) : (
        <View
          style={styles.grid}
          onLayout={(event) => {
            const next = Math.floor(event.nativeEvent.layout.width);
            if (next > 0 && next !== gridWidth) setGridWidth(next);
          }}
        >
          {libraryTiles.map((tile, index) => {
            const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
            return (
              <TouchableOpacity
                key={tile.key}
                style={[
                  styles.tileWrap,
                  tileWidth != null ? { width: tileWidth } : styles.tileWrapFallback,
                ]}
                activeOpacity={0.88}
                onPress={() => openDigitalLibraryType(tile.type, returnTo)}
                accessibilityRole="button"
                accessibilityLabel={tile.label}
              >
                <GlassPanel
                  tone="light"
                  radius={STUDENT_RADIUS.lg}
                  style={styles.tile}
                  contentStyle={styles.tileInner}
                >
                  <View
                    style={[
                      styles.tileIcon,
                      { backgroundColor: `${color}20`, borderColor: `${color}40` },
                    ]}
                  >
                    <Ionicons
                      name={tile.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={color}
                    />
                  </View>
                  <Text style={[styles.tileLabel, dark && styles.tileLabelDark]} numberOfLines={2}>
                    {tile.label}
                  </Text>
                  <Text style={styles.tileCount}>{libraryCounts[tile.type] ?? 0} files</Text>
                </GlassPanel>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  loader: {
    marginVertical: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: GRID_GAP,
  },
  tileWrap: {},
  tileWrapFallback: {
    width: '48%',
  },
  tile: {
    width: '100%',
  },
  tileInner: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 4,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: STUDENT.text,
    textAlign: 'center',
  },
  tileLabelDark: {
    color: STUDENT.text,
  },
  tileCount: {
    fontSize: 11,
    fontWeight: '600',
    color: STUDENT.textMuted,
    backgroundColor: GLASS_ROW.fillSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
