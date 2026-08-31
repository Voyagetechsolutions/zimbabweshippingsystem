import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FinanceRegisterScreen, FinanceWorkspaceScreen } from '../screens/FinanceWorkspaceScreen';
import FinanceBooksScreen from '../screens/FinanceBooksScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import CustomersScreen from '../screens/admin/CustomersScreen';
import CustomerDetailScreen from '../screens/admin/CustomerDetailScreen';
import CustomQuotesScreen from '../screens/admin/CustomQuotesScreen';
import { ExpenseDetailsScreen } from '../screens/FinanceExperienceScreens';
import { ZimmyFinanceScreen } from '../screens/FinanceInsightsScreens';
import PaymentsScreen from '../screens/admin/PaymentsScreen';
import InvoicesScreen from '../screens/admin/InvoicesScreen';
import { PaymentDetailsScreen, ReconciliationScreen } from '../screens/FinanceExperienceScreens';

const Stack=createNativeStackNavigator();
export default function FinanceWorkspaceStack(){return <Stack.Navigator screenOptions={{headerShown:false}}>
  <Stack.Screen name="Workspace" component={FinanceWorkspaceScreen}/>
  <Stack.Screen name="Register" component={FinanceRegisterScreen}/>
  <Stack.Screen name="Expenses" component={FinanceBooksScreen}/>
  <Stack.Screen name="ExpenseDetails" component={ExpenseDetailsScreen}/>
  <Stack.Screen name="Zimmy" component={ZimmyFinanceScreen}/>
  <Stack.Screen name="Reports" component={ReportsScreen as any}/>
  <Stack.Screen name="Customers" component={CustomersScreen as any}/>
  <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen as any}/>
  <Stack.Screen name="QuoteRequests" component={CustomQuotesScreen as any}/>
  <Stack.Screen name="Payments" component={PaymentsScreen}/>
  <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen}/>
  <Stack.Screen name="Reconciliation" component={ReconciliationScreen}/>
  <Stack.Screen name="Invoices" component={InvoicesScreen}/>
</Stack.Navigator>}
