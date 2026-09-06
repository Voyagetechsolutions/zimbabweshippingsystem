import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DeliveryDashboardScreen from '../screens/DeliveryDashboardScreen';
import DeliveryLoadScreen from '../screens/DeliveryLoadScreen';
import DeliveryNotesDriverScreen from '../screens/DeliveryNotesDriverScreen';
import CollectionScannerScreen from '../screens/CollectionScannerScreen';
import { DriverReportIssueScreen, DriverStopDetailsScreen } from '../screens/DriverExperienceScreens';
import CollectionsAheadScreen from '../screens/CollectionsAheadScreen';
import type { DeliveryStackParams } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<DeliveryStackParams>();

// The delivery driver's stack. The handover screen is the same one collections
// use — it already knows how to run a delivery (depot photo, drop photo,
// customer QR, six-digit delivery code) from the stop kind.
export default function DeliveryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="DeliveryHome" component={DeliveryDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DeliveryLoad" component={DeliveryLoadScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DeliveryNotes" component={DeliveryNotesDriverScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StopDetails" component={DriverStopDetailsScreen as any} options={{ headerShown: false }} />
      <Stack.Screen name="CollectionsAhead" component={CollectionsAheadScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ReportIssue" component={DriverReportIssueScreen as any} options={{ headerShown: false }} />
      <Stack.Screen name="StopWorkflow" component={CollectionScannerScreen as any} options={{ title: 'Proof of Delivery' }} />
    </Stack.Navigator>
  );
}
