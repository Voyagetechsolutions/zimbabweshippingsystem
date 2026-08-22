import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadow, spacing } from '../theme';
import { buildDeliveryNoteHtml, sharePdf } from '../lib/documents';
import { receiverName, type Shipment } from '../lib/shipment';
import { verificationLabel, type VerificationStatus } from '../lib/deliveries';

// The driver's delivery notes.
//
// A note is a document the office stands behind, so it only becomes downloadable
// once an admin has verified it. Until then the row shows what it is waiting for.

type NoteRow = {
  id: string;
  note_number: string;
  shipment_id: string;
  recipient_name: string | null;
  delivery_address: string | null;
  delivered_at: string | null;
  proof_count: number;
  status: string;
  verification_status: VerificationStatus;
  verification_notes: string | null;
  seal_codes: string[] | null;
  seal_status: string | null;
  discrepancy_note: string | null;
  created_at: string;
  shipment: Shipment | null;
};

function tone(status: VerificationStatus) {
  if (status === 'verified') return { bg: colors.primarySoft, fg: colors.primaryDark, icon: 'shield-checkmark' as const };
  if (status === 'rejected') return { bg: colors.redSoft, fg: colors.danger, icon: 'close-circle' as const };
  return { bg: colors.amberSoft, fg: colors.amber, icon: 'hourglass-outline' as const };
}

export default function DeliveryNotesDriverScreen() {
  const { session } = useAuth();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    setError(null);
    const { data, error: loadError } = await supabase
      .from('delivery_notes')
      .select('id,note_number,shipment_id,recipient_name,delivery_address,delivered_at,proof_count,status,verification_status,verification_notes,seal_codes,seal_status,discrepancy_note,created_at,shipment:shipments(*)')
      .eq('driver_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (loadError) {
      // verification_status only exists once the delivery migration is applied.
      setError(/verification_status/i.test(loadError.message)
        ? 'The delivery workflow has not been deployed to the database yet. Ask an admin to run the staff-ops setup.'
        : loadError.message);
      return;
    }
    setNotes(((data || []) as any[]).map((row) => ({
      ...row,
      verification_status: (row.verification_status || 'pending') as VerificationStatus,
      shipment: row.shipment as Shipment | null,
    })));
  }, [session?.user.id]);

  useFocusEffect(useCallback(() => { (async () => { await load(); setLoading(false); })(); }, [load]));

  useEffect(() => {
    const channel = supabase
      .channel(`driver-notes-${session?.user.id || 'anon'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_notes' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, session?.user.id]);

  const counts = useMemo(() => ({
    verified: notes.filter((note) => note.verification_status === 'verified').length,
    pending: notes.filter((note) => note.verification_status === 'pending').length,
    rejected: notes.filter((note) => note.verification_status === 'rejected').length,
  }), [notes]);

  const download = async (note: NoteRow) => {
    if (note.verification_status !== 'verified') {
      Alert.alert('Not verified yet',
        note.verification_status === 'rejected'
          ? `Admin rejected this note. ${note.verification_notes || 'Check the goods and seal against the booking.'}`
          : 'Admin has to verify this delivery note before it can be downloaded or used.');
      return;
    }
    if (!note.shipment) { Alert.alert('Missing shipment', 'This note has no linked consignment record.'); return; }
    setDownloading(note.id);
    try {
      await sharePdf(
        buildDeliveryNoteHtml(note.shipment, { deliveryNote: note, proofSummary: { count: note.proof_count } }),
        `${note.note_number}.pdf`,
      );
    } catch (e: any) { Alert.alert('Could not create PDF', e?.message || 'Try again.'); }
    finally { setDownloading(null); }
  };

  if (loading) {
    return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
        <View>
          <Text style={styles.title}>Delivery notes</Text>
          <Text style={styles.subtitle}>
            {counts.verified} verified · {counts.pending} waiting on admin{counts.rejected ? ` · ${counts.rejected} rejected` : ''}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {notes.length === 0 && !error ? (
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={colors.primary} />
            <Text style={styles.emptyTitle}>No delivery notes yet</Text>
            <Text style={styles.emptyText}>A note is raised for every consignment you load, then goes to admin to be verified.</Text>
          </View>
        ) : null}

        {notes.map((note) => {
          const badge = tone(note.verification_status);
          const canDownload = note.verification_status === 'verified';
          return (
            <View key={note.id} style={styles.card}>
              <View style={styles.rowTop}>
                <Text style={styles.noteNumber}>{note.note_number}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Ionicons name={badge.icon} size={12} color={badge.fg} />
                  <Text style={[styles.badgeText, { color: badge.fg }]}>{verificationLabel(note.verification_status)}</Text>
                </View>
              </View>
              <Text style={styles.reference}>
                {note.shipment?.customer_reference || '—'} · {note.shipment?.tracking_number || 'No tracking'}
              </Text>
              <Text style={styles.line}>
                {note.recipient_name || (note.shipment ? receiverName(note.shipment) : 'Recipient')}
              </Text>
              <Text style={styles.meta} numberOfLines={2}>
                {note.delivery_address || note.shipment?.destination || 'Address not recorded'}
              </Text>
              {note.seal_codes?.length ? (
                <Text style={styles.meta}>Seal: {note.seal_codes.filter(Boolean).join(', ')}</Text>
              ) : null}
              {note.discrepancy_note ? <Text style={styles.discrepancy}>{note.discrepancy_note}</Text> : null}
              {note.verification_status === 'rejected' && note.verification_notes ? (
                <Text style={styles.reject}>Admin: {note.verification_notes}</Text>
              ) : null}
              {note.delivered_at ? (
                <Text style={styles.meta}>Delivered {new Date(note.delivered_at).toLocaleString('en-GB')}</Text>
              ) : null}
              <Pressable style={[styles.download, !canDownload && styles.downloadDisabled]}
                onPress={() => download(note)} disabled={downloading === note.id}>
                {downloading === note.id ? <ActivityIndicator color={colors.white} size="small" /> : (
                  <>
                    <Ionicons name={canDownload ? 'download-outline' : 'lock-closed-outline'} size={15}
                      color={canDownload ? colors.white : colors.textMuted} />
                    <Text style={[styles.downloadText, !canDownload && { color: colors.textMuted }]}>
                      {canDownload ? 'Download / share PDF' : 'Locked until admin verifies'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 88 },
  title: { fontSize: 25, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 3 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  noteNumber: { fontSize: 14, fontWeight: '800', color: colors.text, flexShrink: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 9.5, fontWeight: '800' },
  reference: { fontSize: 10.5, fontWeight: '800', color: colors.primary, marginTop: 3 },
  line: { fontSize: 13.5, fontWeight: '700', color: colors.text, marginTop: 2 },
  meta: { fontSize: 11.5, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  discrepancy: { fontSize: 11.5, color: colors.amber, marginTop: 4, lineHeight: 16 },
  reject: { fontSize: 11.5, color: colors.danger, fontWeight: '700', marginTop: 4, lineHeight: 16 },
  download: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 11 },
  downloadDisabled: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  downloadText: { color: colors.white, fontWeight: '800', fontSize: 12.5 },
  errorCard: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: '#fecaca', backgroundColor: colors.redSoft },
  errorText: { flex: 1, fontSize: 12, color: '#991b1b', lineHeight: 17 },
  empty: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: 34, ...shadow },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  emptyText: { fontSize: 12.5, lineHeight: 18, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
});
