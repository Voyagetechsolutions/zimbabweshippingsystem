import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing, stageTone } from '../../theme';
import { money, shortDate } from '../../lib/format';
import { Badge, BADGE, Avatar, Card, SectionLabel, Loading } from '../../components/adminui';
import type { MenuStackParams } from '../../navigation/types';
import type { CustomerRecord } from './CustomersScreen';

type Props = NativeStackScreenProps<MenuStackParams, 'CustomerDetail'>;

// Full customer file: identity, addresses, shipments, quotes, invoices,
// payments, proofs and notifications — with call/WhatsApp/email actions and
// audited enable/disable.
export default function CustomerDetailScreen({ route, navigation }: Props) {
  const record = route.params.record as CustomerRecord;
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [proofs, setProofs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [disabled, setDisabled] = useState(false);

  const load = useCallback(async () => {
    const digits = (record.phone || '').replace(/[^0-9]/g, '');
    const shipmentQuery = record.profileId
      ? supabase.from('shipments').select('id,tracking_number,customer_reference,status,created_at,metadata').eq('user_id', record.profileId)
      : record.email
        ? supabase.from('shipments').select('id,tracking_number,customer_reference,status,created_at,metadata').ilike('metadata->sender->>email', record.email)
        : supabase.from('shipments').select('id,tracking_number,customer_reference,status,created_at,metadata').ilike('metadata->>whatsappNumber', `%${digits.slice(-9)}%`);

    const [profileResult, shipmentResult] = await Promise.all([
      record.profileId
        ? supabase.from('profiles').select('*').eq('id', record.profileId).maybeSingle()
        : Promise.resolve({ data: null } as any),
      shipmentQuery.is('deleted_at', null).order('created_at', { ascending: false }).limit(40),
    ]);
    setProfile(profileResult.data || null);
    setDisabled(profileResult.data ? profileResult.data.staff_active === false : false);
    const ships = (shipmentResult.data || []) as any[];
    setShipments(ships);

    const shipmentIds = ships.map((s) => s.id);
    const [addressResult, quoteResult, invoiceResult, paymentResult, proofResult, notificationResult] = await Promise.all([
      record.profileId ? supabase.from('customer_addresses').select('*').eq('user_id', record.profileId) : Promise.resolve({ data: [] } as any),
      record.profileId
        ? supabase.from('custom_quotes').select('id,status,description,quoted_amount,currency,created_at').eq('user_id', record.profileId).order('created_at', { ascending: false }).limit(20)
        : digits
          ? supabase.from('custom_quotes').select('id,status,description,quoted_amount,currency,created_at').ilike('phone_number', `%${digits.slice(-9)}%`).order('created_at', { ascending: false }).limit(20)
          : Promise.resolve({ data: [] } as any),
      shipmentIds.length ? supabase.from('driver_invoices').select('id,invoice_number,total,currency,status,issue_date,shipment_id').in('shipment_id', shipmentIds) : Promise.resolve({ data: [] } as any),
      shipmentIds.length ? supabase.from('payments').select('id,amount,currency,payment_method,payment_status,created_at,shipment_id').in('shipment_id', shipmentIds).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [] } as any),
      record.profileId ? supabase.from('payment_proofs').select('id,billing_month,amount,currency,status,created_at').eq('user_id', record.profileId).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] } as any),
      record.profileId ? supabase.from('notifications').select('id,title,message,type,created_at').eq('user_id', record.profileId).order('created_at', { ascending: false }).limit(12) : Promise.resolve({ data: [] } as any),
    ]);
    setAddresses(addressResult.data || []);
    setQuotes(quoteResult.data || []);
    setInvoices(invoiceResult.data || []);
    setPayments(paymentResult.data || []);
    setProofs(proofResult.data || []);
    setNotifications(notificationResult.data || []);
  }, [record]);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const phone = (record.phone || profile?.phone_number || '').replace(/[^0-9+]/g, '');
  const email = record.email || profile?.email;

  const toggleDisabled = () => {
    if (!record.profileId) { Alert.alert('No account', 'This customer has no app/website account to disable.'); return; }
    const next = !disabled;
    Alert.alert(next ? 'Disable customer' : 'Reactivate customer',
      next ? 'The account is marked inactive and flagged for staff. Continue?' : 'Restore this customer to active?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next ? 'Disable' : 'Reactivate', style: next ? 'destructive' : 'default', onPress: async () => {
            const { error } = await supabase.from('profiles').update({ staff_active: !next ? true : false }).eq('id', record.profileId!);
            if (error) { Alert.alert('Update failed', error.message); return; }
            await supabase.from('audit_logs').insert({
              user_id: session?.user.id, action: next ? 'DISABLE_CUSTOMER' : 'REACTIVATE_CUSTOMER',
              entity_type: 'PROFILE', entity_id: record.profileId, details: { email, phone },
            });
            setDisabled(next);
          },
        },
      ]);
  };

  if (loading) return <Loading />;

  const outstandingInvoices = invoices.filter((i) => ['issued', 'partial', 'overdue'].includes(i.status));

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
      <Card>
        <View style={styles.identityRow}>
          <Avatar name={record.fullName || email} size={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{record.fullName || 'Unknown customer'}</Text>
            {record.customerReference ? <Text style={styles.reference}>{record.customerReference}</Text> : null}
            <Text style={styles.meta}>{[email, record.phone].filter(Boolean).join(' · ') || 'No contact details'}</Text>
            <Text style={styles.meta}>{record.pickupAddress || 'No collection address'}{record.country ? ` · ${record.country}` : ''}</Text>
          </View>
          <Badge text={disabled ? 'Disabled' : record.active ? 'Active' : 'Inactive'} tone={disabled ? BADGE.red : record.active ? BADGE.green : BADGE.grey} />
        </View>
        <View style={styles.actionGrid}>
          <ActionButton icon="call-outline" label="Call" onPress={() => phone && Linking.openURL(`tel:${phone}`)} />
          <ActionButton icon="logo-whatsapp" label="WhatsApp" onPress={() => phone && Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)} />
          <ActionButton icon="mail-outline" label="Email" onPress={() => email && Linking.openURL(`mailto:${email}`)} />
          <ActionButton icon="add-circle-outline" label="Booking" onPress={() => navigation.navigate('ManualBooking')} />
          <ActionButton icon="pricetag-outline" label="Quote" onPress={() => navigation.navigate('CustomQuotes')} />
          <ActionButton icon={disabled ? 'refresh-circle-outline' : 'ban-outline'} label={disabled ? 'Reactivate' : 'Disable'} danger={!disabled} onPress={toggleDisabled} />
        </View>
      </Card>

      <View style={styles.summaryRow}>
        <Summary label="Shipments" value={String(record.shipmentCount)} />
        <Summary label="Quotes" value={String(record.quoteCount)} />
        <Summary label="Lifetime" value={money(record.lifetimeValue, record.currency === 'EUR' ? '€' : '£')} />
        <Summary label="Outstanding" value={money(record.outstanding, record.currency === 'EUR' ? '€' : '£')} tone={record.outstanding > 0 ? colors.danger : colors.primaryDark} />
      </View>

      {addresses.length ? (
        <>
          <SectionLabel text={`Saved delivery addresses (${addresses.length})`} />
          <Card>
            {addresses.map((a) => (
              <View key={a.id} style={styles.listRow}>
                <Ionicons name="location-outline" size={16} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{a.recipient_name}{a.is_default ? ' · default' : ''}</Text>
                  <Text style={styles.meta}>{[a.address_line1, a.city, a.province].filter(Boolean).join(', ')} · {a.recipient_phone}</Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionLabel text={`Shipment history (${shipments.length})`} />
      {shipments.length === 0 ? <Card><Text style={styles.meta}>No shipments yet.</Text></Card> : (
        <Card>
          {shipments.slice(0, 12).map((s) => (
            <Pressable key={s.id} style={styles.listRow} onPress={() => (navigation as any).getParent()?.navigate('Shipments', { screen: 'ShipmentDetail', params: { shipment: s } })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{s.customer_reference || s.tracking_number}</Text>
                <Text style={styles.meta}>{shortDate(s.created_at)} · {s.metadata?.shipment?.description?.slice(0, 60) || 'Shipment'}</Text>
              </View>
              <Badge text={s.status} tone={{ bg: stageTone(s.status).bg, fg: stageTone(s.status).fg }} />
            </Pressable>
          ))}
        </Card>
      )}

      <SectionLabel text={`Quotes (${quotes.length})`} />
      {quotes.length === 0 ? <Card><Text style={styles.meta}>No quote requests.</Text></Card> : (
        <Card>
          {quotes.map((q) => (
            <View key={q.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{q.description?.replace(/^\[[^\]]+\]\s*/, '')}</Text>
                <Text style={styles.meta}>{shortDate(q.created_at)}{q.quoted_amount ? ` · ${money(Number(q.quoted_amount), q.currency === 'EUR' ? '€' : '£')}` : ''}</Text>
              </View>
              <Badge text={q.status.replace('_', ' ')} tone={q.status === 'approved' ? BADGE.green : q.status === 'booked' ? BADGE.blue : q.status === 'rejected' ? BADGE.grey : BADGE.orange} />
            </View>
          ))}
        </Card>
      )}

      <SectionLabel text={`Invoices (${invoices.length})${outstandingInvoices.length ? ` — ${outstandingInvoices.length} open` : ''}`} />
      {invoices.length === 0 ? <Card><Text style={styles.meta}>No invoices on record.</Text></Card> : (
        <Card>
          {invoices.map((i) => (
            <View key={i.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{i.invoice_number}</Text>
                <Text style={styles.meta}>{shortDate(i.issue_date)}</Text>
              </View>
              <Text style={styles.rowValue}>{money(Number(i.total) || 0, i.currency === 'EUR' ? '€' : '£')}</Text>
              <Badge text={i.status} tone={i.status === 'paid' ? BADGE.green : i.status === 'overdue' ? BADGE.red : BADGE.orange} />
            </View>
          ))}
        </Card>
      )}

      <SectionLabel text={`Payments (${payments.length})`} />
      {payments.length === 0 ? <Card><Text style={styles.meta}>No payments recorded.</Text></Card> : (
        <Card>
          {payments.map((p) => (
            <View key={p.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{p.payment_method || 'Payment'}</Text>
                <Text style={styles.meta}>{shortDate(p.created_at)}</Text>
              </View>
              <Text style={styles.rowValue}>{money(Number(p.amount) || 0, p.currency === 'EUR' ? '€' : '£')}</Text>
            </View>
          ))}
        </Card>
      )}

      {proofs.length ? (
        <>
          <SectionLabel text={`Payment proofs (${proofs.length})`} />
          <Card>
            {proofs.map((p) => (
              <View key={p.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{new Date(p.billing_month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
                  <Text style={styles.meta}>{shortDate(p.created_at)}{p.amount ? ` · ${money(Number(p.amount), p.currency === 'EUR' ? '€' : '£')}` : ''}</Text>
                </View>
                <Badge text={p.status} tone={p.status === 'verified' ? BADGE.green : p.status === 'rejected' ? BADGE.red : BADGE.orange} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {notifications.length ? (
        <>
          <SectionLabel text="Recent notifications" />
          <Card>
            {notifications.map((n) => (
              <View key={n.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{n.title}</Text>
                  <Text style={styles.meta} numberOfLines={2}>{n.message}</Text>
                </View>
                <Text style={styles.meta}>{shortDate(n.created_at)}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

function ActionButton({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={[styles.action, danger && { backgroundColor: colors.redSoft }]} onPress={onPress}>
      <Ionicons name={icon} size={17} color={danger ? colors.danger : colors.primaryDark} />
      <Text style={[styles.actionLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.summaryValue, tone ? { color: tone } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.sm },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  name: { fontSize: 17, fontWeight: '800', color: colors.text },
  reference: { fontSize: 11, fontWeight: '800', color: colors.primary, marginTop: 1 },
  meta: { fontSize: 11.5, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  actionLabel: { fontSize: 11.5, fontWeight: '800', color: colors.primaryDark },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summary: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, gap: 3 },
  summaryLabel: { fontSize: 8.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  summaryValue: { fontSize: 13, fontWeight: '800', color: colors.text },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  rowValue: { fontSize: 12.5, fontWeight: '800', color: colors.text },
});
