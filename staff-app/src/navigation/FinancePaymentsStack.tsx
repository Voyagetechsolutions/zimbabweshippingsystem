import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PaymentsScreen from '../screens/admin/PaymentsScreen';
import { PaymentDetailsScreen, ReconciliationScreen } from '../screens/FinanceExperienceScreens';
const Stack = createNativeStackNavigator();
export default function FinancePaymentsStack(){return <Stack.Navigator><Stack.Screen name="PaymentList" component={PaymentsScreen} options={{headerShown:false}}/><Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} options={{headerShown:false}}/><Stack.Screen name="Reconciliation" component={ReconciliationScreen} options={{headerShown:false}}/></Stack.Navigator>}
