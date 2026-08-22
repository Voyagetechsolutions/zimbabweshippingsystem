import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DriverDashboardScreen from '../screens/DriverDashboardScreen';
import CollectionScannerScreen from '../screens/CollectionScannerScreen';
import type { DriverStackParams } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<DriverStackParams>();

export default function DriverStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="TodayRun" component={DriverDashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="StopWorkflow" component={CollectionScannerScreen} options={{ title: 'Proof of Collection' }} />
    </Stack.Navigator>
  );
}
