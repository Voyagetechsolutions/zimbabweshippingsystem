import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DriverAccountScreen, DriverDocumentsScreen, DriverMoreScreen, DriverPerformanceScreen, DriverSettingsScreen, DriverVehicleScreen } from '../screens/DriverExperienceScreens';
import type { DriverMoreStackParams } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<DriverMoreStackParams>();

export default function DriverMoreStack() {
  return <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '700' } }}>
    <Stack.Screen name="More" component={DriverMoreScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Vehicle" component={DriverVehicleScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Settings" component={DriverSettingsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Account" component={DriverAccountScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Documents" component={DriverDocumentsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Performance" component={DriverPerformanceScreen} options={{ headerShown: false }} />
  </Stack.Navigator>;
}
