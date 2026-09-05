import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { GlassPanel } from '../../../src/components/ui';

export default function RemarksView() {
  const [remarks, setRemarks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRemarks();
  }, []);

  const fetchRemarks = async () => {
    try {
      setIsLoading(true);
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/remarks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRemarks(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch remarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubble-ellipses" size={24} color="#3b82f6" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Teacher Remarks</Text>
          <Text style={styles.headerSubtitle}>Feedback From Your Teachers</Text>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      ) : remarks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={64} color="#5B6779" />
          <Text style={styles.emptyStateTitle}>No Remarks Yet</Text>
          <Text style={styles.emptyStateText}>Your Teachers Haven't Left Any Remarks Yet.</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {remarks.map((remark: any) => (
            <GlassPanel
              key={remark._id}
              radius={12}
              tone="strong"
              style={[
                styles.remarkCard,
                remark.isPositive ? styles.remarkCardPositive : styles.remarkCardNegative
              ]}
            >
              <View style={styles.remarkHeader}>
                <View style={styles.remarkHeaderLeft}>
                  <Ionicons
                    name={remark.isPositive ? 'thumbs-up' : 'alert-circle'}
                    size={20}
                    color={remark.isPositive ? '#10b981' : '#fb923c'}
                  />
                  <Text style={styles.remarkType}>
                    {remark.isPositive ? 'Positive Feedback' : 'Needs Improvement'}
                  </Text>
                </View>
                <Text style={styles.remarkDate}>
                  {new Date(remark.createdAt || remark.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </View>
              <Text style={styles.remarkText}>{remark.message || remark.remark}</Text>
              {remark.teacherName && (
                <Text style={styles.remarkTeacher}>— {remark.teacherName}</Text>
              )}
            </GlassPanel>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#5B6779',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  remarkCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  // The frosted panel supplies the surface now, so positive/negative reads from
  // the coloured left rule and the icon rather than a solid fill.
  remarkCardPositive: {
    borderLeftColor: '#10b981',
  },
  remarkCardNegative: {
    borderLeftColor: '#fb923c',
  },
  remarkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  remarkHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remarkType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  remarkDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  remarkText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
    marginBottom: 8,
  },
  remarkTeacher: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6b7280',
  },
});






