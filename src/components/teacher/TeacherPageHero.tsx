import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TEACHER } from '../../theme/teacher';

export type TeacherPageHeroTone = 'portal' | 'eduott' | 'paths';

const TONES: Record<TeacherPageHeroTone, readonly [string, string, string]> = {
  portal: ['#4F46E5', '#6550DF', '#7C3AED'],
  eduott: ['#0F172A', '#1E293B', '#134E4A'],
  paths: ['#2F5BFF', '#3558E8', '#2A3FD4'],
};

type Props = {
  /** Small uppercase pill — defaults to `title`. */
  badge?: string;
  title: string;
  /** Second line of the heading, tinted. */
  accent?: string;
  accentColor?: string;
  subtitle?: string;
  extraBadge?: string;
  tone?: TeacherPageHeroTone;
  icon?: keyof typeof Ionicons.glyphMap;
};

/** Matches web `PortalPageHero` / page heroes on the teacher portal. */
export default function TeacherPageHero({
  badge,
  title,
  accent,
  accentColor,
  subtitle,
  extraBadge,
  tone = 'portal',
  icon = 'sparkles-outline',
}: Props) {
  const colors = TONES[tone];

  return (
    <LinearGradient colors={[...colors]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.glow} />
      <Ionicons name="sparkles" size={18} color="rgba(255,255,255,0.22)" style={styles.sparkle} />
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Ionicons name={icon} size={12} color="#fff" />
          <Text style={styles.badgeText}>{badge || title}</Text>
        </View>
        {extraBadge ? (
          <View style={styles.extraBadge}>
            <Ionicons name="flash" size={11} color="#FDE68A" />
            <Text style={styles.extraBadgeText}>{extraBadge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title}>
        {title}
        {accent ? <Text style={[styles.accent, accentColor ? { color: accentColor } : null]}>{` ${accent}`}</Text> : null}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.3)',
    ...TEACHER.shadow.lg,
  },
  glow: {
    position: 'absolute',
    right: -48,
    top: -64,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  sparkle: {
    position: 'absolute',
    right: 22,
    top: 22,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  extraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(251,191,36,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.4)',
  },
  extraBadgeText: {
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#fff',
  },
  accent: {
    color: '#C4B5FD',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
  },
});
