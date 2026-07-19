import React from 'react';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useViewRole } from '../../context/ViewRoleContext';
import { colors, radius, spacing } from '../../theme';
import type { MenuStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MenuStackParams, 'Menu'>;

type Item = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  // Either a screen in this stack, a tab jump, or a placeholder.
  to?: keyof MenuStackParams;
  tab?: string;
  placeholder?: boolean;
};

// Enterprise-style categories: Operations / Sales / Finance / Administration.
const SECTIONS: { title: string; data: Item[] }[] = [
  {
    title: 'Operations',
    data: [
      { label: 'Bookings', icon: 'add-circle-outline', to: 'ManualBooking' },
      { label: 'Shipments', icon: 'cube-outline', tab: 'Shipments' },
      { label: 'Driver Runs', icon: 'car-outline', tab: 'Runs' },
      { label: 'Delivery', icon: 'navigate-outline', to: 'Delivery' },
      { label: 'Collection Schedule', icon: 'calendar-outline', to: 'Schedule' },
    ],
  },
  {
    title: 'Sales',
    data: [
      { label: 'Quotes', icon: 'pricetag-outline', to: 'CustomQuotes' },
      { label: 'Customers', icon: 'people-outline', to: 'Customers' },
      { label: 'Feedback', icon: 'star-outline', to: 'Feedback' },
    ],
  },
  {
    title: 'Finance',
    data: [
      { label: 'Invoices', icon: 'receipt-outline', to: 'Invoices' },
      { label: 'Payments', icon: 'card-outline', to: 'Payments' },
      { label: 'Revenue Reports', icon: 'stats-chart-outline', to: 'Reports' },
    ],
  },
  {
    title: 'Administration',
    data: [
      { label: 'Staff Control Centre', icon: 'shield-checkmark-outline', to: 'StaffRecords' },
      { label: 'Pickup Zones', icon: 'location-outline', placeholder: true },
      { label: 'Account', icon: 'person-outline', to: 'Account' },
    ],
  },
];

export default function MenuScreen({ navigation }: Props) {
  const { clearRole } = useViewRole();
  const open = (item: Item) => {
    if (item.tab) {
      // Jump to a bottom tab (Home / Shipments).
      (navigation as any).navigate(item.tab);
    } else if (item.placeholder) {
      navigation.navigate('Placeholder', { title: item.label });
    } else if (item.to) {
      navigation.navigate(item.to as any);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SectionList
        sections={SECTIONS}
        keyExtractor={(item) => item.label}
        contentContainerStyle={styles.content}
        ListHeaderComponent={<Text style={styles.title}>More</Text>}
        renderSectionHeader={({ section }) => (
          <Text style={styles.group}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => open(item)}>
            <Ionicons name={item.icon} size={18} color={colors.primary} style={styles.rowIcon} />
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        )}
        stickySectionHeadersEnabled={false}
        ListFooterComponent={(
          <Pressable style={styles.switchRow} onPress={clearRole}>
            <Ionicons name="swap-horizontal-outline" size={19} color={colors.primary} />
            <Text style={styles.switchLabel}>Switch Dashboard</Text>
            <Ionicons name="chevron-forward" size={17} color={colors.primary} />
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  group: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 12, marginBottom: 6,
  },
  rowIcon: { marginRight: spacing.md },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  switchRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm, backgroundColor: colors.surface },
  switchLabel: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.primary },
});
