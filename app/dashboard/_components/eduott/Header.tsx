import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { STUDENT, STUDENT_RADIUS, STUDENT_SPACING, STUDENT_TYPO } from '../../../../src/theme/student';

interface HeaderProps {
  username: string;
  dashboardLabel?: string;
}

function HeaderComponent({ username, dashboardLabel = 'Student Dashboard' }: HeaderProps) {
  const initial = (username || 'S').trim().charAt(0).toUpperCase();

  return (
    <LinearGradient
      colors={[...STUDENT.heroGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topRow}>
        <View style={styles.userBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View>
            <Text style={styles.smallText}>{dashboardLabel}</Text>
            <Text style={styles.title}>EduOTT</Text>
            <Text style={styles.exclusiveBadge}>IIT EXCLUSIVE</Text>
            <Text style={styles.welcomeText}>IIT track videos · Welcome, {username}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: STUDENT_RADIUS.xxl,
    paddingHorizontal: STUDENT_SPACING.md,
    paddingVertical: 14,
    marginBottom: 12,
    ...STUDENT.shadow.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  userBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    color: STUDENT.textOnPrimary,
    fontWeight: '800',
    fontSize: 16,
  },
  smallText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginBottom: 2,
  },
  title: {
    ...STUDENT_TYPO.section,
    color: STUDENT.textOnPrimary,
    lineHeight: 28,
  },
  exclusiveBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.55)',
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
});

export default memo(HeaderComponent);
