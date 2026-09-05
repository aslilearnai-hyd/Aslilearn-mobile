/**
 * School provisioning is super-admin only.
 * Kept as a stub so any stale deep-link does not call /api/super-admin/*.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function SchoolManagementView() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>School Management</Text>
      <Text style={styles.body}>
        Creating and editing schools is available only in the Super Admin app. School admins manage
        teachers, students, classes, and content for their own school from the Dashboard menu.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#0f172a' },
  body: { fontSize: 15, lineHeight: 22, color: '#475569' },
});
