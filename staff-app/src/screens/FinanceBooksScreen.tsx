import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import { money, shortDate } from '../lib/format';

interface Payment { id:string; amount:number; currency:string; payment_status:string; created_at:string; }
interface Expense { id:string; amount:number; currency:string; category:string; description:string; expense_date:string; status:string; }
interface Note { id:string; note_number:string; delivered_at:string|null; delivery_address:string|null; status:string; shipment_id:string; }
interface Anomaly { id:string; severity:string; title:string; description:string; status:string; amount:number|null; detected_at:string; }

const paid = new Set(['completed','paid','success','succeeded']);
const monthKey = (date:string) => date.slice(0,7);

export default function FinanceBooksScreen() {
  const navigation = useNavigation<any>();
  const [payments,setPayments]=useState<Payment[]>([]); const [expenses,setExpenses]=useState<Expense[]>([]); const [notes,setNotes]=useState<Note[]>([]); const [anomalies,setAnomalies]=useState<Anomaly[]>([]);
  const [loading,setLoading]=useState(true); const [refreshing,setRefreshing]=useState(false); const [busy,setBusy]=useState(false);
  const [category,setCategory]=useState('Fuel'); const [description,setDescription]=useState(''); const [amount,setAmount]=useState(''); const [supplier,setSupplier]=useState('');

  const load=useCallback(async()=>{
    await supabase.rpc('refresh_finance_anomalies');
    const [p,e,n,a]=await Promise.all([
      supabase.from('payments').select('id,amount,currency,payment_status,created_at').order('created_at',{ascending:false}),
      supabase.from('finance_expenses').select('id,amount,currency,category,description,expense_date,status').order('expense_date',{ascending:false}),
      supabase.from('delivery_notes').select('id,note_number,delivered_at,delivery_address,status,shipment_id').order('created_at',{ascending:false}).limit(30),
      supabase.from('finance_anomalies').select('id,severity,title,description,status,amount,detected_at').in('status',['open','reviewing']).order('detected_at',{ascending:false}),
    ]);
    const error=p.error||e.error||n.error||a.error; if(error) throw error;
    setPayments((p.data as Payment[])||[]); setExpenses((e.data as Expense[])||[]); setNotes((n.data as Note[])||[]); setAnomalies((a.data as Anomaly[])||[]);
  },[]);
  useEffect(()=>{(async()=>{try{await load();}catch(e:any){Alert.alert('Finance data unavailable',e?.message);}finally{setLoading(false);}})();},[load]);
  const refresh=async()=>{setRefreshing(true);try{await load();}finally{setRefreshing(false);}};

  const months=useMemo(()=>{
    const map:Record<string,{income:number;expenses:number}>={};
    payments.filter(p=>paid.has((p.payment_status||'').toLowerCase())).forEach(p=>{const k=monthKey(p.created_at);map[k]||={income:0,expenses:0};map[k].income+=Number(p.amount)||0;});
    expenses.filter(e=>e.status!=='rejected').forEach(e=>{const k=monthKey(e.expense_date);map[k]||={income:0,expenses:0};map[k].expenses+=Number(e.amount)||0;});
    return Object.entries(map).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,12);
  },[payments,expenses]);

  const addExpense=async()=>{
    const value=Number(amount); if(!description.trim()||!Number.isFinite(value)||value<=0){Alert.alert('Expense details required','Enter a description and amount.');return;}
    setBusy(true);try{const {error}=await supabase.from('finance_expenses').insert({category:category.trim()||'Other',description:description.trim(),amount:value,currency:'GBP',supplier:supplier.trim()||null,status:'recorded'});if(error)throw error;setDescription('');setAmount('');setSupplier('');await load();}
    catch(e:any){Alert.alert('Expense not saved',e?.message||'Try again.');}finally{setBusy(false);}
  };
  const resolve=async(id:string)=>{const {error}=await supabase.from('finance_anomalies').update({status:'resolved',resolved_at:new Date().toISOString()}).eq('id',id);if(error)Alert.alert('Could not resolve',error.message);else await load();};
  const current=months[0]?.[1]||{income:0,expenses:0}; const chartRows=[...months].reverse().slice(-7); const chartMax=Math.max(1,...chartRows.flatMap(([,row])=>[row.income,row.expenses]));

  if(loading)return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator size="large" color={colors.primary}/></View></SafeAreaView>;
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh}/>}>
    <View><Text style={styles.title}>Books</Text><Text style={styles.subtitle}>Monthly performance and expense tracking</Text></View>

    <View style={styles.kpiRow}><View style={[styles.kpi,{backgroundColor:colors.primarySoft}]}><Text style={[styles.kpiLabel,{color:colors.primaryDark}]}>Income</Text><Text style={styles.kpiValue}>{money(current.income)}</Text></View><View style={[styles.kpi,{backgroundColor:colors.redSoft}]}><Text style={[styles.kpiLabel,{color:colors.danger}]}>Expenses</Text><Text style={styles.kpiValue}>{money(current.expenses)}</Text></View><View style={[styles.kpi,{backgroundColor:colors.blueSoft}]}><Text style={[styles.kpiLabel,{color:colors.blue}]}>Profit</Text><Text style={styles.kpiValue}>{money(current.income-current.expenses)}</Text></View></View>

    <Section title="Monthly performance" icon="bar-chart-outline">
      {chartRows.length===0?<Empty text="No financial activity yet."/>:<View style={styles.chart}>{chartRows.map(([month,row])=><View key={month} style={styles.chartCol}><View style={styles.barArea}><View style={[styles.incomeBar,{height:`${Math.max(5,row.income/chartMax*100)}%`}]}/><View style={[styles.expenseBar,{height:`${Math.max(5,row.expenses/chartMax*100)}%`}]}/></View><Text style={styles.chartLabel}>{new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined,{month:'narrow'})}</Text></View>)}</View>}
    </Section>

    <Section title="Record expense" icon="wallet-outline">
      <View style={styles.row}><TextInput style={[styles.input,styles.flex]} value={category} onChangeText={setCategory} placeholder="Category"/><TextInput style={[styles.input,styles.flex]} value={amount} onChangeText={setAmount} placeholder="Amount" keyboardType="decimal-pad"/></View>
      <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="What was purchased?"/><TextInput style={styles.input} value={supplier} onChangeText={setSupplier} placeholder="Supplier (optional)"/>
      <Pressable style={styles.primary} onPress={addExpense} disabled={busy}>{busy?<ActivityIndicator color={colors.white}/>:<Text style={styles.primaryText}>Add expense</Text>}</Pressable>
    </Section>

    <Section title={`Recent expenses · ${expenses.length}`} icon="receipt-outline">
      {expenses.length===0?<Empty text="No expenses recorded."/>:expenses.slice(0,10).map(e=><Pressable key={e.id} style={styles.note} onPress={()=>navigation.navigate('ExpenseDetails',{expenseId:e.id})}><View><Text style={styles.noteNo}>{e.category}</Text><Text style={styles.noteAddress} numberOfLines={1}>{e.description}</Text></View><View style={{alignItems:'flex-end'}}><Text style={styles.expense}>{money(e.amount,e.currency==='EUR'?'€':'£')}</Text><Text style={styles.noteDate}>{shortDate(e.expense_date)}</Text></View></Pressable>)}
    </Section>

    <Pressable style={styles.zimmyButton} onPress={()=>navigation.navigate('Zimmy')}><Ionicons name="sparkles" size={18} color={colors.white}/><Text style={styles.primaryText}>Open Zimmy AI</Text></Pressable>

    <Section title={`Zimmy monitor · ${anomalies.length} open`} icon="sparkles-outline">
      {anomalies.length===0?<View style={styles.ok}><Ionicons name="shield-checkmark" size={24} color={colors.primary}/><Text style={styles.okText}>No finance abnormalities detected.</Text></View>:anomalies.map(a=><View key={a.id} style={styles.anomaly}><View style={[styles.severity,{backgroundColor:a.severity==='high'||a.severity==='critical'?'#fee2e2':'#fef3c7'}]}><Text style={styles.severityText}>{a.severity}</Text></View><View style={styles.flex}><Text style={styles.anomalyTitle}>{a.title}</Text><Text style={styles.anomalyBody}>{a.description}</Text>{a.amount?<Text style={styles.anomalyAmount}>{money(a.amount)}</Text>:null}</View><Pressable onPress={()=>resolve(a.id)}><Ionicons name="checkmark-circle-outline" size={24} color={colors.primary}/></Pressable></View>)}
    </Section>

    <Section title={`Delivery notes · ${notes.length}`} icon="document-text-outline">
      {notes.length===0?<Empty text="Completed deliveries will generate notes automatically."/>:notes.slice(0,10).map(n=><View key={n.id} style={styles.note}><View><Text style={styles.noteNo}>{n.note_number}</Text><Text style={styles.noteAddress} numberOfLines={1}>{n.delivery_address||'Address unavailable'}</Text></View><View style={{alignItems:'flex-end'}}><Text style={styles.noteStatus}>{n.status}</Text><Text style={styles.noteDate}>{n.delivered_at?shortDate(n.delivered_at):'Draft'}</Text></View></View>)}
    </Section>
  </ScrollView></SafeAreaView>;
}

