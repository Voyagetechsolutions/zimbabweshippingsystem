import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadow, stageTone, stageIndex, STAGES } from '../theme';
import type { CountryFilter } from '../lib/format';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

// Large KPI card — Stripe-dashboard style number with an optional trend line.
export function StatCard({ label, value, accent, trend, trendUp }: {
  label: string; value: string; accent?: boolean; trend?: string; trendUp?: boolean;
}) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, accent && { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {trend ? (
        <View style={styles.trendRow}>
          <Ionicons name={trendUp === false ? 'trending-down' : 'trending-up'} size={13} color={trendUp === false ? colors.danger : colors.primary} />
          <Text style={[styles.trendText, { color: trendUp === false ? colors.danger : colors.primary }]}>{trend}</Text>
        </View>
      ) : null}
    </Card>
  );
}

type Tone = 'orange' | 'red' | 'blue' | 'purple' | 'green' | 'cyan' | 'gold';
const TONES: Record<Tone, { bg: string; fg: string }> = {
  orange: { bg: colors.orangeSoft, fg: colors.orange },
  red: { bg: colors.redSoft, fg: colors.danger },
  blue: { bg: colors.blueSoft, fg: colors.blue },
  purple: { bg: colors.purpleSoft, fg: colors.purple },
  green: { bg: colors.primarySoft, fg: colors.primaryDark },
  cyan: { bg: colors.cyanSoft, fg: colors.cyan },
  gold: { bg: colors.goldSoft, fg: colors.gold },
};

// Colored attention card: big count, category label, supporting line, action.
export function AttentionCard({ count, title, description, onPress, tone = 'orange', icon = 'alert-circle', action }: {
  count: number; title: string; description: string; onPress?: () => void;
  tone?: Tone; icon?: keyof typeof Ionicons.glyphMap; action?: string;
}) {
  const t = TONES[tone];
  return (
    <Pressable onPress={onPress} style={[styles.attention, { backgroundColor: t.bg }]}>
      <View style={[styles.attentionIcon, { backgroundColor: colors.surface }]}>
        <Ionicons name={icon} size={18} color={t.fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.attentionKicker, { color: t.fg }]}>{title.toUpperCase()}</Text>
        <Text style={styles.attentionCount}>{count}</Text>
        <Text style={styles.attentionDesc}>{description}</Text>
      </View>
      {onPress ? (
        <View style={styles.attentionAction}>
          <Text style={[styles.attentionActionText, { color: t.fg }]}>{action || 'View'}</Text>
          <Ionicons name="chevron-forward" size={14} color={t.fg} />
        </View>
      ) : null}
    </Pressable>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  const c = stageTone(status);
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.fg }]}>{status || 'Unknown'}</Text>
    </View>
  );
}

// Mini seven-stage progress dots for shipment tiles.
export function StageDots({ status }: { status: string | null }) {
  const active = stageIndex(status);
  return (
    <View style={styles.dotsRow}>
      {STAGES.map((stage, i) => (
        <View key={stage} style={styles.dotWrap}>
          <View style={[styles.dot, i <= active && { backgroundColor: stageTone(stage).fg }]} />
          {i < STAGES.length - 1 && <View style={[styles.dotLine, i < active && { backgroundColor: colors.primary }]} />}
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ emoji, title, text, actionLabel, onAction }: {
  emoji: string; title: string; text: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.emptyButton} onPress={onAction}>
          <Text style={styles.emptyButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
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

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    ...shadow,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  statCard: { flex: 1, minWidth: 150 },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.5 },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 6 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  trendText: { fontSize: 12, fontWeight: '700' },
  attention: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  attentionIcon: { borderRadius: radius.pill, padding: 9, ...shadow },
  attentionKicker: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8 },
  attentionCount: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 1 },
  attentionDesc: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  attentionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  attentionActionText: { fontSize: 13, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  dotWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 2 },
  emptyState: { alignItems: 'center', padding: spacing.xl, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
  emptyButton: { marginTop: spacing.sm, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 20, paddingVertical: 10 },
  emptyButtonText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  chipsRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12.5, fontWeight: '700', color: colors.textMuted },
  chipTextActive: { color: colors.white },
});
