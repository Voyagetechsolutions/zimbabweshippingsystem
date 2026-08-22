import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, ViewStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { colors, radius, shadow, spacing } from '../theme';

// Shared operations-centre UI kit used by every redesigned admin screen so
// they read as one application: headers, stat tiles, badges, segmented
// filters, search fields, skeletons, empty/error states and SVG charts.

export function ScreenHeader({ title, subtitle, onBell, right }: {
  title: string; subtitle?: string; onBell?: () => void; right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
      {onBell ? (
        <Pressable style={styles.bell} onPress={onBell} hitSlop={8}>
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  if (onPress) {
    return <Pressable style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.9 }]} onPress={onPress}>{children}</Pressable>;
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatCard({ label, value, icon, tone = colors.primary, toneSoft = colors.primarySoft, sub, style }: {
  label: string; value: string | number; icon: keyof typeof Ionicons.glyphMap;
  tone?: string; toneSoft?: string; sub?: string; style?: ViewStyle;
}) {
  return (
    <View style={[styles.statCard, style]}>
      <View style={[styles.statIcon, { backgroundColor: toneSoft }]}>
        <Ionicons name={icon} size={17} color={tone} />
      </View>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// Percentage-change chip: green up, red down, grey flat.
export function TrendChip({ current, previous }: { current: number; previous: number }) {
  if (!previous && !current) return null;
  const change = previous === 0 ? 100 : ((current - previous) / Math.abs(previous)) * 100;
  const up = change >= 0;
  return (
    <View style={[styles.trend, { backgroundColor: up ? colors.primarySoft : colors.redSoft }]}>
      <Ionicons name={up ? 'trending-up-outline' : 'trending-down-outline'} size={12} color={up ? colors.primaryDark : colors.danger} />
      <Text style={[styles.trendText, { color: up ? colors.primaryDark : colors.danger }]}>
        {up ? '+' : ''}{change.toFixed(0)}%
      </Text>
    </View>
  );
}

export function Badge({ text, tone }: { text: string; tone?: { bg: string; fg: string } }) {
  const t = tone || { bg: '#f1f5f9', fg: '#475569' };
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

export const BADGE = {
  green: { bg: colors.primarySoft, fg: colors.primaryDark },
  blue: { bg: colors.blueSoft, fg: colors.blue },
  orange: { bg: colors.orangeSoft, fg: colors.orange },
  red: { bg: colors.redSoft, fg: colors.danger },
  purple: { bg: colors.purpleSoft, fg: colors.purple },
  grey: { bg: '#f1f5f9', fg: '#475569' },
};

export function Segmented<T extends string>({ options, value, onChange, labels }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; labels?: Partial<Record<T, string>>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentRow}>
      {options.map((option) => {
        const active = option === value;
        return (
          <Pressable key={option} style={[styles.segment, active && styles.segmentActive]} onPress={() => onChange(option)}>
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{labels?.[option] || option}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={17} color={colors.textFaint} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder || 'Search'}
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChange('')} hitSlop={8}>
          <Ionicons name="close-circle" size={16} color={colors.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Skeleton({ height = 76, style }: { height?: number; style?: ViewStyle }) {
  return <View style={[styles.skeleton, { height }, style]} />;
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <View style={{ gap: spacing.sm }}>
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} />)}
    </View>
  );
}

export function EmptyState({ icon = 'file-tray-outline', title, text }: {
  icon?: keyof typeof Ionicons.glyphMap; title: string; text?: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={34} color={colors.textFaint} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.errorCard}>
      <Ionicons name="cloud-offline-outline" size={22} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Loading() {
  return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
}

export function Avatar({ name, size = 40, uri }: { name?: string | null; size?: number; uri?: string | null }) {
  const initials = (name || '?').split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Text style={{ color: colors.primaryDark, fontWeight: '800', fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

// ── Charts (pure react-native-svg — no external chart library) ──────────────

export type SeriesPoint = { label: string; value: number };

export function LineChart({ points, height = 130, color = colors.primary, width = 320 }: {
  points: SeriesPoint[]; height?: number; color?: string; width?: number;
}) {
  if (!points.length) return <EmptyState icon="analytics-outline" title="No data in this range" />;
  const pad = 12;
  const max = Math.max(...points.map((p) => p.value), 1);
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const y = (v: number) => height - pad - ((height - pad * 2) * v) / max;
  const x = (i: number) => pad + i * stepX;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');
  const area = `${d} L ${x(points.length - 1).toFixed(1)} ${height - pad} L ${pad} ${height - pad} Z`;
  const labelEvery = Math.max(1, Math.ceil(points.length / 5));
  return (
    <View>
      <Svg width={width} height={height + 16}>
        <Path d={area} fill={color} opacity={0.08} />
        <Path d={d} stroke={color} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          i % labelEvery === 0 || i === points.length - 1 ? (
            <Circle key={i} cx={x(i)} cy={y(p.value)} r={3} fill={colors.white} stroke={color} strokeWidth={2} />
          ) : null
        ))}
        {points.map((p, i) => (
          i % labelEvery === 0 || i === points.length - 1 ? (
            <SvgText key={`t${i}`} x={x(i)} y={height + 12} fontSize={8.5} fill={colors.textMuted} textAnchor="middle">
              {p.label}
            </SvgText>
          ) : null
        ))}
      </Svg>
    </View>
  );
}

export function BarChart({ points, height = 130, color = colors.primary, width = 320 }: {
  points: SeriesPoint[]; height?: number; color?: string; width?: number;
}) {
  if (!points.length) return <EmptyState icon="bar-chart-outline" title="No data in this range" />;
  const pad = 12;
  const max = Math.max(...points.map((p) => p.value), 1);
  const slot = (width - pad * 2) / points.length;
  const barW = Math.max(3, Math.min(22, slot * 0.62));
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  return (
    <Svg width={width} height={height + 16}>
      <SvgLine x1={pad} y1={height - 1} x2={width - pad} y2={height - 1} stroke={colors.border} strokeWidth={1} />
      {points.map((p, i) => {
        const h = ((height - pad * 2) * p.value) / max;
        const cx = pad + slot * i + slot / 2;
        return (
          <React.Fragment key={i}>
            <Path
              d={`M ${cx - barW / 2} ${height - 1} L ${cx - barW / 2} ${height - 1 - h} Q ${cx - barW / 2} ${height - 4 - h} ${cx - barW / 2 + 3} ${height - 4 - h} L ${cx + barW / 2 - 3} ${height - 4 - h} Q ${cx + barW / 2} ${height - 4 - h} ${cx + barW / 2} ${height - 1 - h} L ${cx + barW / 2} ${height - 1} Z`}
              fill={color} opacity={0.85}
            />
            {i % labelEvery === 0 ? (
              <SvgText x={cx} y={height + 12} fontSize={8.5} fill={colors.textMuted} textAnchor="middle">{p.label}</SvgText>
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

export function Donut({ slices, size = 150, strokeWidth = 22 }: {
  slices: Array<{ label: string; value: number; color: string }>; size?: number; strokeWidth?: number;
}) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (!total) return <EmptyState icon="pie-chart-outline" title="No data in this range" />;
  const r = (size - strokeWidth) / 2;
  const c = size / 2;
  let angle = -90;
  const arcs = slices.filter((s) => s.value > 0).map((s) => {
    const sweep = (s.value / total) * 360;
    const largeArc = sweep > 180 ? 1 : 0;
    const start = (angle * Math.PI) / 180;
    const end = ((angle + sweep) * Math.PI) / 180;
    const x1 = c + r * Math.cos(start); const y1 = c + r * Math.sin(start);
    const x2 = c + r * Math.cos(end); const y2 = c + r * Math.sin(end);
    angle += sweep;
    // Full-circle single slice needs two arcs.
    const d = sweep >= 359.9
      ? `M ${c + r} ${c} A ${r} ${r} 0 1 1 ${c - r} ${c} A ${r} ${r} 0 1 1 ${c + r} ${c}`
      : `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    return { d, color: s.color };
  });
  return (
    <Svg width={size} height={size}>
      {arcs.map((arc, i) => (
        <Path key={i} d={arc.d} stroke={arc.color} strokeWidth={strokeWidth} fill="none" strokeLinecap="butt" />
      ))}
      <SvgText x={c} y={c - 3} fontSize={19} fontWeight="bold" fill={colors.text} textAnchor="middle">{total}</SvgText>
      <SvgText x={c} y={c + 14} fontSize={9.5} fill={colors.textMuted} textAnchor="middle">total</SvgText>
    </Svg>
  );
}

export function LegendRow({ color, label, value, percent }: { color: string; label: string; value: number; percent: number }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
      <Text style={styles.legendPercent}>{percent.toFixed(0)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  bell: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing.md, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, ...shadow },
  statCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 4, ...shadow },
  statIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 9, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginTop: 2 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statSub: { fontSize: 10, color: colors.textMuted },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  trendText: { fontSize: 10.5, fontWeight: '800' },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  segmentRow: { gap: spacing.sm, paddingVertical: 2 },
  segment: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8 },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'capitalize' },
  segmentTextActive: { color: colors.white },
  search: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, minHeight: 42 },
  searchInput: { flex: 1, fontSize: 13.5, color: colors.text, paddingVertical: 9 },
  skeleton: { backgroundColor: '#EDF1F3', borderRadius: radius.md },
  empty: { alignItems: 'center', gap: 6, padding: spacing.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 4 },
  emptyText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17 },
  errorCard: { alignItems: 'center', gap: 8, padding: spacing.lg, backgroundColor: colors.redSoft, borderWidth: 1, borderColor: '#fecaca', borderRadius: radius.md },
  errorText: { fontSize: 12.5, color: '#991b1b', textAlign: 'center', lineHeight: 18 },
  retry: { borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.sm, paddingHorizontal: 22, paddingVertical: 8 },
  retryText: { color: colors.danger, fontWeight: '800', fontSize: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 12.5, fontWeight: '600', color: colors.text },
  legendValue: { fontSize: 12.5, fontWeight: '800', color: colors.text },
  legendPercent: { fontSize: 11, color: colors.textMuted, minWidth: 34, textAlign: 'right' },
});
