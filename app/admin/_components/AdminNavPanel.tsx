import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAdminTheme } from '../_ui/useAdminTheme';
import { ADMIN_NAV_ITEMS, type AdminNavView } from './adminNav';

type Props = {
  activeView: AdminNavView;
  userName: string;
  onSelect: (view: AdminNavView) => void;
  onLogout: () => void;
  compact?: boolean;
};

export default function AdminNavPanel({ activeView, userName, onSelect, onLogout, compact }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useAdminTheme();

  return (
    <View style={[styles.root, { backgroundColor: colors.drawerBg }]}>
      {!compact ? (
        <View style={[styles.logoSection, { borderBottomColor: colors.drawerBorder, paddingTop: insets.top + 12 }]}>
          <View style={[styles.logoBadge, { backgroundColor: colors.drawerSurface }]}>
            <Text style={[styles.logoBadgeText, { color: colors.primary }]}>AS</Text>
          </View>
          <View style={styles.logoTextWrap}>
            <Text style={[styles.logoTitle, { color: colors.drawerText }]}>ASLILEARN AI</Text>
            <Text style={[styles.logoSubtitle, { color: colors.drawerTextMuted }]}>Admin Panel</Text>
          </View>
        </View>
      ) : (
        <View style={{ paddingTop: insets.top + 8 }} />
      )}

      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <Pressable
              key={item.id}
              style={[
                styles.navItem,
                isActive && [styles.navItemActive, { backgroundColor: colors.navActiveBg }],
              ]}
              onPress={() => onSelect(item.id)}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={isActive ? colors.navActiveText : colors.drawerText}
              />
              <Text
                style={[
                  styles.navLabel,
                  { color: isActive ? colors.navActiveText : colors.drawerText },
                  isActive && styles.navLabelActive,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 16), borderTopColor: colors.drawerBorder },
        ]}
      >
        <View style={styles.userRow}>
          <View style={[styles.userAvatar, { backgroundColor: colors.drawerSurface }]}>
            <Ionicons name="person" size={16} color={colors.drawerText} />
          </View>
          <View style={styles.userTextWrap}>
            <Text style={[styles.userName, { color: colors.drawerText }]} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={[styles.userRole, { color: colors.drawerTextMuted }]}>Administrator</Text>
          </View>
        </View>
        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.drawerTextMuted} />
          <Text style={[styles.logoutText, { color: colors.drawerTextMuted }]}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeText: {
    fontWeight: '800',
    fontSize: 18,
  },
  logoTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  logoTitle: {
    fontWeight: '800',
    fontSize: 16,
  },
  logoSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  navScroll: {
    flex: 1,
  },
  navContent: {
    padding: 16,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  navItemActive: {},
  navLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  navLabelActive: {
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontWeight: '700',
    fontSize: 14,
  },
  userRole: {
    fontSize: 12,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  logoutText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
