import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ADMIN_SIDEBAR_WIDTH } from '../../../src/hooks/useIsTablet';
import { useAdminTheme } from '../_ui/useAdminTheme';
import AdminNavPanel from './AdminNavPanel';
import type { AdminNavView } from './adminNav';

type Props = {
  activeView: AdminNavView;
  userName: string;
  onSelect: (view: AdminNavView) => void;
  onLogout: () => void;
};

export default function AdminSidebar({ activeView, userName, onSelect, onLogout }: Props) {
  const { colors } = useAdminTheme();

  return (
    <View
      style={[
        styles.sidebar,
        {
          width: ADMIN_SIDEBAR_WIDTH,
          borderRightColor: colors.drawerBorder,
          backgroundColor: colors.drawerGradient[0],
        },
      ]}
    >
      <AdminNavPanel
        activeView={activeView}
        userName={userName}
        onSelect={onSelect}
        onLogout={onLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    borderRightWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
});
