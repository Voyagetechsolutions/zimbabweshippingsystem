import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CollectionScannerScreen from '../screens/CollectionScannerScreen';
import { DriverReportIssueScreen, DriverRouteMapScreen, DriverRunOverviewScreen, DriverRunSummaryScreen, DriverStopDetailsScreen } from '../screens/DriverExperienceScreens';
import type { DriverRunStackParams } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<DriverRunStackParams>();

export default function DriverRunStack() {
  return <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '700' } }}>
    <Stack.Screen name="MyRun" component={DriverRunOverviewScreen} options={{ headerShown: false }} />
    <Stack.Screen name="RouteMap" component={DriverRouteMapScreen} options={{ headerShown: false }} />
    <Stack.Screen name="RunSummary" component={DriverRunSummaryScreen} options={{ headerShown: false }} />
    <Stack.Screen name="StopDetails" component={DriverStopDetailsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ReportIssue" component={DriverReportIssueScreen} options={{ headerShown: false }} />
    <Stack.Screen name="StopWorkflow" component={CollectionScannerScreen as any} options={{ title: 'Proof of Collection' }} />
  </Stack.Navigator>;
}
