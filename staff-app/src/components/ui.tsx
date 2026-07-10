import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../theme';
import type { CountryFilter } from '../lib/format';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: colors.primary }]}>{value}</Text>
    </Card>
  );
}

export function AttentionCard({ count, title, description, onPress }: { count: number; title: string; description: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.attention}>
      <Text style={styles.attentionCount}>{count} {title}</Text>
      <Text style={styles.attentionDesc}>{description}</Text>
    </Pressable>
  );
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  Delivered: { bg: '#d1fae5', fg: '#047857' },
  'Out for Delivery': { bg: '#dbeafe', fg: '#1d4ed8' },
  'Processing in UK Warehouse': { bg: '#dbeafe', fg: '#1d4ed8' },
  'Processing in ZW Warehouse': { bg: '#dbeafe', fg: '#1d4ed8' },
  'Customs Clearance': { bg: '#dbeafe', fg: '#1d4ed8' },
  'Booking Confirmed': { bg: '#fef3c7', fg: '#b45309' },
  'Ready for Pickup': { bg: '#fef3c7', fg: '#b45309' },
  pending: { bg: '#fef3c7', fg: '#b45309' },
};

export function StatusBadge({ status }: { status: string | null }) {
  const c = (status && STATUS_COLORS[status]) || { bg: '#f1f5f9', fg: '#475569' };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{status || 'Unknown'}</Text>
    </View>
  );
}

export function CountryChips({ value, onChange }: { value: CountryFilter; onChange: (c: CountryFilter) => void }) {
  const opts: { key: CountryFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'UK', label: 'UK' },
    { key: 'Ireland', label: 'Ireland' },
  ];
  return (
    <View style={styles.chipsRow}>
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <Pressable key={o.key} onPress={() => onChange(o.key)} style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  statCard: { flex: 1, minWidth: 150 },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 4 },
  attention: {
    backgroundColor: colors.amberSoft,
    borderColor: colors.amberBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  attentionCount: { fontSize: 13, fontWeight: '700', color: colors.text },
  attentionDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.white },
});
