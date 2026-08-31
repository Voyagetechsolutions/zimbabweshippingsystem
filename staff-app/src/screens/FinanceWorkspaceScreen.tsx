import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';

export type FinanceRegisterKey =
  | 'customer_accounts' | 'quotes' | 'statements' | 'credit_notes' | 'receivables'
  | 'suppliers' | 'supplier_bills' | 'payables' | 'banking' | 'reconciliation'
  | 'accounts' | 'journals' | 'ledger' | 'consignment_finance' | 'tax' | 'settings';

type RegisterConfig = {
  title: string; subtitle: string; table: string; icon: keyof typeof Ionicons.glyphMap;
  primary: string[]; secondary: string[]; amount?: string; currency?: string; status?: string;
};

export const FINANCE_REGISTERS: Record<FinanceRegisterKey, RegisterConfig> = {
  customer_accounts: { title: 'Customer accounts', subtitle: 'Balances are calculated from invoices, allocations and credits', table: 'customer_finance_accounts', icon: 'people-outline', primary: ['customer_name','name','customer_id'], secondary: ['preferred_currency_code','account_status'], status: 'account_status' },
  quotes: { title: 'Quotes', subtitle: 'Estimates and conversion audit trail', table: 'finance_quotes', icon: 'document-text-outline', primary: ['quote_number'], secondary: ['issue_date','expiry_date','currency_code'], amount: 'total', currency: 'currency_code', status: 'status' },
  statements: { title: 'Customer statements', subtitle: 'Select a customer account to generate its live statement', table: 'customer_finance_accounts', icon: 'reader-outline', primary: ['customer_name','customer_id'], secondary: ['preferred_currency_code','account_status'], status: 'account_status' },
  credit_notes: { title: 'Credit notes', subtitle: 'Issued credits, applications and refunds', table: 'finance_credit_notes', icon: 'return-down-back-outline', primary: ['credit_note_number'], secondary: ['reason','created_at'], amount: 'amount', currency: 'currency_code', status: 'status' },
  receivables: { title: 'Accounts receivable', subtitle: 'Open and overdue customer invoices', table: 'driver_invoices', icon: 'trending-up-outline', primary: ['invoice_number'], secondary: ['issue_date','due_date','customer_id'], amount: 'total', currency: 'currency', status: 'status' },
  suppliers: { title: 'Suppliers', subtitle: 'Approved vendors and payment terms', table: 'finance_suppliers', icon: 'storefront-outline', primary: ['name','supplier_code'], secondary: ['email','phone','currency_code'], status: 'status' },
  supplier_bills: { title: 'Supplier bills', subtitle: 'Bills, approvals and payment position', table: 'finance_supplier_bills', icon: 'document-attach-outline', primary: ['bill_number','supplier_reference'], secondary: ['bill_date','due_date'], amount: 'total', currency: 'currency_code', status: 'status' },
  payables: { title: 'Accounts payable', subtitle: 'Outstanding and overdue supplier bills', table: 'finance_supplier_bills', icon: 'trending-down-outline', primary: ['bill_number','supplier_reference'], secondary: ['due_date','supplier_id'], amount: 'total', currency: 'currency_code', status: 'status' },
  banking: { title: 'Bank and cash accounts', subtitle: 'Book balances remain separate by currency', table: 'finance_bank_accounts', icon: 'business-outline', primary: ['name'], secondary: ['account_type','currency_code'], amount: 'opening_balance', currency: 'currency_code' },
  reconciliation: { title: 'Bank reconciliation', subtitle: 'Imported transactions awaiting matching', table: 'finance_bank_transactions', icon: 'git-compare-outline', primary: ['reference','description'], secondary: ['transaction_date','bank_account_id'], amount: 'amount', currency: 'currency_code', status: 'reconciliation_status' },
  accounts: { title: 'Chart of accounts', subtitle: 'Configurable ledger structure', table: 'finance_accounts', icon: 'book-outline', primary: ['code','name'], secondary: ['account_type','currency_code'], status: 'active' },
  journals: { title: 'Journal entries', subtitle: 'Draft, approved, posted and reversed journals', table: 'finance_journals', icon: 'swap-horizontal-outline', primary: ['journal_number','description'], secondary: ['journal_date','reference'], status: 'status' },
  ledger: { title: 'General ledger', subtitle: 'Posted debit and credit lines', table: 'finance_journal_lines', icon: 'list-outline', primary: ['description','account_id'], secondary: ['currency_code','created_at'], amount: 'debit', currency: 'currency_code' },
  consignment_finance: { title: 'Consignment finance', subtitle: 'Real costs allocated to shipping operations', table: 'finance_cost_allocations', icon: 'boat-outline', primary: ['target_reference','target_type'], secondary: ['allocation_method','created_at'], amount: 'amount', currency: 'currency_code' },
  tax: { title: 'Tax', subtitle: 'Tax configuration remains accountant-controlled', table: 'finance_products', icon: 'calculator-outline', primary: ['tax_code','name'], secondary: ['currency_code','unit'], amount: 'default_unit_price', currency: 'currency_code', status: 'active' },
  settings: { title: 'Finance settings', subtitle: 'Company, numbering, periods, payment terms and base currency', table: 'finance_settings', icon: 'settings-outline', primary: ['base_currency_code'], secondary: ['default_payment_terms_days','fiscal_year_start_month'] },
};

