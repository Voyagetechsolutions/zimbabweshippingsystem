import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DriverRunsScreen from '../screens/admin/DriverRunsScreen';
import RunDetailScreen from '../screens/admin/RunDetailScreen';
import DispatchRouteBuilderScreen from '../screens/admin/DispatchRouteBuilderScreen';
import CollectionGroupsScreen from '../screens/admin/CollectionGroupsScreen';
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
      <Stack.Screen name="CollectionGroups" component={CollectionGroupsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BuildRoute" component={DispatchRouteBuilderScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
