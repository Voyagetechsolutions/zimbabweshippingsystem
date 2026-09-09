import PaymentProofsScreen from '../screens/admin/PaymentProofsScreen';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MenuScreen from '../screens/admin/MenuScreen';
import ManualBookingScreen from '../screens/admin/ManualBookingScreen';
import CustomersScreen from '../screens/admin/CustomersScreen';
import CustomerDetailScreen from '../screens/admin/CustomerDetailScreen';
import ShipmentsListScreen from '../screens/ShipmentsListScreen';
import ShipmentPeriodsScreen from '../screens/admin/ShipmentPeriodsScreen';
import PeriodShipmentsScreen from '../screens/admin/PeriodShipmentsScreen';
import PeriodInvoicesScreen from '../screens/admin/PeriodInvoicesScreen';
import PeriodPaymentsScreen from '../screens/admin/PeriodPaymentsScreen';
import PeriodDeliveryNotesScreen from '../screens/admin/PeriodDeliveryNotesScreen';
import ShipmentDetailScreen from '../screens/ShipmentDetailScreen';
import CustomQuotesScreen from '../screens/admin/CustomQuotesScreen';
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
import MapLocationsScreen from '../screens/admin/MapLocationsScreen';
import AccountScreen from '../screens/AccountScreen';
import { PaymentDetailsScreen, ReconciliationScreen } from '../screens/FinanceExperienceScreens';
import DocumentScreen from '../screens/admin/DocumentScreen';
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
      {/* Typed against ShipmentsStackParams, and identical in either stack. */}
      <Stack.Screen name="AllShipments" component={ShipmentsListScreen as any} options={{ headerShown: false }} />
      <Stack.Screen name="Periods" component={ShipmentPeriodsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PeriodShipments" component={PeriodShipmentsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PeriodInvoices" component={PeriodInvoicesScreen} options={{ headerShown: false }} /><Stack.Screen name="PeriodPayments" component={PeriodPaymentsScreen} options={{headerShown:false}}/>
      <Stack.Screen name="PeriodDeliveryNotes" component={PeriodDeliveryNotesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} options={{ title: 'Shipment Details' }} />
      <Stack.Screen name="CustomQuotes" component={CustomQuotesScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="Delivery" component={DeliveryScreen} options={{ title: 'Delivery' }} />
      <Stack.Screen name="DeliveryNotes" component={DeliveryNotesScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="DeliveryNoteDetail" component={DeliveryNoteDetailScreen} options={{ title: 'Delivery Note' }} />
      <Stack.Screen name="PickupZones" component={PickupZonesScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Payments' }} />
      <Stack.Screen name="PaymentDetails" component={PaymentDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Reconciliation" component={ReconciliationScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="FinanceOverview" component={FinanceOverviewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ title: 'Feedback' }} />
      <Stack.Screen name="StaffRecords" component={StaffRecordsScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="MapLocations" component={MapLocationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Vehicles" component={VehiclesScreen} options={{ title: '', headerShadowVisible: false }} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Account' }} />
      <Stack.Screen name="Placeholder" component={PlaceholderScreen} options={{ title: '' }} />
          <Stack.Screen name="Document" component={DocumentScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PaymentProofs" component={PaymentProofsScreen} options={{ headerShown: false }} />
</Stack.Navigator>
  );
}
