import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useBackNavigation } from '../../src/hooks/useBackNavigation';
import { collectVidyaSubjectLabels } from '../../src/lib/vidya-subjects';
import teacherService, { asArray } from '../../src/services/api/teacherService';
import { TEACHER, TEACHER_SPACING } from '../../src/theme/teacher';
import AppBackground from '../../src/components/ui/AppBackground';
import VidyaAvatar from '../../src/components/vidya/VidyaAvatar';
import { isVidyaEnabledForUser } from '../../src/lib/vidya-access';
import VidyaAIViewChat from './_components/VidyaAIViewChat';

function extractSubjectNames(subs: any[]): string[] {
  return subs
    .map((s) => (typeof s === 'string' ? s : s?.name || s?.title || s?.subjectName))
    .filter(Boolean)
    .map(String);
}

export default function TeacherVidyaChatScreen() {
  useBackNavigation('/teacher/dashboard', false);

  const [teacherId, setTeacherId] = useState('');
  const [teacherName, setTeacherName] = useState<string | undefined>();
  const [primarySubject, setPrimarySubject] = useState<string | undefined>();
  const [subjectOptions, setSubjectOptions] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await teacherService.me();
        const user = res.data?.user ?? res.data;
        if (!isVidyaEnabledForUser(user)) {
          router.replace('/teacher/dashboard');
          return;
        }
        if (user?._id || user?.id) {
          setTeacherId(user._id || user.id);
        }
        setTeacherName(user?.fullName || user?.email?.split('@')[0] || 'Teacher');

        const subs = asArray<any>(user?.subjects || user?.assignedSubjects || []);
        const names = extractSubjectNames(subs);
        const merged = collectVidyaSubjectLabels({
          subjects: subs,
          assignedSubjects: user?.assignedSubjects,
        });
        const options = merged.length > 0 ? merged : names.length > 0 ? names : ['General'];
        setSubjectOptions(options);
        setPrimarySubject(options[0]);
      } catch (error) {
        console.error('Failed to load teacher profile for chat:', error);
      }
    })();
  }, []);

  return (
    <AppBackground>
      <SafeAreaView style={styles.screen} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <LinearGradient
            colors={[...TEACHER.headerGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={TEACHER.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Vidya AI Chat</Text>
            <Text style={styles.subtitle}>AI-Powered Teaching Assistant</Text>
          </View>
          <View style={styles.headerIcon}>
            <VidyaAvatar size={40} borderColor="#93c5fd" />
          </View>
        </View>

        <View style={styles.body}>
          {!teacherId ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={TEACHER.primaryLight} />
            </View>
          ) : (
            <VidyaAIViewChat
              teacherId={teacherId}
              teacherName={teacherName}
              subject={primarySubject}
              subjectOptions={subjectOptions}
              fullPage
              standalone
            />
          )}
        </View>
      </SafeAreaView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TEACHER_SPACING.md,
    paddingHorizontal: TEACHER_SPACING.lg,
    paddingVertical: TEACHER_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: TEACHER.surfaceBorder,
    // The gradient is absoluteFill so it needs no clipping, and overflow:'hidden'
    // here clips the last glyph of the flex:1 title on Android.
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: TEACHER.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: TEACHER.textMuted,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: TEACHER.navActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#F4F7FB',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7FB',
  },
});
