import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  DriverAccountScreen, DriverPerformanceScreen, DriverProfileScreen,
  DriverSettingsScreen, DriverVehicleScreen,
} from '../screens/DriverExperienceScreens';
import type { DriverMoreStackParams } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<DriverMoreStackParams>();

// "My Account" opens the driver's profile directly. There used to be a "More"
// landing screen in front of it listing the same links, which made every option
// two taps away for no benefit — the account screen already carries them.
//
// Documents was removed: it only ever showed three hardcoded rows with no real
// records behind them.
export default function DriverMoreStack() {
  return <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: '700' } }}>
    <Stack.Screen name="Account" component={DriverAccountScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Profile" component={DriverProfileScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Vehicle" component={DriverVehicleScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Performance" component={DriverPerformanceScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Settings" component={DriverSettingsScreen} options={{ headerShown: false }} />
  </Stack.Navigator>;
}
