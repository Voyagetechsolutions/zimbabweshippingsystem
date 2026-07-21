import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DriverRunsScreen from '../screens/admin/DriverRunsScreen';
import RunDetailScreen from '../screens/admin/RunDetailScreen';
import type { RunsStackParams } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RunsStackParams>();

export default function RunsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="DriverRuns" component={DriverRunsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RunDetail" component={RunDetailScreen} options={{ title: 'Run Details' }} />
    </Stack.Navigator>
  );
}
