import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, InteractionManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import authService from '../../../src/services/api/authService';
import AdminVidyaChatPanel from './AdminVidyaChatPanel';
import { AdminSkeletonList, useAdminTheme } from '../_ui';

type Props = {
  adminId?: string | null;
  adminName?: string;
};

export default function VidyaAIView({ adminId: adminIdProp, adminName: adminNameProp }: Props) {
  const { colors } = useAdminTheme();
  const [adminId, setAdminId] = useState<string | null>(adminIdProp || null);
  const [adminName, setAdminName] = useState(adminNameProp || 'Admin');
  const [loadingUser, setLoadingUser] = useState(!adminIdProp);
  /** Defer chat panel until the tab transition has painted. */
  const [panelReady, setPanelReady] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setPanelReady(true));
    const fallback = setTimeout(() => setPanelReady(true), 220);
    return () => {
      task.cancel();
      clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (adminIdProp) {
      setAdminId(adminIdProp);
      if (adminNameProp) setAdminName(adminNameProp);
      setLoadingUser(false);
      return;
    }

    let cancelled = false;
    authService
      .me()
      .then((data) => {
        if (cancelled) return;
        const user = data?.user;
        if (user) {
          setAdminId(String(user._id || user.id || ''));
          setAdminName(
            user.schoolName || user.fullName || user.email?.split('@')[0] || 'Admin'
          );
        }
      })
      .catch(() => null)
      .finally(() => {
        if (!cancelled) setLoadingUser(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminIdProp, adminNameProp]);

  if (loadingUser || !panelReady) {
    return (
      <View style={styles.loadingWrap}>
        <AdminSkeletonList count={3} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading Vidya AI...</Text>
      </View>
    );
  }

  if (!adminId) {
    return (
      <View style={styles.loadingWrap}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
          <Ionicons name="chatbubbles-outline" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Sign in to use Vidya AI</Text>
      </View>
    );
  }

  return (
    <View style={styles.panelWrap}>
      <AdminVidyaChatPanel adminId={adminId} adminName={adminName} />
    </View>
  );
}

const styles = StyleSheet.create({
  panelWrap: { flex: 1, minHeight: 0, paddingHorizontal: 8 },
  loadingWrap: {
    flex: 1,
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 14 },
});
