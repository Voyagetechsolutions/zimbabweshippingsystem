import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow, spacing } from '../theme';

type ReviewRole = 'driver' | 'admin' | 'finance';

const REVIEW_ROLES: Array<{ key: ReviewRole; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'driver', label: 'Driver', icon: 'car-outline' },
  { key: 'admin', label: 'Admin', icon: 'grid-outline' },
  { key: 'finance', label: 'Finance', icon: 'card-outline' },
];

function Metric({ label, value, tone = colors.primary }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: tone }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : <Text style={styles.sectionAction}>{action}</Text>) : null}
    </View>
  );
}

function DriverPreview() {
  const [completed, setCompleted] = useState<string[]>([]);
  const stops = useMemo(() => [
    { id: 'ZSR-1001', name: 'Review Customer One', address: '12 Sample Street, Birmingham, B1 1AA', time: '09:30' },
    { id: 'ZSR-1002', name: 'Review Customer Two', address: '45 Demo Road, Coventry, CV1 2AB', time: '11:15' },
    { id: 'ZSR-1003', name: 'Review Customer Three', address: '8 Test Lane, Leicester, LE1 3CD', time: '13:00' },
  ], []);

  return (
    <>
      <View style={styles.heroCard}>
        <View>
          <Text style={styles.eyebrow}>TODAY'S COLLECTION RUN</Text>
          <Text style={styles.heroTitle}>Midlands Route</Text>
          <Text style={styles.heroMeta}>3 stops · 86 km · Sample workspace</Text>
        </View>
        <View style={styles.routeBadge}><Text style={styles.routeBadgeText}>{completed.length}/3</Text></View>
      </View>
      <View style={styles.metricRow}>
        <Metric label="To collect" value={String(3 - completed.length)} tone={colors.orange} />
        <Metric label="Collected" value={String(completed.length)} />
        <Metric label="On route" value="1" tone={colors.blue} />
      </View>
      <SectionTitle title="Collection stops" action="Nearest first" />
      {stops.map((stop, index) => {
        const done = completed.includes(stop.id);
        return (
          <View key={stop.id} style={styles.card}>
            <View style={styles.stopTop}>
              <View style={[styles.stopNumber, done && styles.stopNumberDone]}>
                <Text style={[styles.stopNumberText, done && styles.stopNumberTextDone]}>{done ? '✓' : index + 1}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{stop.name}</Text>
                <Text style={styles.cardMeta}>{stop.id} · {stop.time}</Text>
              </View>
              <View style={[styles.statusPill, done && styles.statusPillDone]}>
                <Text style={[styles.statusText, done && styles.statusTextDone]}>{done ? 'Collected' : 'Ready'}</Text>
              </View>
            </View>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={17} color={colors.textMuted} />
              <Text style={styles.address}>{stop.address}</Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                style={styles.secondaryButton}
                onPress={() => Alert.alert('Sample navigation', `Navigation would open directions to ${stop.address}.`)}
              >
                <Ionicons name="navigate-outline" size={16} color={colors.primaryDark} />
                <Text style={styles.secondaryButtonText}>Navigate</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.primaryButton, done && styles.undoButton]}
                onPress={() => setCompleted((current) => done ? current.filter((id) => id !== stop.id) : [...current, stop.id])}
              >
                <Text style={[styles.primaryButtonText, done && styles.undoButtonText]}>{done ? 'Undo' : 'Mark collected'}</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </>
  );
}

function AdminPreview() {
  return (
    <>
      <View style={styles.heroCard}>
        <View>
          <Text style={styles.eyebrow}>OPERATIONS OVERVIEW</Text>
          <Text style={styles.heroTitle}>Everything on schedule</Text>
          <Text style={styles.heroMeta}>Tuesday, 11 August · Sample workspace</Text>
        </View>
        <Ionicons name="checkmark-circle" size={42} color={colors.primary} />
      </View>
      <View style={styles.metricRow}>
        <Metric label="Open shipments" value="24" />
        <Metric label="Collections" value="8" tone={colors.orange} />
        <Metric label="Drivers active" value="4" tone={colors.blue} />
      </View>
      <SectionTitle title="Live operations" action="View all" onAction={() => Alert.alert('Sample operations', 'All sample operations are shown below.')} />
      <View style={styles.mapCard}>
        <View style={styles.mapRoadOne} />
        <View style={styles.mapRoadTwo} />
        {[{ x: '18%', y: '58%' }, { x: '45%', y: '28%' }, { x: '68%', y: '61%' }, { x: '82%', y: '35%' }].map((pin, index) => (
          <View key={index} style={[styles.mapPin, { left: pin.x as never, top: pin.y as never }]}>
            <Text style={styles.mapPinText}>{index + 1}</Text>
          </View>
        ))}
        <View style={styles.mapLegend}><Text style={styles.mapLegendText}>Midlands Route · 4 active stops</Text></View>
      </View>
      <SectionTitle title="Today's priorities" />
      {[
        ['cube-outline', 'Prepare warehouse intake', '12 shipments expected by 16:00', colors.blueSoft, colors.blue],
        ['car-outline', 'Midlands Route', 'Driver checked in · 3 stops remaining', colors.orangeSoft, colors.orange],
        ['people-outline', 'Staff coverage', 'All scheduled roles are covered', colors.primarySoft, colors.primaryDark],
      ].map(([icon, title, subtitle, bg, fg]) => (
        <Pressable
          accessibilityRole="button"
          key={String(title)}
          style={styles.listCard}
          onPress={() => Alert.alert(String(title), String(subtitle))}
        >
          <View style={[styles.iconBox, { backgroundColor: String(bg) }]}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={String(fg)} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardMeta}>{subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Pressable>
      ))}
    </>
  );
}

function FinancePreview() {
  return (
    <>
      <View style={[styles.heroCard, styles.financeHero]}>
        <View>
          <Text style={[styles.eyebrow, { color: '#D1FAE5' }]}>FINANCE OVERVIEW</Text>
          <Text style={[styles.heroTitle, { color: colors.white }]}>£18,420.00</Text>
          <Text style={[styles.heroMeta, { color: '#D1FAE5' }]}>Recorded this month · Sample workspace</Text>
        </View>
        <Ionicons name="trending-up" size={40} color="#A7F3D0" />
      </View>
      <View style={styles.metricRow}>
        <Metric label="Paid invoices" value="36" />
        <Metric label="Outstanding" value="£2.4k" tone={colors.orange} />
        <Metric label="Reconciled" value="94%" tone={colors.blue} />
      </View>
      <SectionTitle title="Recent payments" action="Export" onAction={() => Alert.alert('Sample export', 'A live finance account can export these records as PDF or CSV.')} />
      {[
        ['ZSI-24081', 'Review Customer One', '£420.00', 'Paid'],
        ['ZSI-24080', 'Review Customer Two', '£185.00', 'Paid'],
        ['ZSI-24079', 'Review Customer Three', '£760.00', 'Pending'],
      ].map(([invoice, customer, amount, status]) => (
        <View key={invoice} style={styles.paymentRow}>
          <View style={styles.receiptIcon}><Ionicons name="receipt-outline" size={20} color={colors.primaryDark} /></View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{customer}</Text>
            <Text style={styles.cardMeta}>{invoice}</Text>
          </View>
          <View style={styles.amountBlock}>
            <Text style={styles.amount}>{amount}</Text>
            <Text style={[styles.paymentStatus, status === 'Pending' && { color: colors.orange }]}>{status}</Text>
          </View>
        </View>
      ))}
      <SectionTitle title="Reconciliation" />
      <View style={styles.card}>
        <View style={styles.progressTop}>
          <Text style={styles.cardTitle}>August reconciliation</Text>
          <Text style={styles.progressLabel}>94%</Text>
        </View>
        <View style={styles.progressTrack}><View style={styles.progressFill} /></View>
        <Text style={styles.cardMeta}>47 of 50 sample payments matched</Text>
      </View>
    </>
  );
}

export default function AppleReviewWorkspaceScreen() {
  const { signOut } = useAuth();
  const [role, setRole] = useState<ReviewRole>('driver');

  return (
    <SafeAreaView style={[styles.safe, Platform.OS === 'web' && styles.webSafeArea]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.brand}>Zimbabwe Shipping</Text>
          <Text style={styles.reviewLabel}>Apple Review Workspace · Sample data only</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={signOut} style={styles.signOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.roleTabs}>
        {REVIEW_ROLES.map((item) => {
          const active = role === item.key;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={item.key}
              onPress={() => setRole(item.key)}
              style={[styles.roleTab, active && styles.roleTabActive]}
            >
              <Ionicons name={item.icon} size={17} color={active ? colors.white : colors.textMuted} />
              <Text style={[styles.roleTabText, active && styles.roleTabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {role === 'driver' ? <DriverPreview /> : null}
        {role === 'admin' ? <AdminPreview /> : null}
        {role === 'finance' ? <FinancePreview /> : null}
        <Text style={styles.footer}>This reviewer account is isolated from live customer and financial records.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  webSafeArea: { paddingTop: 54 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  brand: { fontSize: 18, fontWeight: '800', color: colors.text },
  reviewLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  signOut: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  roleTabs: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface },
  roleTab: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  roleTabActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  roleTabText: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  roleTabTextActive: { color: colors.white },
  content: { padding: spacing.lg, paddingBottom: 40 },
  heroCard: { ...shadow, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  financeHero: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.primaryDark },
  heroTitle: { marginTop: 4, fontSize: 21, fontWeight: '800', color: colors.text },
  heroMeta: { marginTop: 4, fontSize: 12, color: colors.textMuted },
  routeBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  routeBadgeText: { color: colors.primaryDark, fontSize: 15, fontWeight: '800' },
  metricRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  metric: { ...shadow, flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: colors.border },
  metricValue: { fontSize: 19, fontWeight: '800' },
  metricLabel: { marginTop: 3, fontSize: 10, color: colors.textMuted },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  sectionAction: { fontSize: 12, fontWeight: '700', color: colors.primary },
  card: { ...shadow, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  stopTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stopNumber: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.orangeSoft },
  stopNumberDone: { backgroundColor: colors.primarySoft },
  stopNumberText: { color: colors.orange, fontWeight: '800' },
  stopNumberTextDone: { color: colors.primaryDark },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  cardMeta: { marginTop: 2, fontSize: 11, color: colors.textMuted },
  statusPill: { borderRadius: radius.pill, backgroundColor: colors.orangeSoft, paddingHorizontal: 8, paddingVertical: 4 },
  statusPillDone: { backgroundColor: colors.primarySoft },
  statusText: { color: colors.orange, fontSize: 10, fontWeight: '700' },
  statusTextDone: { color: colors.primaryDark },
  addressRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: spacing.md },
  address: { flex: 1, fontSize: 12, lineHeight: 17, color: colors.textMuted },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: radius.sm, paddingVertical: 9, backgroundColor: colors.primarySoft },
  secondaryButtonText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  primaryButton: { flex: 1.4, borderRadius: radius.sm, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.primary },
  primaryButtonText: { fontSize: 11, fontWeight: '700', color: colors.white },
  undoButton: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  undoButtonText: { color: colors.textMuted },
  mapCard: { height: 210, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: '#E9F4EE', borderWidth: 1, borderColor: '#D6E8DE' },
  mapRoadOne: { position: 'absolute', width: '120%', height: 12, backgroundColor: colors.white, top: '46%', left: '-10%', transform: [{ rotate: '-13deg' }] },
  mapRoadTwo: { position: 'absolute', width: 12, height: '130%', backgroundColor: colors.white, top: '-15%', left: '58%', transform: [{ rotate: '24deg' }] },
  mapPin: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white },
  mapPinText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  mapLegend: { position: 'absolute', left: 10, bottom: 10, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 7, borderRadius: radius.sm },
  mapLegendText: { fontSize: 11, fontWeight: '700', color: colors.text },
  listCard: { ...shadow, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paymentRow: { ...shadow, flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
  receiptIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  amountBlock: { alignItems: 'flex-end' },
  amount: { fontSize: 13, fontWeight: '800', color: colors.text },
  paymentStatus: { marginTop: 2, fontSize: 10, fontWeight: '700', color: colors.primary },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: colors.primaryDark, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, marginVertical: spacing.md, overflow: 'hidden' },
  progressFill: { width: '94%', height: '100%', backgroundColor: colors.primary },
  footer: { marginTop: spacing.xl, textAlign: 'center', fontSize: 10, color: colors.textFaint },
});
