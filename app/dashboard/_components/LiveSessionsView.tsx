import { storageGetItem } from '../../../src/lib/safe-storage';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../../src/lib/api-config';
import { router } from 'expo-router';
import { GlassPanel } from '../../../src/components/ui';

interface LiveSession {
  _id: string;
  title: string;
  description?: string;
  playbackUrl?: string;
  hlsUrl?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  viewerCount?: number;
  scheduledTime?: string;
  streamer?: {
    fullName: string;
    email: string;
  };
  subject?: {
    _id: string;
    name: string;
  } | string;
  chatEnabled?: boolean;
}

export default function LiveSessionsView() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'live' | 'scheduled' | 'ended'>('all');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const token = await storageGetItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/student/streams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.data || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (filterStatus === 'all') return true;
    return session.status === filterStatus;
  });

  const handleSessionPress = (session: LiveSession) => {
    if (session.status === 'live') {
      router.push(`/live-stream?sessionId=${session._id}`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading Sessions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <GlassPanel radius={0} bordered={false} tone="light" style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'live', 'scheduled', 'ended'].map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, filterStatus === status && styles.filterChipActive]}
              onPress={() => setFilterStatus(status as any)}
            >
              <Text style={[styles.filterChipText, filterStatus === status && styles.filterChipTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </GlassPanel>

      {/* Sessions List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredSessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="videocam-off" size={64} color="#5B6779" />
            <Text style={styles.emptyText}>No Live Sessions Found</Text>
            <Text style={styles.emptySubtext}>Live Sessions Will Appear Here When Available</Text>
          </View>
        ) : (
          filteredSessions.map((session) => {
            const subjectName = typeof session.subject === 'object'
              ? session.subject?.name
              : session.subject || 'General';
            const isLive = session.status === 'live';
            const isScheduled = session.status === 'scheduled';

            return (
              <TouchableOpacity
                key={session._id}
                onPress={() => handleSessionPress(session)}
                disabled={!isLive}
              >
                <GlassPanel radius={12} style={[styles.sessionCard, isLive && styles.sessionCardLive]}>
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle} numberOfLines={2}>{session.title}</Text>
                      <Text style={styles.sessionSubject}>{subjectName}</Text>
                    </View>
                    {isLive && (
                      <View style={styles.liveBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                      </View>
                    )}
                  </View>

                  {session.description && (
                    <Text style={styles.sessionDescription} numberOfLines={2}>
                      {session.description}
                    </Text>
                  )}

                  <View style={styles.sessionMeta}>
                    {session.streamer && (
                      <View style={styles.metaItem}>
                        <Ionicons name="person" size={16} color="#6b7280" />
                        <Text style={styles.metaText}>{session.streamer.fullName}</Text>
                      </View>
                    )}
                    {session.viewerCount !== undefined && (
                      <View style={styles.metaItem}>
                        <Ionicons name="people" size={16} color="#6b7280" />
                        <Text style={styles.metaText}>{session.viewerCount} Viewers</Text>
                      </View>
                    )}
                    {isScheduled && session.scheduledTime && (
                      <View style={styles.metaItem}>
                        <Ionicons name="time" size={16} color="#6b7280" />
                        <Text style={styles.metaText}>
                          {new Date(session.scheduledTime).toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {isLive && (
                    <TouchableOpacity
                      style={styles.watchButton}
                      onPress={() => handleSessionPress(session)}
                    >
                      <Ionicons name="play" size={20} color="#fff" />
                      <Text style={styles.watchButtonText}>Watch Live</Text>
                    </TouchableOpacity>
                  )}
                </GlassPanel>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Transparent so the app background artwork shows through.
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#ef4444',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionCardLive: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sessionSubject: {
    fontSize: 14,
    color: '#6b7280',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  sessionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  sessionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: '#6b7280',
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  watchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});


