import PaymentProofsScreen from '../screens/admin/PaymentProofsScreen';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FinanceOverviewScreen from '../screens/FinanceOverviewScreen';
import FinanceDashboardScreen from '../screens/FinanceDashboardScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import { FinanceCashFlowScreen, ZimmyFinanceScreen } from '../screens/FinanceInsightsScreens';
import PaymentsScreen from '../screens/admin/PaymentsScreen';
import InvoicesScreen from '../screens/admin/InvoicesScreen';
import { PaymentDetailsScreen, ReconciliationScreen } from '../screens/FinanceExperienceScreens';
import DocumentScreen from '../screens/admin/DocumentScreen';
import CustomerDetailScreen from '../screens/admin/CustomerDetailScreen';
import ManualBookingScreen from '../screens/admin/ManualBookingScreen';
import CustomQuotesScreen from '../screens/admin/CustomQuotesScreen';
import ShipmentDetailScreen from '../screens/ShipmentDetailScreen';
import { colors } from '../theme';
const Stack = createNativeStackNavigator();
export default function FinanceOverviewStack(){return <Stack.Navigator screenOptions={{headerStyle:{backgroundColor:colors.surface},headerTintColor:colors.text,headerTitleStyle:{fontWeight:'700'}}}><Stack.Screen name="Overview" component={FinanceOverviewScreen} options={{headerShown:false}}/><Stack.Screen name="Dashboard" component={FinanceDashboardScreen} options={{headerShown:false}}/><Stack.Screen name="Payments" component={PaymentsScreen} options={{headerShown:false}}/><Stack.Screen name="CustomerDetail" component={CustomerDetailScreen as any} options={{title:'Customer'}}/><Stack.Screen name="ManualBooking" component={ManualBookingScreen as any} options={{title:'Manual booking'}}/><Stack.Screen name="CustomQuotes" component={CustomQuotesScreen as any} options={{title:'Quote request'}}/><Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen as any} options={{title:'Shipment'}}/><Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} options={{headerShown:false}}/><Stack.Screen name="Reconciliation" component={ReconciliationScreen} options={{headerShown:false}}/><Stack.Screen name="Invoices" component={InvoicesScreen} options={{headerShown:false}}/><Stack.Screen name="Reports" component={ReportsScreen as any} options={{title:'',headerShadowVisible:false}}/><Stack.Screen name="Analytics" component={AnalyticsScreen} options={{title:'',headerShadowVisible:false}}/><Stack.Screen name="CashFlow" component={FinanceCashFlowScreen} options={{headerShown:false}}/><Stack.Screen name="Zimmy" component={ZimmyFinanceScreen} options={{headerShown:false}}/><Stack.Screen name="Document" component={DocumentScreen} options={{headerShown:false}}/><Stack.Screen name="PaymentProofs" component={PaymentProofsScreen} options={{headerShown:false}}/></Stack.Navigator>}
