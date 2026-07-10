import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ShipmentsListScreen from '../screens/ShipmentsListScreen';
import ShipmentDetailScreen from '../screens/ShipmentDetailScreen';
import type { ShipmentsStackParams } from './types';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<ShipmentsStackParams>();

export default function ShipmentsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="ShipmentsList" component={ShipmentsListScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} options={{ title: 'Shipment Details' }} />
    </Stack.Navigator>
  );
}
