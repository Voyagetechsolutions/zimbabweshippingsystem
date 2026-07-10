import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MenuScreen from '../screens/admin/MenuScreen';
import ManualBookingScreen from '../screens/admin/ManualBookingScreen';
import CustomersScreen from '../screens/admin/CustomersScreen';
import CustomQuotesScreen from '../screens/admin/CustomQuotesScreen';
import ScheduleScreen from '../screens/admin/ScheduleScreen';
import PaymentsScreen from '../screens/admin/PaymentsScreen';
import FeedbackScreen from '../screens/admin/FeedbackScreen';
import PlaceholderScreen from '../screens/admin/PlaceholderScreen';
import FinanceDashboardScreen from '../screens/FinanceDashboardScreen';
import type { MenuStackParams } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<MenuStackParams>();

export default function MenuStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="Menu" component={MenuScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ManualBooking" component={ManualBookingScreen} options={{ title: 'Manual Booking' }} />
      <Stack.Screen name="Customers" component={CustomersScreen} options={{ title: 'Customers' }} />
      <Stack.Screen name="CustomQuotes" component={CustomQuotesScreen} options={{ title: 'Custom Quotes' }} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Collection Schedule' }} />
      <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Payments' }} />
      <Stack.Screen name="Reports" component={FinanceDashboardScreen} options={{ title: 'Reports' }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ title: 'Feedback' }} />
      <Stack.Screen name="Placeholder" component={PlaceholderScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
