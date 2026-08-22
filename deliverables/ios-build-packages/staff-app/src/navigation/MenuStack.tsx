import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MenuScreen from '../screens/admin/MenuScreen';
import ManualBookingScreen from '../screens/admin/ManualBookingScreen';
import CustomersScreen from '../screens/admin/CustomersScreen';
import CustomerDetailScreen from '../screens/admin/CustomerDetailScreen';
import CustomQuotesScreen from '../screens/admin/CustomQuotesScreen';
import ScheduleScreen from '../screens/admin/ScheduleScreen';
import DeliveryScreen from '../screens/admin/DeliveryScreen';
import DeliveryNotesScreen from '../screens/admin/DeliveryNotesScreen';
import DeliveryNoteDetailScreen from '../screens/admin/DeliveryNoteDetailScreen';
import PickupZonesScreen from '../screens/admin/PickupZonesScreen';
import PaymentsScreen from '../screens/admin/PaymentsScreen';
import InvoicesScreen from '../screens/admin/InvoicesScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import FinanceOverviewScreen from '../screens/FinanceOverviewScreen';
import FeedbackScreen from '../screens/admin/FeedbackScreen';
import PlaceholderScreen from '../screens/admin/PlaceholderScreen';
import StaffRecordsScreen from '../screens/admin/StaffRecordsScreen';
import VehiclesScreen from '../screens/admin/VehiclesScreen';
import AccountScreen from '../screens/AccountScreen';
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
      <Stack.Screen name="MenuHome" component={MenuScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ManualBooking" component={ManualBookingScreen} options={{ title: 'Manual Booking' }} />
      <Stack.Screen name="Customers" component={CustomersScreen} options={{ title: '' , headerShadowVisible: false }} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer' }} />
      <Stack.Screen name="CustomQuotes" component={CustomQuotesScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} options={{ title: 'Collection Schedule' }} />
      <Stack.Screen name="Delivery" component={DeliveryScreen} options={{ title: 'Delivery' }} />
      <Stack.Screen name="DeliveryNotes" component={DeliveryNotesScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="DeliveryNoteDetail" component={DeliveryNoteDetailScreen} options={{ title: 'Delivery Note' }} />
      <Stack.Screen name="PickupZones" component={PickupZonesScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Payments' }} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="FinanceOverview" component={FinanceOverviewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ title: 'Feedback' }} />
      <Stack.Screen name="StaffRecords" component={StaffRecordsScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="Vehicles" component={VehiclesScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
      <Stack.Screen name="Placeholder" component={PlaceholderScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
