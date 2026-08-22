import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';

interface Review {
  id: string;
  created_at: string;
  full_name: string;
  customer_reference_number: string;
  overall_experience: number;
  overall_customer_service: number;
  additional_comments: string | null;
  goods_rating?:number|null;driver_rating?:number|null;needs_attention?:boolean;
}

export default function FeedbackScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const[service,customer]=await Promise.all([supabase.from('service_reviews').select('id, created_at, full_name, customer_reference_number, overall_experience, overall_customer_service, additional_comments').order('created_at',{ascending:false}),supabase.from('customer_feedback').select('id,created_at,service_rating,driver_rating,goods_rating,comments,needs_attention,shipment:shipments(customer_reference,tracking_number,metadata)').order('created_at',{ascending:false})]);
    const mapped=((customer.data as any[])||[]).map((row:any)=>({id:row.id,created_at:row.created_at,full_name:row.shipment?.metadata?.sender?.name||'App customer',customer_reference_number:row.shipment?.customer_reference||row.shipment?.tracking_number||'Shipment',overall_experience:row.service_rating,overall_customer_service:row.driver_rating||row.service_rating,additional_comments:row.comments,goods_rating:row.goods_rating,driver_rating:row.driver_rating,needs_attention:row.needs_attention}));
    setReviews([...(mapped as Review[]),...((service.data as Review[])||[])].sort((a,b)=>b.created_at.localeCompare(a.created_at)));
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      style={styles.safe}
      data={reviews}
      keyExtractor={(r) => r.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Text style={styles.empty}>No feedback yet</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.top}>
            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.score}>{item.overall_experience}/5</Text>
          </View>
          <Text style={styles.ref}>{item.customer_reference_number}</Text>
          <Text style={styles.meta}>Customer service: {item.overall_customer_service}/5</Text>
          {item.driver_rating?<Text style={styles.meta}>Driver: {item.driver_rating}/5 · Goods: {item.goods_rating}/5</Text>:null}
          {item.needs_attention?<Text style={styles.attention}>Needs attention</Text>:null}
          {item.additional_comments ? <Text style={styles.comment}>{item.additional_comments}</Text> : null}
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, gap: 3 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  score: { fontSize: 14, fontWeight: '700', color: colors.primary },
  ref: { fontSize: 12, color: colors.textMuted },
  meta: { fontSize: 12, color: colors.textMuted },
  comment: { fontSize: 13, color: colors.text, marginTop: 4 },
  date: { fontSize: 11, color: colors.textFaint, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
  attention:{fontSize:11,fontWeight:'800',color:colors.danger,marginTop:3},
});
