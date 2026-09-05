import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { STUDENT, STUDENT_SPACING, STUDENT_TYPO } from '../../../src/theme/student';
import VidyaAIView from './VidyaAIView';

export default function AITabView({
  chatEnabled = true,
  user,
}: {
  chatEnabled?: boolean;
  user?: any;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.vidyaHeader}>
        <Text style={styles.vidyaTitle}>Vidya AI</Text>
        <Text style={styles.vidyaSubtitle}>
          {chatEnabled ? 'Tools and Ask Vidya — same as the web app' : 'Your AI study tools'}
        </Text>
      </View>
      <VidyaAIView chatEnabled={chatEnabled} user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  vidyaHeader: {
    marginBottom: STUDENT_SPACING.lg,
  },
  vidyaTitle: {
    ...STUDENT_TYPO.section,
    fontSize: 20,
    color: STUDENT.text,
  },
  vidyaSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: STUDENT.textMuted,
    lineHeight: 18,
  },
});