const groups: Array<{ title: string; disabled?: boolean; note?: string; entries: Array<[string, string, keyof typeof Ionicons.glyphMap, FinanceRegisterKey | 'payments' | 'invoices' | 'expenses' | 'reports' | 'customers' | 'quote_requests']> }> = [
  { title: 'Sales & customers', entries: [
    ['Customers','Financial accounts and activity','people-outline','customers'], ['Quotes','Create, price and send estimates','document-text-outline','quote_requests'],
    ['Quote requests','Respond to customer requests','pricetag-outline','quote_requests'], ['Invoices','Billing and collection','receipt-outline','invoices'],
    ['Payments','Verification and allocation','card-outline','payments'], ['Accounts receivable','Aging and collection','trending-up-outline','receivables'],
  ] },
  { title: 'Purchases & cash', disabled: true, note: 'Reserved for a future phase. Supplier purchasing and cash-book entry are disabled until Zimbabwe Shipping enables this workflow.', entries: [
    ['Expenses','Receipts and approvals','wallet-outline','expenses'], ['Suppliers','Vendor records','storefront-outline','suppliers'],
    ['Supplier bills','Bills and approvals','document-attach-outline','supplier_bills'], ['Accounts payable','Supplier aging','trending-down-outline','payables'],
    ['Banking','Bank and cash accounts','business-outline','banking'], ['Reconciliation','Match imported transactions','git-compare-outline','reconciliation'],
  ] },
  { title: 'Accounting & control', entries: [
    ['Chart of accounts','Configurable ledger','book-outline','accounts'], ['Journal entries','Balanced accounting entries','swap-horizontal-outline','journals'],
    ['General ledger','Posted transaction detail','list-outline','ledger'], ['Consignment finance','Shipping cost allocation','boat-outline','consignment_finance'],
    ['Reports','Management and statutory views','bar-chart-outline','reports'],
  ] },
];

export function FinanceWorkspaceScreen() {
  const navigation = useNavigation<any>();
  const open = (target: string) => {
    if (target === 'payments') return navigation.navigate('Payments');
    if (target === 'invoices') return navigation.navigate('Invoices');
    if (target === 'expenses') return navigation.navigate('Expenses');
    if (target === 'reports') return navigation.navigate('Reports');
    if (target === 'customers') return navigation.navigate('Customers');
    if (target === 'quote_requests') return navigation.navigate('QuoteRequests');
    navigation.navigate('Register', { register: target });
  };
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><View><Text style={styles.kicker}>FINANCE ERP</Text><Text style={styles.title}>Finance workspace</Text><Text style={styles.subtitle}>Live operational and accounting records</Text></View><View style={styles.live}><View style={styles.liveDot}/><Text style={styles.liveText}>LIVE DATA</Text></View></View>
    {groups.map(group => <View key={group.title} style={styles.group}><View style={styles.groupHead}><Text style={styles.groupTitle}>{group.title.toUpperCase()}</Text>{group.disabled?<Text style={styles.comingSoon}>DISABLED · FUTURE USE</Text>:null}</View>{group.note?<View style={styles.futureNote}><Ionicons name="information-circle-outline" size={18} color={colors.amber}/><Text style={styles.futureText}>{group.note}</Text></View>:null}<View style={styles.grid}>{group.entries.map(([title,sub,icon,target]) => <Pressable accessibilityRole="button" accessibilityState={{disabled:group.disabled}} disabled={group.disabled} key={title} style={[styles.module,group.disabled&&styles.moduleDisabled]} onPress={()=>open(target)}>
      <View style={styles.moduleIcon}><Ionicons name={icon} size={20} color={colors.primaryDark}/></View><View style={styles.flex}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowSub}>{sub}</Text></View><Ionicons name="chevron-forward" size={17} color={colors.textFaint}/>
    </Pressable>)}</View></View>)}
  </ScrollView></SafeAreaView>;
}

