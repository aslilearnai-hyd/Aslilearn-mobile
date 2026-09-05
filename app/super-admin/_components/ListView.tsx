import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api/api';
import { GlassPanel } from '../../../src/components/ui';
import { SUPER_ADMIN_FLOATING_TAB_BAR_PAD } from '../../../src/lib/responsive-layout';

interface ListViewProps {
  title: string;
  endpoint: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function ListView({ title, endpoint, icon }: ListViewProps) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchItems();
  }, [endpoint]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      setError('');
      const response = await api.get(endpoint);
      const data = response?.data;
      setItems(Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []));
    } catch (err: any) {
      setError(err?.friendlyMessage || 'Error fetching items.');
      console.error('Error fetching items:', err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {isLoading ? (
        <ActivityIndicator size="large" color="#f97316" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.listContainer}>
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name={icon} size={64} color="#5B6779" />
              <Text style={styles.emptyText}>No Items Found</Text>
            </View>
          ) : (
            items.map((item, index) => (
              <GlassPanel key={item.id || item._id || index} style={styles.listItem} radius={10} tone="medium">
                <View style={styles.listItemInner}>
                  <Ionicons name={icon} size={32} color="#f97316" />
                  <View style={styles.listItemText}>
                    <Text style={styles.listItemTitle}>{item.title || item.name || 'Untitled'}</Text>
                    {item.description && <Text style={styles.listItemSubtitle} numberOfLines={2}>{item.description}</Text>}
                  </View>
                </View>
              </GlassPanel>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  scrollContent: { paddingBottom: SUPER_ADMIN_FLOATING_TAB_BAR_PAD + 48, flexGrow: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 21, fontWeight: '800', color: '#111827' },
  errorText: { color: '#dc2626', paddingHorizontal: 16, marginBottom: 8, fontSize: 13 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  listItem: { borderRadius: 10, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  // Row layout and padding move inside the frosted panel.
  listItemInner: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  listItemText: { flex: 1, marginLeft: 12 },
  listItemTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  listItemSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: '#5B6779', marginTop: 16 },
});






