import React, { ComponentProps } from 'react';
import { View } from 'react-native';
import AdminStatCard from './AdminStatCard';
import { useAdminResponsiveLayout } from './useAdminResponsiveLayout';

export type AdminStatItem = Omit<ComponentProps<typeof AdminStatCard>, 'compact' | 'grid'>;

type Props = {
  items: AdminStatItem[];
};

/** Responsive stat tiles — 2×2 on phone, equal row on tablet/wide. */
export default function AdminStatsRow({ items }: Props) {
  const { statsRowStyle, statSlotStyle, compactStats } = useAdminResponsiveLayout();

  return (
    <View style={statsRowStyle}>
      {items.map((item, index) => (
        <View key={`${item.label}-${index}`} style={statSlotStyle}>
          <AdminStatCard {...item} grid={!compactStats} compact={compactStats} />
        </View>
      ))}
    </View>
  );
}
