import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';
import { FlagStripe, Pill, Button } from '../components/ui';
import { Shipment, itemsSummary, statusTone } from '../lib/shipment';
import { shortDate } from '../lib/format';
import { useAppTheme } from '../context/ThemeContext';

export default function ShipmentsScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [tracking, setTracking] = useState('');
  const [searching, setSearching] = useState(false);
  const {palette}=useAppTheme();

  const load = useCallback(async () => {
    if (!session?.user) { setShipments([]); return; }
    const { data } = await supabase
      .from('shipments')
      .select('id, tracking_number, customer_reference, status, created_at, metadata')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    setShipments((data as Shipment[]) || []);
  }, [session?.user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Track any shipment by number — works without an account, same as the website.
  const trackByNumber = async () => {
    const clean = tracking.trim();
    if (!clean) return;
    setSearching(true);
    try {
      const { data } = await supabase
        .from('shipments')
        .select('id')
        .or(`tracking_number.eq.${clean},customer_reference.eq.${clean}`)
        .maybeSingle();
      if (data?.id) navigation.navigate('ShipmentDetail', { id: data.id });
      else Alert.alert('Not found', 'No shipment matches that tracking number or reference. Check the number, or ask Zimmy to look it up.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe,{backgroundColor:palette.bg}]} edges={['top']}>
      <FlagStripe />
      <FlatList
        data={shipments}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.body}
        onRefresh={load}
        refreshing={false}
        ListHeaderComponent={
          <View>
            <Text style={[styles.title,{color:palette.text}]}>Shipments</Text>
            <View style={styles.trackRow}>
              <TextInput
                style={[styles.trackInput,{backgroundColor:palette.surface,borderColor:palette.border,color:palette.text}]}
                value={tracking}
                onChangeText={setTracking}
                placeholder="Track by number (ZIMSHIP-…)"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="characters"
                onSubmitEditing={trackByNumber}
              />
              <Pressable style={styles.trackBtn} onPress={trackByNumber} disabled={searching}>
                <Ionicons name="search" size={18} color={colors.white} />
              </Pressable>
            </View>
            {shipments.length > 0 && <Text style={styles.section}>MY SHIPMENTS</Text>}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={48} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>{session ? 'No shipments yet' : 'Sign in to see your shipments'}</Text>
            <Text style={styles.emptyText}>
              {session
                ? 'Book your first drum, appliance or custom shipment and track it here all the way to Zimbabwe.'
                : 'You can still track any shipment by its number above, or ask Zimmy.'}
            </Text>
            {session
              ? <Button title="Book a Shipment" onPress={() => navigation.navigate('Book')} style={{ alignSelf: 'stretch' }} />
              : <Button title="Sign in" onPress={() => navigation.navigate('Auth')} style={{ alignSelf: 'stretch' }} />}
          </View>
        }
        renderItem={({ item }) => {
          const tone = statusTone(item.status);
          return (
            <Pressable style={[styles.card,{backgroundColor:palette.surface,borderColor:palette.border}]} onPress={() => navigation.navigate('ShipmentDetail', { id: item.id })}>
              <View style={styles.rowBetween}>
                <Text style={styles.ref}>{item.customer_reference || item.tracking_number}</Text>
                <Pill text={item.status} bg={tone.bg} fg={tone.fg} />
              </View>
              <Text style={[styles.itemText,{color:palette.text}]}>{itemsSummary(item)}</Text>
              <Text style={styles.meta}>Booked {shortDate(item.created_at)}</Text>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: 48, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  trackRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  trackInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.white, fontSize: 14, color: colors.text },
  trackBtn: { backgroundColor: colors.green, borderRadius: radius.sm, width: 44, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: 3 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 13, fontWeight: '800', color: colors.green },
  itemText: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.textMuted },
  empty: { alignItems: 'center', gap: 8, paddingTop: 40, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md, lineHeight: 18 },
});
