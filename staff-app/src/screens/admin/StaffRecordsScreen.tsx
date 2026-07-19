import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { money, shortDate } from '../../lib/format';

export default function StaffRecordsScreen(){
  const [loading,setLoading]=useState(true);const [refreshing,setRefreshing]=useState(false);const [attendance,setAttendance]=useState<any[]>([]);const [invoices,setInvoices]=useState<any[]>([]);const [notes,setNotes]=useState<any[]>([]);const [proofs,setProofs]=useState<any[]>([]);const [expenses,setExpenses]=useState<any[]>([]);const [names,setNames]=useState<Record<string,string>>({});
  const load=useCallback(async()=>{
    const [a,i,n,p,e,d]=await Promise.all([
      supabase.from('driver_attendance').select('*').order('work_date',{ascending:false}).limit(30),
      supabase.from('driver_invoices').select('id,invoice_number,total,currency,status,issue_date,driver_id').order('created_at',{ascending:false}).limit(30),
      supabase.from('delivery_notes').select('id,note_number,delivery_address,status,delivered_at,driver_id').order('created_at',{ascending:false}).limit(30),
      supabase.from('driver_proofs').select('id,proof_type,storage_path,captured_at,driver_id').order('captured_at',{ascending:false}).limit(12),
      supabase.from('finance_expenses').select('id,category,description,amount,currency,status,expense_date').in('status',['recorded','draft']).order('expense_date',{ascending:false}),
      supabase.from('profiles').select('id,full_name,email').eq('role','driver'),
    ]);const error=a.error||i.error||n.error||p.error||e.error||d.error;if(error)throw error;
    setAttendance(a.data||[]);setInvoices(i.data||[]);setNotes(n.data||[]);setExpenses(e.data||[]);setNames(Object.fromEntries((d.data||[]).map((row:any)=>[row.id,row.full_name||row.email||'Driver'])));
    setProofs(await Promise.all((p.data||[]).map(async(row:any)=>{const {data}=await supabase.storage.from('driver-proofs').createSignedUrl(row.storage_path,3600);return{...row,url:data?.signedUrl};})));
  },[]);
  useEffect(()=>{(async()=>{try{await load();}catch(e:any){Alert.alert('Records unavailable',e?.message);}finally{setLoading(false);}})();},[load]);
  const refresh=async()=>{setRefreshing(true);try{await load();}finally{setRefreshing(false);}};
  const decide=async(id:string,approved:boolean)=>{const {error}=await supabase.rpc('approve_finance_expense',{p_expense_id:id,p_approved:approved,p_notes:null});if(error)Alert.alert('Decision failed',error.message);else await load();};
  if(loading)return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary}/></View>;
  return <ScrollView style={styles.safe} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh}/>}>
    <Text style={styles.title}>Staff control centre</Text><Text style={styles.sub}>Attendance, invoices, handover evidence and approvals</Text>
    <Section title="Attendance" icon="time-outline">{attendance.length?attendance.map(row=><Row key={row.id} title={names[row.driver_id]||'Driver'} detail={`${row.work_date} · In ${new Date(row.clocked_in_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`} right={row.clocked_out_at?`Out ${new Date(row.clocked_out_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`:'On shift'}/>):<Empty/>}</Section>
    <Section title="Pickup invoices" icon="receipt-outline">{invoices.length?invoices.map(row=><Row key={row.id} title={row.invoice_number} detail={`${names[row.driver_id]||'Driver'} · ${shortDate(row.issue_date)}`} right={`${money(Number(row.total)||0,row.currency==='EUR'?'€':'£')} · ${row.status}`}/>):<Empty/>}</Section>
    <Section title="Delivery notes" icon="document-text-outline">{notes.length?notes.map(row=><Row key={row.id} title={row.note_number} detail={row.delivery_address||'No address'} right={row.delivered_at?shortDate(row.delivered_at):row.status}/>):<Empty/>}</Section>
    <Section title="Goods photographs" icon="camera-outline"><View style={styles.grid}>{proofs.length?proofs.map(row=><View key={row.id} style={styles.proof}>{row.url?<Image source={{uri:row.url}} style={styles.image}/>:<View style={styles.image}/>}<Text style={styles.proofType}>{row.proof_type.replace(/_/g,' ')}</Text><Text style={styles.proofMeta}>{names[row.driver_id]||'Driver'}</Text></View>):<Empty/>}</View></Section>
    <Section title={`Expense approvals · ${expenses.length}`} icon="checkmark-done-outline">{expenses.length?expenses.map(row=><View key={row.id} style={styles.expense}><View style={{flex:1}}><Text style={styles.rowTitle}>{row.description}</Text><Text style={styles.rowDetail}>{row.category} · {shortDate(row.expense_date)}</Text></View><Text style={styles.expenseAmount}>{money(Number(row.amount)||0)}</Text><Pressable onPress={()=>decide(row.id,true)}><Ionicons name="checkmark-circle" size={25} color={colors.primary}/></Pressable><Pressable onPress={()=>decide(row.id,false)}><Ionicons name="close-circle" size={25} color={colors.danger}/></Pressable></View>):<Empty/>}</Section>
  </ScrollView>;
}
function Section({title,icon,children}:{title:string;icon:keyof typeof Ionicons.glyphMap;children:React.ReactNode}){return <View style={styles.card}><View style={styles.head}><Ionicons name={icon} size={20} color={colors.primary}/><Text style={styles.section}>{title}</Text></View>{children}</View>}
function Row({title,detail,right}:{title:string;detail:string;right:string}){return <View style={styles.row}><View style={{flex:1}}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail} numberOfLines={1}>{detail}</Text></View><Text style={styles.right}>{right}</Text></View>}
function Empty(){return <Text style={styles.empty}>No records yet.</Text>}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},center:{flex:1,alignItems:'center',justifyContent:'center'},content:{padding:spacing.lg,gap:spacing.md,paddingBottom:48},title:{fontSize:22,fontWeight:'800',color:colors.text},sub:{fontSize:12,color:colors.textMuted,marginTop:-8},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.lg,gap:2},head:{flexDirection:'row',alignItems:'center',gap:spacing.sm,marginBottom:6},section:{fontSize:15,fontWeight:'800',color:colors.text},row:{flexDirection:'row',alignItems:'center',gap:spacing.sm,borderBottomWidth:1,borderBottomColor:colors.border,paddingVertical:9},rowTitle:{fontSize:12,fontWeight:'800',color:colors.text},rowDetail:{fontSize:10,color:colors.textMuted,marginTop:2},right:{fontSize:10,fontWeight:'700',color:colors.primary,maxWidth:125,textAlign:'right'},grid:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},proof:{width:'48%',borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,overflow:'hidden',paddingBottom:6},image:{width:'100%',height:100,backgroundColor:colors.bg},proofType:{fontSize:10,fontWeight:'800',color:colors.text,textTransform:'capitalize',paddingHorizontal:6,marginTop:5},proofMeta:{fontSize:9,color:colors.textMuted,paddingHorizontal:6},expense:{flexDirection:'row',alignItems:'center',gap:spacing.sm,borderBottomWidth:1,borderBottomColor:colors.border,paddingVertical:9},expenseAmount:{fontSize:12,fontWeight:'800',color:colors.text},empty:{fontSize:12,color:colors.textMuted,textAlign:'center',padding:spacing.md}});