function Section({title,icon,children}:{title:string;icon:keyof typeof Ionicons.glyphMap;children:React.ReactNode}){return <View style={styles.card}><View style={styles.sectionHead}><Ionicons name={icon} size={20} color={colors.primary}/><Text style={styles.sectionTitle}>{title}</Text></View>{children}</View>}
function Empty({text}:{text:string}){return <Text style={styles.empty}>{text}</Text>}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},center:{flex:1,alignItems:'center',justifyContent:'center'},content:{padding:spacing.lg,gap:spacing.md,paddingBottom:100},title:{fontSize:25,fontWeight:'800',color:colors.text},subtitle:{fontSize:12,color:colors.textMuted,marginTop:2},kpiRow:{flexDirection:'row',gap:8},kpi:{flex:1,minWidth:0,borderRadius:radius.md,padding:spacing.md},kpiLabel:{fontSize:9.5,fontWeight:'800'},kpiValue:{fontSize:15,fontWeight:'800',color:colors.text,marginTop:5},card:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.lg,padding:spacing.lg,gap:spacing.sm},sectionHead:{flexDirection:'row',alignItems:'center',gap:spacing.sm,marginBottom:4},sectionTitle:{fontSize:15,fontWeight:'800',color:colors.text},chart:{height:150,flexDirection:'row',gap:8,alignItems:'flex-end'},chartCol:{flex:1,height:'100%',alignItems:'center',gap:5},barArea:{flex:1,width:'100%',flexDirection:'row',alignItems:'flex-end',gap:3},incomeBar:{flex:1,backgroundColor:colors.primary,borderRadius:4},expenseBar:{flex:1,backgroundColor:'#F97066',borderRadius:4},chartLabel:{fontSize:10,color:colors.textMuted},monthRow:{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:colors.border,paddingVertical:9},month:{fontSize:13,fontWeight:'800',color:colors.text},income:{fontSize:11,color:colors.primary,marginTop:2},expense:{fontSize:11,color:colors.danger},profit:{fontSize:13,fontWeight:'800',marginTop:2},row:{flexDirection:'row',gap:spacing.sm},flex:{flex:1},input:{borderWidth:1,borderColor:colors.border,borderRadius:radius.sm,backgroundColor:colors.bg,paddingHorizontal:12,paddingVertical:10,color:colors.text},primary:{backgroundColor:colors.primary,borderRadius:radius.sm,paddingVertical:12,alignItems:'center'},primaryText:{color:colors.white,fontWeight:'800'},zimmyButton:{backgroundColor:colors.purple,borderRadius:radius.sm,minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:spacing.sm},ok:{alignItems:'center',padding:spacing.md,gap:spacing.sm},okText:{fontSize:12,color:colors.textMuted},anomaly:{flexDirection:'row',gap:spacing.sm,alignItems:'flex-start',borderBottomWidth:1,borderBottomColor:colors.border,paddingVertical:9},severity:{borderRadius:radius.pill,paddingHorizontal:7,paddingVertical:3},severityText:{fontSize:9,fontWeight:'800',textTransform:'uppercase',color:colors.text},anomalyTitle:{fontSize:12,fontWeight:'800',color:colors.text},anomalyBody:{fontSize:11,lineHeight:15,color:colors.textMuted,marginTop:2},anomalyAmount:{fontSize:11,fontWeight:'800',color:colors.danger,marginTop:2},note:{flexDirection:'row',justifyContent:'space-between',gap:spacing.sm,borderBottomWidth:1,borderBottomColor:colors.border,paddingVertical:9},noteNo:{fontSize:12,fontWeight:'800',color:colors.primary},noteAddress:{fontSize:10,color:colors.textMuted,maxWidth:210,marginTop:2},noteStatus:{fontSize:10,fontWeight:'800',color:colors.primary,textTransform:'capitalize'},noteDate:{fontSize:10,color:colors.textFaint,marginTop:2},empty:{fontSize:12,color:colors.textMuted,textAlign:'center',padding:spacing.md}});