export function FinanceRegisterScreen() {
  const route = useRoute<any>(); const navigation = useNavigation<any>();
  const key = route.params?.register as FinanceRegisterKey; const config = FINANCE_REGISTERS[key];
  const [rows,setRows]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [refreshing,setRefreshing]=useState(false); const [error,setError]=useState(''); const [search,setSearch]=useState(''); const [status,setStatus]=useState('all');
  const load=useCallback(async()=>{ if(!config)return; setError(''); const result=await supabase.from(config.table as any).select('*').limit(250); if(result.error){console.error(`Finance register ${config.table} failed`,result.error);setError('Finance data is unavailable. No changes were made. Check your access and try again.');} else setRows(result.data||[]); setLoading(false); setRefreshing(false); },[config]);
  useFocusEffect(useCallback(()=>{setLoading(true);void load();},[load]));
  const statuses=useMemo(()=>Array.from(new Set(rows.map(r=>String(r[config?.status||'status']??'')).filter(Boolean))),[rows,config]);
  const filtered=useMemo(()=>rows.filter(row=>{const text=JSON.stringify(row).toLowerCase(); const matchesSearch=!search.trim()||text.includes(search.trim().toLowerCase()); const raw=String(row[config?.status||'status']??''); return matchesSearch&&(status==='all'||raw===status);}),[rows,search,status,config]);
  if(!config)return <SafeAreaView style={styles.safe}><Text style={styles.errorText}>Unknown finance register.</Text></SafeAreaView>;
  return <SafeAreaView style={styles.safe} edges={['top']}><View style={styles.registerHeader}><Pressable style={styles.back} onPress={()=>navigation.goBack()}><Ionicons name="arrow-back" size={21} color={colors.text}/></Pressable><View style={styles.flex}><Text style={styles.registerTitle}>{config.title}</Text><Text style={styles.rowSub}>{config.subtitle}</Text></View></View>
    <View style={styles.search}><Ionicons name="search" size={18} color={colors.textMuted}/><TextInput value={search} onChangeText={setSearch} placeholder="Search records" placeholderTextColor={colors.textFaint} style={styles.searchInput}/></View>
    {statuses.length>1?<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{['all',...statuses].map(value=><Pressable key={value} style={[styles.chip,status===value&&styles.chipActive]} onPress={()=>setStatus(value)}><Text style={[styles.chipText,status===value&&styles.chipTextActive]}>{value.replace(/_/g,' ').toUpperCase()}</Text></Pressable>)}</ScrollView>:null}
    {loading?<ActivityIndicator style={styles.loader} color={colors.primary}/>:error?<View style={styles.state}><Ionicons name="cloud-offline-outline" size={32} color={colors.textFaint}/><Text style={styles.stateTitle}>Could not load this register</Text><Text style={styles.errorText}>{error}</Text><Pressable style={styles.retry} onPress={load}><Text style={styles.retryText}>Try again</Text></Pressable></View>:
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);void load();}}/>} contentContainerStyle={styles.rows}>{filtered.length===0?<View style={styles.state}><Ionicons name={config.icon} size={34} color={colors.textFaint}/><Text style={styles.stateTitle}>No records found</Text><Text style={styles.rowSub}>This register will populate from confirmed finance transactions.</Text></View>:filtered.map(row=><FinanceRow key={String(row.id)} row={row} config={config}/>)}</ScrollView>}
  </SafeAreaView>;
}

