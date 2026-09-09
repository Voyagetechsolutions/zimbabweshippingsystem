import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, spacing } from '../../theme';
import {
  fetchCustomerAccounts, symbolFor,
  type CustomerAccount, type ItemRow,
} from '../../lib/operationsReport';

/**
 * What each customer is worth and what they still owe.
 *
 * From `customer_accounts`, the same function the website calls, so a balance
 * quoted to a customer on the phone matches the one on the desktop screen.
 *
 * Balances are per currency and never blended: a customer who ships from both
 * Ireland and the UK owes two amounts, and one combined figure would reconcile
 * against neither bank account.
 */

const money = (value: number, currency: string) =>
  `${symbolFor(currency)}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;

export default function CustomerAccountsScreen() {
  const navigation = useNavigation<any>();
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const result = await fetchCustomerAccounts();
    if (!result.ok) setError(result.message);
    else setAccounts(result.data.customers);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Fetched only for the customer being opened — loading every customer's line
  // items would be a lot of rows nobody is looking at.
  useEffect(() => {
    if (!openId) { setItems([]); return; }
    let cancelled = false;
    setItemsLoading(true);
    (async () => {
      const result = await fetchCustomerAccounts(openId);
      if (cancelled) return;
      if (result.ok) setItems(result.data.items);
      setItemsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [openId]);

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return accounts;
    return accounts.filter((a) =>
      [a.full_name, a.customer_code, a.customer_reference, a.phone, a.email]
        .some((field) => String(field || '').toLowerCase().includes(text))
      || (a.customer_references || []).some((ref) => String(ref).toLowerCase().includes(text)));
  }, [accounts, query]);

  const owing = useMemo(
    () => accounts.filter((a) => a.balances?.some((b) => b.owed > 0.005)).length,
    [accounts],
  );

  const open = useMemo(
    () => accounts.find((a) => a.customer_id === openId) || null,
    [accounts, openId],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.centre}><ActivityIndicator color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (open) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}
            onPress={() => setOpenId(null)} style={styles.back}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{open.full_name || 'Unnamed customer'}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {[open.customer_reference, open.phone].filter(Boolean).join(' · ') || 'No reference'}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          {open.balances?.map((b) => (
            <View key={b.currency} style={styles.card}>
              <Text style={styles.cardHeading}>{b.currency}</Text>
              <View style={styles.figures}>
                <Figure label="Spent" value={money(b.spent, b.currency)} />
                <Figure label="Paid" value={money(b.paid, b.currency)} tone={colors.primaryDark} />
                <Figure
                  label="Owes"
                  value={money(b.owed, b.currency)}
                  tone={b.owed > 0.005 ? colors.danger : colors.primaryDark}
                />
              </View>
              <Text style={styles.meta}>
                {b.shipments} invoiced shipment{b.shipments === 1 ? '' : 's'}
              </Text>
            </View>
          ))}

          {(open.customer_references || []).length > 1 ? (
            <Text style={styles.meta}>
              References: {(open.customer_references || []).join(', ')}
            </Text>
          ) : null}

          <Text style={styles.sectionHeading}>What they ship</Text>
          <View style={styles.card}>
            {itemsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
            ) : items.length === 0 ? (
              <Text style={styles.empty}>Nothing invoiced yet.</Text>
            ) : items.map((row) => (
              <View key={`${row.item}-${row.currency}`} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{row.item}</Text>
                  <Text style={styles.meta}>
                    ×{row.quantity} over {row.shipments} shipment{row.shipments === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={styles.itemMoney}>{money(row.revenue, row.currency)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12}
          onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Customer accounts</Text>
          <Text style={styles.subtitle}>
            {accounts.length} with invoices{owing > 0 ? ` · ${owing} owing` : ''}
          </Text>
        </View>
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Name, reference, phone or email"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      >
        {error ? <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text></View> : null}

        {visible.map((account) => {
          const owed = account.balances?.filter((b) => b.owed > 0.005) || [];
          return (
            <Pressable
              key={account.customer_id}
              style={styles.row}
              onPress={() => setOpenId(account.customer_id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {account.full_name || 'Unnamed customer'}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[account.customer_reference, account.phone].filter(Boolean).join(' · ')} ·{' '}
                  {account.shipments} shipment{account.shipments === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {account.balances?.map((b) => (
                  <Text key={b.currency} style={styles.rowAmount}>{money(b.spent, b.currency)}</Text>
                ))}
                <Text style={[styles.meta, owed.length ? { color: colors.danger, fontWeight: '700' } : { color: colors.primaryDark }]}>
                  {owed.length
                    ? `${owed.map((b) => money(b.owed, b.currency)).join(' + ')} owed`
                    : 'settled'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </Pressable>
          );
        })}

        {visible.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Ionicons name={query ? 'search-outline' : 'people-outline'} size={38} color={colors.textMuted} />
            <Text style={styles.empty}>
              {query ? `No customer matches “${query.trim()}”.` : 'No customer has an invoiced shipment yet.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={[styles.figureValue, tone ? { color: tone } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  back: { padding: 4 },
  title: { fontSize: 19, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    paddingHorizontal: spacing.md, height: 44,
    backgroundColor: colors.surface, borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  body: { padding: spacing.md, gap: spacing.sm, paddingBottom: 60 },
  notice: { backgroundColor: colors.amberSoft, borderRadius: radius.md, padding: spacing.sm },
  noticeText: { color: colors.amber, fontSize: 12.5 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: 6, ...shadow },
  cardHeading: { fontSize: 10, fontWeight: '900', color: colors.primary, letterSpacing: 0.6 },
  figures: { flexDirection: 'row', gap: spacing.sm },
  figureLabel: { fontSize: 10, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  figureValue: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 1 },
  sectionHeading: { fontSize: 12, fontWeight: '900', color: colors.textMuted, letterSpacing: 0.6, marginTop: spacing.md, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, ...shadow },
  rowName: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  rowAmount: { fontSize: 14, fontWeight: '800', color: colors.text },
  meta: { fontSize: 11.5, color: colors.textMuted, marginTop: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 7 },
  itemName: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  itemMoney: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  empty: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.md },
  emptyBlock: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
});
