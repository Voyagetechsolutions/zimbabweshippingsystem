import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FinanceOverviewScreen from '../screens/FinanceOverviewScreen';
import FinanceDashboardScreen from '../screens/FinanceDashboardScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import { FinanceCashFlowScreen, ZimmyFinanceScreen } from '../screens/FinanceInsightsScreens';
import { colors } from '../theme';
const Stack = createNativeStackNavigator();
export default function FinanceOverviewStack(){return <Stack.Navigator screenOptions={{headerStyle:{backgroundColor:colors.surface},headerTintColor:colors.text,headerTitleStyle:{fontWeight:'700'}}}><Stack.Screen name="Overview" component={FinanceOverviewScreen} options={{headerShown:false}}/><Stack.Screen name="Dashboard" component={FinanceDashboardScreen} options={{headerShown:false}}/><Stack.Screen name="Reports" component={ReportsScreen as any} options={{title:'',headerShadowVisible:false}}/><Stack.Screen name="Analytics" component={AnalyticsScreen} options={{title:'',headerShadowVisible:false}}/><Stack.Screen name="CashFlow" component={FinanceCashFlowScreen} options={{headerShown:false}}/><Stack.Screen name="Zimmy" component={ZimmyFinanceScreen} options={{headerShown:false}}/></Stack.Navigator>}
