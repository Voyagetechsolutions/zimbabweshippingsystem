import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ShipmentsListScreen from '../screens/ShipmentsListScreen';
import ShipmentPeriodsScreen from '../screens/admin/ShipmentPeriodsScreen';
import PeriodShipmentsScreen from '../screens/admin/PeriodShipmentsScreen';
import PeriodInvoicesScreen from '../screens/admin/PeriodInvoicesScreen';
import PeriodPaymentsScreen from '../screens/admin/PeriodPaymentsScreen';
import PeriodDeliveryNotesScreen from '../screens/admin/PeriodDeliveryNotesScreen';
import ShipmentDetailScreen from '../screens/ShipmentDetailScreen';
import DocumentScreen from '../screens/admin/DocumentScreen';
import type { ShipmentsStackParams } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<ShipmentsStackParams>();

export default function ShipmentsStack() {
  return (
    <Stack.Navigator
      initialRouteName="Periods"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      {/* The period view is the way in; the flat list stays registered because
          search and the driver's screens still push to it. */}
      <Stack.Screen name="Periods" component={ShipmentPeriodsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PeriodShipments" component={PeriodShipmentsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PeriodInvoices" component={PeriodInvoicesScreen} options={{ headerShown: false }} /><Stack.Screen name="PeriodPayments" component={PeriodPaymentsScreen} options={{headerShown:false}}/>
      <Stack.Screen name="PeriodDeliveryNotes" component={PeriodDeliveryNotesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ShipmentsList" component={ShipmentsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} options={{ title: 'Shipment Details' }} />
          <Stack.Screen name="Document" component={DocumentScreen} options={{ headerShown: false }} />
</Stack.Navigator>
  );
}
