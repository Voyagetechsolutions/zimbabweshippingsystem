import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, Alert, Switch } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { loadStaffBusinessConfig, type StaffBusinessConfig } from '../../lib/businessConfig';

// Mirrors the website's booking submit: shipments + payments + receipts rows
// with the same metadata shape, so the booking shows up everywhere.

function trackingNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = 'ZS-';
  for (let i = 0; i < 8; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
}

export default function ManualBookingScreen() {
  const [business, setBusiness] = useState<StaffBusinessConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [country, setCountry] = useState<'England' | 'Ireland'>('England');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [rxName, setRxName] = useState('');
  const [rxPhone, setRxPhone] = useState('');
  const [rxAddress, setRxAddress] = useState('');
  const [rxCity, setRxCity] = useState('');
  const [drums, setDrums] = useState('0');
  const [trunks, setTrunks] = useState('0');
  const [drumPrice, setDrumPrice] = useState('');
  const [trunkPrice, setTrunkPrice] = useState('');
  const [sealPrice, setSealPrice] = useState('');
  const [wantSeal, setWantSeal] = useState(false);
  /**
   * Anything that is not a drum, one row each.
   *
   * This used to be a single "Other items (agent quote)" text box, so a booking
   * for a sofa, a fridge and two suitcases arrived as one unpriced sentence —
   * which the invoice could not itemise and the warehouse could not tick off.
   * Drums stay a quantity because they genuinely are interchangeable; a fridge
   * is not, and every one of these needs its own description.
   */
  const [otherItems, setOtherItems] = useState<Array<{ description: string; quantity: string; unitPrice: string }>>([]);
  const [payment, setPayment] = useState('');
  const [busy, setBusy] = useState(false);

  const currency = country === 'Ireland' ? 'EUR' : 'GBP';
  const symbol = country === 'Ireland' ? '€' : '£';

  useEffect(() => { loadStaffBusinessConfig().then((next) => { setBusiness(next); setPayment(next.payments.methods[0]?.label || ''); }).catch((e) => setConfigError(e?.message || 'Could not load business settings.')); }, []);
  useEffect(() => {
    if (!business) return;
    const localPrice = (id: string) => {
      const row = business.catalogue.find((item) => item.id === id);
      return country === 'Ireland' ? row?.priceIE : row?.priceUK;
    };
    const drum = localPrice('plastic_drum'); const trunk = localPrice('trunk'); const seal = localPrice('seal');
    setDrumPrice(drum == null ? '' : String(drum)); setTrunkPrice(trunk == null ? '' : String(trunk)); setSealPrice(seal == null ? '' : String(seal));
  }, [business, country]);

  const totals = useMemo(() => {
    const dQty = parseInt(drums, 10) || 0;
    const tQty = parseInt(trunks, 10) || 0;
    const dUnit = parseFloat(drumPrice) || 0;
    const tUnit = parseFloat(trunkPrice) || 0;
    const sUnit = parseFloat(sealPrice) || 0;
    const sealQty = wantSeal ? dQty + tQty : 0;
    const otherLines = otherItems
      .map((item) => ({
        description: item.description.trim(),
        quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
        unitPrice: parseFloat(item.unitPrice) || 0,
      }))
      .filter((item) => item.description.length > 0);
    const otherTotal = otherLines.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const base = dQty * dUnit + tQty * tUnit + sealQty * sUnit + otherTotal;
    const premium = payment === 'Pay on Arrival' ? Number(business?.fees.payOnArrivalPremiumPercent || 0) : 0;
    const final = base * (1 + premium / 100);
    return { dQty, tQty, dUnit, tUnit, sUnit, sealQty, base, final, otherLines, otherTotal };
  }, [drums, trunks, drumPrice, trunkPrice, sealPrice, wantSeal, payment, business, otherItems]);

  const submit = async () => {
    if (!firstName.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      Alert.alert('Missing details', 'Sender name, phone, address and city are required.');
      return;
    }
    if (!rxName.trim() || !rxPhone.trim() || !rxAddress.trim() || !rxCity.trim()) {
      Alert.alert('Missing details', 'Receiver name, phone, address and city are required.');
      return;
    }
    if (otherItems.some((item) => item.description.trim().length < 3)) {
      Alert.alert('Describe every item', 'Each item needs its own description — what it is, its size or material, and its condition. Remove any row you do not need.');
      return;
    }
    if (totals.dQty <= 0 && totals.tQty <= 0 && totals.otherLines.length === 0) {
      Alert.alert('No items', 'Add drums, trunks, or list the items being shipped.');
      return;
    }

    setBusy(true);
    try {
      const tn = trackingNumber();
      const ts = Date.now();
      const receiptNumber = `RCP-${String(ts).slice(-10)}`;
      const transactionId = `TX-${String(ts).slice(-12)}`;
      const hasPriced = totals.dQty > 0 || totals.tQty > 0 || totals.otherTotal > 0;
      const paymentMethod = hasPriced ? payment : 'agentQuote';

      const sender = {
        firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() || null,
        phone: phone.trim(), address: address.trim(), city: city.trim(),
        postcode: postcode.trim() || 'N/A', country,
      };
      const recipient = {
        name: rxName.trim(), phone: rxPhone.trim(), address: rxAddress.trim(),
        city: rxCity.trim(), country: 'Zimbabwe',
      };
      const metadata = {
        sender, recipient,
        items: {
          drums: totals.dQty > 0 ? { quantity: totals.dQty, pricePerDrum: totals.dUnit, totalPrice: totals.dQty * totals.dUnit, currency } : null,
          trunks: totals.tQty > 0 ? { quantity: totals.tQty, pricePerTrunk: totals.tUnit, totalPrice: totals.tQty * totals.tUnit, currency } : null,
          // One row per item, plus the joined summary the older readers expect.
          otherItems: totals.otherLines,
          boxes: totals.otherLines.length
            ? { description: totals.otherLines.map((i) => `${i.quantity} × ${i.description}`).join('; ') }
            : null,
          addOns: { metalSeal: wantSeal, metalSealPrice: totals.sUnit },
        },
        pricing: { baseAmount: totals.base, finalAmount: totals.final, paymentMethod, currency },
        shipmentDetails: {
          type: [totals.dQty > 0 && 'Drums', totals.tQty > 0 && 'Trunks', totals.otherLines.length > 0 && 'Other Items'].filter(Boolean).join(' + ') || 'Standard',
          includeDrums: totals.dQty > 0, drumQuantity: totals.dQty,
          includeTrunks: totals.tQty > 0, trunkQuantity: totals.tQty,
          includeOtherItems: totals.otherLines.length > 0, wantMetalSeal: wantSeal,
          category: totals.otherLines.map((i) => i.description).join('; ') || null,
        },
        // A manual booking now carries invoice lines like every other booking,
        // so its invoice and delivery note itemise instead of showing one total.
        invoice: {
          invoiceNumber: `INV-${tn}`,
          issueDate: new Date(ts).toISOString().slice(0, 10),
          currency,
          items: [
            ...(totals.dQty > 0 ? [{ item: 'Drums', description: 'Plastic shipping drum (200-220L)', quantity: totals.dQty, unitPrice: totals.dUnit }] : []),
            ...(totals.tQty > 0 ? [{ item: 'Trunks', description: 'Trunk / storage box', quantity: totals.tQty, unitPrice: totals.tUnit }] : []),
            ...(totals.sealQty > 0 ? [{ item: 'Metal coded seals', description: 'Metal coded seal', quantity: totals.sealQty, unitPrice: totals.sUnit }] : []),
            ...totals.otherLines.map((line) => ({ item: line.description, description: line.description, quantity: line.quantity, unitPrice: line.unitPrice })),
          ],
          payments: [],
        },
        bookingSource: 'staff-app-manual',
        createdAt: new Date(ts).toISOString(),
      };

      const { data: shipmentRow, error: shipErr } = await supabase
        .from('shipments')
        .insert({
          tracking_number: tn,
          user_id: null,
          origin: `${city.trim()}, ${country}`,
          destination: `${rxCity.trim()}, Zimbabwe`,
          status: hasPriced ? 'Pending' : 'Awaiting Quote',
          goods_description: [
            totals.dQty > 0 ? `${totals.dQty} × Plastic shipping drum (200-220L)` : '',
            totals.tQty > 0 ? `${totals.tQty} × Trunk / storage box` : '',
            ...totals.otherLines.map((i) => `${i.quantity} × ${i.description}`),
          ].filter(Boolean).join('\n') || null,
          metadata,
          can_modify: true,
          can_cancel: true,
        })
        .select()
        .single();
      if (shipErr) throw shipErr;

      const { data: paymentRow, error: payErr } = await supabase
        .from('payments')
        .insert({
          user_id: null, shipment_id: shipmentRow.id, amount: totals.final, currency,
          payment_method: paymentMethod, payment_status: 'pending', transaction_id: transactionId,
        })
        .select()
        .single();
      if (payErr) throw payErr;

      const { error: rcptErr } = await supabase.from('receipts').insert({
        user_id: null, shipment_id: shipmentRow.id, payment_id: paymentRow.id,
        receipt_number: receiptNumber, amount: totals.final, currency,
        payment_method: paymentMethod, status: 'pending',
        sender_details: sender, recipient_details: recipient,
        shipment_details: metadata.items,
        payment_info: { paymentMethod, baseAmount: totals.base, finalAmount: totals.final, transactionId },
        collection_info: {
          pickupAddress: `${address.trim()}, ${city.trim()}, ${postcode.trim() || 'N/A'}`,
          deliveryAddress: `${rxAddress.trim()}, ${rxCity.trim()}, Zimbabwe`,
        },
      });
      if (rcptErr) console.warn('Receipt insert failed (non-fatal):', rcptErr.message);

      Alert.alert('Booking created', `Tracking: ${tn}\nTotal: ${symbol}${totals.final.toFixed(2)}`);
      // Reset the items but keep the form usable for another booking.
      setDrums('0'); setTrunks('0'); setOtherItems([]); setWantSeal(false);
    } catch (e: any) {
      Alert.alert('Booking failed', e?.message || 'Could not create booking');
    } finally {
      setBusy(false);
    }
  };

  if (!business || configError) return <View style={[styles.safe,{alignItems:'center',justifyContent:'center',padding:spacing.lg}]}><Text style={styles.group}>{configError || 'Loading current catalogue…'}</Text></View>;

  return (
    <ScrollView style={styles.safe} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.group}>Collection country</Text>
      <View style={styles.rowWrap}>
        {(['England', 'Ireland'] as const).map((c) => (
          <Pressable key={c} onPress={() => setCountry(c)} style={[styles.chip, country === c && styles.chipActive]}>
            <Text style={[styles.chipText, country === c && styles.chipTextActive]}>{c === 'England' ? 'UK (England)' : 'Ireland'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.group}>Sender</Text>
      <View style={styles.rowWrap}>
        <Field style={{ flex: 1 }} label="First name" value={firstName} onChange={setFirstName} />
        <Field style={{ flex: 1 }} label="Last name" value={lastName} onChange={setLastName} />
      </View>
      <Field label="Email (optional)" value={email} onChange={setEmail} keyboard="email-address" />
      <Field label="Phone" value={phone} onChange={setPhone} keyboard="phone-pad" />
      <Field label="Pickup address" value={address} onChange={setAddress} />
      <View style={styles.rowWrap}>
        <Field style={{ flex: 1 }} label="City / town" value={city} onChange={setCity} />
        <Field style={{ flex: 1 }} label="Postcode" value={postcode} onChange={setPostcode} />
      </View>

      <Text style={styles.group}>Receiver (Zimbabwe)</Text>
      <Field label="Full name" value={rxName} onChange={setRxName} />
      <Field label="Phone" value={rxPhone} onChange={setRxPhone} keyboard="phone-pad" />
      <Field label="Delivery address" value={rxAddress} onChange={setRxAddress} />
      <Field label="City / town" value={rxCity} onChange={setRxCity} />

      <Text style={styles.group}>Items</Text>
      <View style={styles.rowWrap}>
        <Field style={{ flex: 1 }} label="Drums" value={drums} onChange={setDrums} keyboard="number-pad" />
        <Field style={{ flex: 1 }} label={`Price/drum (${symbol})`} value={drumPrice} onChange={setDrumPrice} keyboard="decimal-pad" />
      </View>
      <View style={styles.rowWrap}>
        <Field style={{ flex: 1 }} label="Trunks / boxes" value={trunks} onChange={setTrunks} keyboard="number-pad" />
        <Field style={{ flex: 1 }} label={`Price/trunk (${symbol})`} value={trunkPrice} onChange={setTrunkPrice} keyboard="decimal-pad" />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Metal coded seals ({symbol}{sealPrice} per item)</Text>
        <Switch value={wantSeal} onValueChange={setWantSeal} trackColor={{ true: colors.primary }} />
      </View>
      <Text style={styles.fieldLabel}>OTHER ITEMS</Text>
      <Text style={styles.itemsHint}>
        Anything that is not a drum goes on its own line — a sofa, a fridge, a suitcase. Describe each
        one; leave the price at 0 if the office is still quoting it.
      </Text>
      {otherItems.map((item, index) => (
        <View key={index} style={styles.itemCard}>
          <Field
            label={`Item ${index + 1} description`}
            value={item.description}
            onChange={(v) => setOtherItems((rows) => rows.map((row, i) => (i === index ? { ...row, description: v } : row)))}
          />
          <View style={styles.rowWrap}>
            <Field
              style={{ flex: 1 }} label="Qty" keyboard="number-pad" value={item.quantity}
              onChange={(v) => setOtherItems((rows) => rows.map((row, i) => (i === index ? { ...row, quantity: v } : row)))}
            />
            <Field
              style={{ flex: 1 }} label={`Unit price (${symbol})`} keyboard="decimal-pad" value={item.unitPrice}
              onChange={(v) => setOtherItems((rows) => rows.map((row, i) => (i === index ? { ...row, unitPrice: v } : row)))}
            />
          </View>
          <Pressable onPress={() => setOtherItems((rows) => rows.filter((_, i) => i !== index))} hitSlop={8}>
            <Text style={styles.removeItem}>Remove item {index + 1}</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        style={styles.addItem}
        onPress={() => setOtherItems((rows) => [...rows, { description: '', quantity: '1', unitPrice: '' }])}
      >
        <Text style={styles.addItemText}>+ ADD AN ITEM</Text>
      </Pressable>

      <Text style={styles.group}>Payment</Text>
      <View style={styles.rowWrap}>
        {(business?.payments.methods || []).filter((m) => m.id !== 'other_payment').map((m) => (
          <Pressable key={m.id} onPress={() => setPayment(m.label)} style={[styles.chip, payment === m.label && styles.chipActive]}>
            <Text style={[styles.chipText, payment === m.label && styles.chipTextActive]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.totalCard}>
        <Row k="Subtotal" v={`${symbol}${totals.base.toFixed(2)}`} />
        {payment === 'Pay on Arrival' && Number(business.fees.payOnArrivalPremiumPercent || 0)>0 && <Row k={`Pay on Arrival premium (${business.fees.payOnArrivalPremiumPercent}%)`} v={`${symbol}${(totals.final - totals.base).toFixed(2)}`} />}
        <Row k="Total" v={`${symbol}${totals.final.toFixed(2)}`} bold />
      </View>

      <Pressable style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Create Booking</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, value, onChange, keyboard, style }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: 'default' | 'email-address' | 'phone-pad' | 'number-pad' | 'decimal-pad'; style?: object;
}) {
  return (
    <View style={[{ marginBottom: spacing.sm }, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input} value={value} onChangeText={onChange}
        keyboardType={keyboard || 'default'} autoCapitalize={keyboard === 'email-address' ? 'none' : 'sentences'}
        placeholderTextColor={colors.textFaint}
      />
    </View>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalK, bold && styles.totalBold]}>{k}</Text>
      <Text style={[styles.totalV, bold && styles.totalBold]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  itemsHint: { fontSize: 11.5, color: colors.textMuted, lineHeight: 16, marginBottom: spacing.sm },
  itemCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surface },
  removeItem: { fontSize: 12, fontWeight: '700', color: colors.danger },
  addItem: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.sm, paddingVertical: 12, alignItems: 'center', marginBottom: spacing.sm },
  addItemText: { fontSize: 12.5, fontWeight: '800', color: colors.primary },
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 48 },
  group: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  rowWrap: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.white },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md,
    paddingVertical: 9, fontSize: 14, color: colors.text, backgroundColor: colors.surface,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  switchLabel: { fontSize: 13, color: colors.text, fontWeight: '600' },
  totalCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg, gap: 6,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalK: { fontSize: 13, color: colors.textMuted },
  totalV: { fontSize: 13, color: colors.text, fontWeight: '600' },
  totalBold: { fontSize: 15, fontWeight: '700', color: colors.text },
  submit: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
