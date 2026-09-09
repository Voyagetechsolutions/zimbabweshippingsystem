import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, shadow, spacing } from '../../theme';
import {
  deleteInvoicePayment, fetchCustomerAccounts, fetchCustomerStatement,
  recordInvoicePayment, symbolFor, updateCustomerRecord,
  type AccountShipment, type CustomerAccount, type ItemRow, type StatementLine,
} from '../../lib/operationsReport';
import { confirmDelete } from '../../lib/records';
import { ConfirmSheet, OptionSheet } from '../../components/OptionSheet';

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
  const [shipments, setShipments] = useState<AccountShipment[]>([]);
  const [statement, setStatement] = useState<StatementLine[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  /** Which section of the open customer is showing. */
  const [tab, setTab] = useState<'details' | 'statement' | 'shipments'>('details');
  const [busy, setBusy] = useState(false);
  /** The customer-details form, open only while editing. */
  const [editing, setEditing] = useState<null | Record<string, string>>(null);
  /**
   * The payment being added or corrected.
   *
   * `shipmentId` says which invoice it belongs to; `id` present means this is a
   * correction to an entry that already exists rather than a new receipt.
   */
  const [payment, setPayment] = useState<null | {
    shipmentId: string; id?: string; amount: string; method: string; date: string; reference: string;
  }>(null);
  const [pickingInvoice, setPickingInvoice] = useState(false);
  const [removingPayment, setRemovingPayment] = useState<StatementLine | null>(null);

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
    if (!openId) { setItems([]); setShipments([]); setStatement([]); return; }
    let cancelled = false;
    setItemsLoading(true);
    setTab('details');
    (async () => {
      const [result, lines] = await Promise.all([
        fetchCustomerAccounts(openId),
        fetchCustomerStatement(openId),
      ]);
      if (cancelled) return;
      if (result.ok) { setItems(result.data.items); setShipments(result.data.shipments); }
      setStatement(lines);
      setItemsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [openId]);

  const reloadOpen = useCallback(async () => {
    if (!openId) return;
    const [result, lines] = await Promise.all([
      fetchCustomerAccounts(openId),
      fetchCustomerStatement(openId),
    ]);
    if (result.ok) { setItems(result.data.items); setShipments(result.data.shipments); }
    setStatement(lines);
    await load();
  }, [openId, load]);

  const saveDetails = useCallback(async () => {
    if (!openId || !editing) return;
    setBusy(true);
    const result = await updateCustomerRecord(openId, editing as any);
    setBusy(false);
    if (!result.ok) { Alert.alert('Could not save', result.message); return; }
    setEditing(null);
    await reloadOpen();
  }, [openId, editing, reloadOpen]);

  const savePayment = useCallback(async () => {
    if (!payment) return;
    const amount = Number(payment.amount);
    if (!(amount > 0)) { Alert.alert('Enter an amount', 'A payment must be more than zero.'); return; }
    setBusy(true);
    const result = await recordInvoicePayment(payment.shipmentId, {
      id: payment.id,
      amount,
      method: payment.method,
      date: payment.date,
      reference: payment.reference,
    });
    setBusy(false);
    if (!result.ok) { Alert.alert('Could not record the payment', result.message); return; }
    setPayment(null);
    await reloadOpen();
  }, [payment, reloadOpen]);

  const removePayment = useCallback(async () => {
    if (!removingPayment?.paymentId) return;
    setBusy(true);
    const result = await deleteInvoicePayment(removingPayment.shipmentId, removingPayment.paymentId);
    setBusy(false);
    setRemovingPayment(null);
    if (!result.ok) { Alert.alert('Could not remove it', result.message); return; }
    await reloadOpen();
  }, [removingPayment, reloadOpen]);

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

  const openShipment = useCallback(async (shipmentId: string) => {
    const { data } = await supabase.from('shipments').select('*').eq('id', shipmentId).maybeSingle();
    if (data) navigation.navigate('ShipmentDetail', { shipment: data });
  }, [navigation]);

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

        <View style={styles.tabRow}>
          {(['details', 'statement', 'shipments'] as const).map((key) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabOn]}
            >
              <Text style={[styles.tabText, tab === key && { color: colors.white }]}>
                {key === 'details' ? 'Details' : key === 'statement' ? 'Statement' : 'Shipments'}
              </Text>
            </Pressable>
          ))}
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

          {tab === 'details' ? (
            <>
              <View style={styles.headingRow}>
                <Text style={styles.sectionHeading}>Customer details</Text>
                <Pressable
                  onPress={() => setEditing({
                    fullName: open.full_name || '',
                    phone: open.phone || '',
                    email: open.email || '',
                    country: open.country || '',
                    pickupAddress: open.pickup_address || '',
                    pickupCity: open.pickup_city || '',
                    pickupPostcode: open.pickup_postcode || '',
                  })}
                  hitSlop={8}
                >
                  <Text style={styles.action}>Edit</Text>
                </Pressable>
              </View>
              <View style={styles.card}>
                <Detail k="Name" v={open.full_name} />
                <Detail k="Reference" v={open.customer_reference} />
                {(open.customer_references || []).length > 1 ? (
                  <Detail k="All references" v={(open.customer_references || []).join(', ')} />
                ) : null}
                <Detail k="Account code" v={open.customer_code} />
                <Detail k="Phone" v={open.phone} />
                <Detail k="Email" v={open.email} />
                <Detail k="Country" v={open.country} />
                <Detail
                  k="Collection address"
                  v={[open.pickup_address, open.pickup_city, open.pickup_postcode].filter(Boolean).join(', ')}
                />
                <Detail
                  k="Customer since"
                  v={open.customer_since ? new Date(open.customer_since).toLocaleDateString() : null}
                />
                <Detail
                  k="Last booked"
                  v={open.last_booked ? new Date(open.last_booked).toLocaleDateString() : null}
                />
              </View>

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
            </>
          ) : null}

          {tab === 'statement' ? (
            <>
              <View style={styles.headingRow}>
                <Text style={styles.sectionHeading}>Statement</Text>
                <Pressable onPress={() => setPickingInvoice(true)} hitSlop={8}>
                  <Text style={styles.action}>Record payment</Text>
                </Pressable>
              </View>
              <View style={styles.card}>
                {itemsLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
                ) : statement.length === 0 ? (
                  <Text style={styles.empty}>Nothing invoiced or paid yet.</Text>
                ) : statement.map((line, index) => {
                  const charge = line.kind === 'charge';
                  const editable = !charge && Boolean(line.paymentId);
                  return (
                    <Pressable
                      key={`${line.shipmentId}-${index}`}
                      style={styles.itemRow}
                      // A charge is edited on its own invoice; only the credit
                      // side is editable from the statement.
                      onPress={() => (editable ? setPayment({
                        shipmentId: line.shipmentId,
                        id: line.paymentId as string,
                        amount: String(Math.abs(line.amount)),
                        method: line.method || '',
                        date: String(line.at).slice(0, 10),
                        reference: line.note || '',
                      }) : undefined)}
                      onLongPress={() => (editable ? setRemovingPayment(line) : undefined)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemName} numberOfLines={1}>{line.reference || '-'}</Text>
                        <Text style={styles.meta}>
                          {new Date(line.at).toLocaleDateString()} ·{' '}
                          {charge ? 'Invoice' : `Payment${line.method ? ` · ${line.method}` : ''}`}
                          {editable ? ' · tap to edit' : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.itemMoney, { color: charge ? colors.text : colors.primaryDark }]}>
                          {charge ? '' : '-'}{money(Math.abs(line.amount), line.currency)}
                        </Text>
                        {/* The running balance is what makes this a statement
                            rather than a list of transactions. */}
                        <Text style={styles.meta}>bal {money(line.balance, line.currency)}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {tab === 'shipments' ? (
            <>
              <Text style={styles.sectionHeading}>Invoiced shipments</Text>
              <View style={styles.card}>
                {itemsLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.lg }} />
                ) : shipments.length === 0 ? (
                  <Text style={styles.empty}>No invoiced shipment yet.</Text>
                ) : shipments.map((row) => (
                  <Pressable
                    key={row.shipmentId}
                    style={styles.itemRow}
                    onPress={() => openShipment(row.shipmentId)}
                    onLongPress={() => confirmDelete({
                      table: 'shipments',
                      ids: [row.shipmentId],
                      noun: 'shipment',
                      onDone: reloadOpen,
                    })}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>{row.reference || '-'}</Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {new Date(row.bookedOn).toLocaleDateString()} · {row.status || 'No status'}
                        {row.route ? ` · ${row.route}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.itemMoney}>{money(row.invoiced, row.currency)}</Text>
                      <Text style={[
                        styles.meta,
                        row.balance > 0.005 ? { color: colors.danger } : { color: colors.primaryDark },
                      ]}>
                        {row.balance > 0.005 ? `${money(row.balance, row.currency)} left` : 'paid'}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>

        {/* ── Edit the customer ── */}
        <Modal visible={Boolean(editing)} transparent animationType="slide"
          onRequestClose={() => setEditing(null)}>
          <Pressable style={styles.backdrop} onPress={() => (busy ? undefined : setEditing(null))} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Edit customer</Text>
            <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}>
              {([
                ['fullName', 'Name'], ['phone', 'Phone'], ['email', 'Email'],
                ['country', 'Country'], ['pickupAddress', 'Collection address'],
                ['pickupCity', 'Town / city'], ['pickupPostcode', 'Postcode'],
              ] as const).map(([key, label]) => (
                <View key={key}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={editing?.[key] || ''}
                    onChangeText={(v) => setEditing((current) => ({ ...(current || {}), [key]: v }))}
                    autoCapitalize={key === 'email' ? 'none' : key === 'pickupPostcode' ? 'characters' : 'sentences'}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.sheetActions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setEditing(null)} disabled={busy}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={saveDetails} disabled={busy}>
                {busy ? <ActivityIndicator color={colors.white} />
                      : <Text style={styles.btnPrimaryText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* ── Record or correct a payment ── */}
        <Modal visible={Boolean(payment)} transparent animationType="slide"
          onRequestClose={() => setPayment(null)}>
          <Pressable style={styles.backdrop} onPress={() => (busy ? undefined : setPayment(null))} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {payment?.id ? 'Correct payment' : 'Record payment'}
            </Text>
            <ScrollView contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}>
              <View>
                <Text style={styles.fieldLabel}>Amount</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  value={payment?.amount || ''}
                  onChangeText={(v) => setPayment((c) => (c ? { ...c, amount: v } : c))}
                />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Method</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Bank transfer, cash…"
                  placeholderTextColor={colors.textFaint}
                  value={payment?.method || ''}
                  onChangeText={(v) => setPayment((c) => (c ? { ...c, method: v } : c))}
                />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textFaint}
                  value={payment?.date || ''}
                  onChangeText={(v) => setPayment((c) => (c ? { ...c, date: v } : c))}
                />
              </View>
              <View>
                <Text style={styles.fieldLabel}>Bank reference</Text>
                <TextInput
                  style={styles.input}
                  value={payment?.reference || ''}
                  onChangeText={(v) => setPayment((c) => (c ? { ...c, reference: v } : c))}
                />
              </View>
            </ScrollView>
            <View style={styles.sheetActions}>
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => setPayment(null)} disabled={busy}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={savePayment} disabled={busy}>
                {busy ? <ActivityIndicator color={colors.white} />
                      : <Text style={styles.btnPrimaryText}>Save</Text>}
              </Pressable>
            </View>
          </View>
        </Modal>

        {/* Which invoice is the money against? Only issued ones can take one. */}
        <OptionSheet
          visible={pickingInvoice}
          title="Payment against which invoice?"
          subtitle={open.full_name || undefined}
          busy={busy}
          emptyText="This customer has no issued invoice to pay."
          options={shipments.map((row) => ({
            key: row.shipmentId,
            label: row.invoiceNumber || row.reference || 'Invoice',
            detail: `${money(row.invoiced, row.currency)}${row.balance > 0.005
              ? ` · ${money(row.balance, row.currency)} outstanding` : ' · paid'}`,
            icon: 'receipt-outline' as const,
          }))}
          onSelect={(shipmentId) => {
            setPickingInvoice(false);
            setPayment({
              shipmentId,
              amount: '',
              method: '',
              date: new Date().toISOString().slice(0, 10),
              reference: '',
            });
          }}
          onClose={() => setPickingInvoice(false)}
        />

        <ConfirmSheet
          visible={Boolean(removingPayment)}
          title="Remove this payment?"
          message="The balance goes back up by this amount. What happened is kept in the shipment's history."
          confirmLabel="Remove"
          destructive
          busy={busy}
          onConfirm={removePayment}
          onClose={() => setRemovingPayment(null)}
        />
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

function Detail({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailKey}>{k}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {v && String(v).trim() ? v : '-'}
      </Text>
    </View>
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
  headingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  action: { fontSize: 12.5, fontWeight: '900', color: colors.primary, marginTop: spacing.md },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%',
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.lg, gap: spacing.sm,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  sheetActions: { flexDirection: 'row', gap: spacing.sm },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, marginBottom: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: spacing.md, height: 44, fontSize: 14, color: colors.text, backgroundColor: colors.bg,
  },
  btn: { flex: 1, height: 46, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: colors.bg },
  btnGhostText: { fontSize: 14.5, fontWeight: '800', color: colors.textMuted },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { fontSize: 14.5, fontWeight: '800', color: colors.white },
  tabRow: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 12.5, fontWeight: '800', color: colors.textMuted },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: 7 },
  detailKey: { width: 120, fontSize: 12, fontWeight: '700', color: colors.textMuted },
  detailValue: { flex: 1, fontSize: 13.5, color: colors.text },
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
