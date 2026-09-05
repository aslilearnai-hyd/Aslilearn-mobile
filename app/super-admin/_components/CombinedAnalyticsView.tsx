import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SchoolSummary } from '../../../src/lib/super-admin-analytics';
import AnalyticsView from './AnalyticsView';
import AIAnalyticsView from './AIAnalyticsView';

type MainTab = 'overview' | 'ai';

type CombinedAnalyticsViewProps = {
  defaultTab?: MainTab;
};

export default function CombinedAnalyticsView({ defaultTab = 'overview' }: CombinedAnalyticsViewProps) {
  const [mainTab, setMainTab] = useState<MainTab>(defaultTab);
  const [focusAdminId, setFocusAdminId] = useState<string | null>(null);

  const handleSelectSchool = (admin: SchoolSummary) => {
    setFocusAdminId(admin.id);
    setMainTab('ai');
  };

  const handleClearSchoolFocus = () => {
    setFocusAdminId(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainTabs}>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'overview' && styles.mainTabActive]}
          onPress={() => setMainTab('overview')}
        >
          <Ionicons
            name="bar-chart"
            size={18}
            color={mainTab === 'overview' ? '#fff' : '#6b7280'}
          />
          <Text style={[styles.mainTabText, mainTab === 'overview' && styles.mainTabTextActive]}>
            Platform Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, mainTab === 'ai' && styles.mainTabActive]}
          onPress={() => setMainTab('ai')}
        >
          <Ionicons
            name="hardware-chip-outline"
            size={18}
            color={mainTab === 'ai' ? '#fff' : '#6b7280'}
          />
          <Text style={[styles.mainTabText, mainTab === 'ai' && styles.mainTabTextActive]}>
            Exam & AI Insights
          </Text>
        </TouchableOpacity>
      </View>

      {mainTab === 'overview' ? (
        <AnalyticsView onSelectSchool={handleSelectSchool} />
      ) : (
        <AIAnalyticsView
          singleAdminId={focusAdminId}
          onClearSchoolFocus={handleClearSchoolFocus}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  mainTabActive: {
    backgroundColor: '#fb923c',
  },
  mainTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  mainTabTextActive: {
    color: '#fff',
  },
});
