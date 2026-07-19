import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FinanceDashboardScreen from '../screens/FinanceDashboardScreen';
import { FinanceCashFlowScreen, FinanceReportsScreen, ZimmyFinanceScreen } from '../screens/FinanceInsightsScreens';
const Stack = createNativeStackNavigator();
export default function FinanceOverviewStack(){return <Stack.Navigator><Stack.Screen name="Overview" component={FinanceDashboardScreen} options={{headerShown:false}}/><Stack.Screen name="Reports" component={FinanceReportsScreen} options={{headerShown:false}}/><Stack.Screen name="CashFlow" component={FinanceCashFlowScreen} options={{headerShown:false}}/><Stack.Screen name="Zimmy" component={ZimmyFinanceScreen} options={{headerShown:false}}/></Stack.Navigator>}