function FinanceRow({row,config}:{row:any;config:RegisterConfig}) {
  const primary=config.primary.map(k=>row[k]).filter(v=>v!==null&&v!==undefined&&String(v).trim()).join(' · ')||'Finance record';
  const secondary=config.secondary.map(k=>row[k]).filter(v=>v!==null&&v!==undefined&&String(v).trim()).join(' · ');
  const amount=config.amount&&row[config.amount]!==null&&row[config.amount]!==undefined?new Intl.NumberFormat('en-GB',{style:'currency',currency:String(row[config.currency||'currency']||'GBP')}).format(Number(row[config.amount])||0):null;
  const badge=config.status?String(row[config.status]??''):'';
  return <View style={styles.record}><View style={styles.recordIcon}><Ionicons name={config.icon} size={18} color={colors.primaryDark}/></View><View style={styles.flex}><Text style={styles.rowTitle}>{primary}</Text>{secondary?<Text style={styles.rowSub}>{secondary}</Text>:null}{badge?<Text style={styles.badge}>{badge.replace(/_/g,' ').toUpperCase()}</Text>:null}</View>{amount?<Text style={styles.amount}>{amount}</Text>:null}</View>;
}

const styles=StyleSheet.create({safe:{flex:1,backgroundColor:colors.bg},content:{padding:spacing.lg,paddingBottom:50,gap:20},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},kicker:{fontSize:10,fontWeight:'900',letterSpacing:1,color:colors.primary},title:{fontSize:27,fontWeight:'900',color:colors.text},subtitle:{fontSize:13,color:colors.textMuted,marginTop:2},live:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:7,borderRadius:20,backgroundColor:colors.primarySoft},liveDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.primary},liveText:{fontSize:9,fontWeight:'900',color:colors.primaryDark},group:{gap:9},groupHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},groupTitle:{fontSize:10,fontWeight:'900',letterSpacing:.8,color:colors.textMuted},comingSoon:{fontSize:9,fontWeight:'900',color:colors.amber},futureNote:{flexDirection:'row',gap:8,padding:11,borderRadius:10,backgroundColor:colors.amberSoft,borderWidth:1,borderColor:colors.amberBorder},futureText:{flex:1,fontSize:11.5,lineHeight:17,color:colors.amber},grid:{gap:8},module:{flexDirection:'row',alignItems:'center',gap:11,minHeight:68,padding:13,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md},moduleDisabled:{opacity:.5},moduleIcon:{width:38,height:38,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft},flex:{flex:1},rowTitle:{fontSize:14,fontWeight:'800',color:colors.text},rowSub:{fontSize:12,color:colors.textMuted,marginTop:2,lineHeight:17},registerHeader:{flexDirection:'row',gap:11,alignItems:'center',padding:spacing.lg},back:{width:40,height:40,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},registerTitle:{fontSize:20,fontWeight:'900',color:colors.text},search:{marginHorizontal:spacing.lg,flexDirection:'row',alignItems:'center',gap:8,height:44,paddingHorizontal:12,borderRadius:10,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},searchInput:{flex:1,fontSize:14,color:colors.text,outlineStyle:'none'} as any,filters:{paddingHorizontal:spacing.lg,paddingVertical:10,gap:7},chip:{paddingHorizontal:11,paddingVertical:7,borderRadius:20,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border},chipActive:{backgroundColor:colors.primaryDark,borderColor:colors.primaryDark},chipText:{fontSize:9,fontWeight:'900',color:colors.textMuted},chipTextActive:{color:colors.white},loader:{marginTop:80},rows:{padding:spacing.lg,paddingTop:12,gap:8},record:{flexDirection:'row',alignItems:'center',gap:11,padding:14,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:radius.md},recordIcon:{width:36,height:36,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft},badge:{alignSelf:'flex-start',fontSize:9,fontWeight:'900',color:colors.primaryDark,backgroundColor:colors.primarySoft,paddingHorizontal:7,paddingVertical:3,borderRadius:10,marginTop:6},amount:{fontSize:14,fontWeight:'900',color:colors.text},state:{margin:spacing.xl,padding:spacing.xl,alignItems:'center',gap:8,backgroundColor:colors.surface,borderRadius:radius.lg,borderWidth:1,borderColor:colors.border},stateTitle:{fontSize:16,fontWeight:'800',color:colors.text},errorText:{fontSize:12,color:colors.textMuted,textAlign:'center'},retry:{marginTop:5,paddingHorizontal:18,paddingVertical:9,borderRadius:8,backgroundColor:colors.primaryDark},retryText:{color:colors.white,fontWeight:'800'},});
