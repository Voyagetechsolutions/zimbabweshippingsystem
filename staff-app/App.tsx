import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import ShipmentsStack from './src/navigation/ShipmentsStack';
import MenuStack from './src/navigation/MenuStack';
import FinanceDashboardScreen from './src/screens/FinanceDashboardScreen';
import DriverDashboardScreen from './src/screens/DriverDashboardScreen';
import AccountScreen from './src/screens/AccountScreen';
import { colors, spacing } from './src/theme';

const Tab = createBottomTabNavigator();

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: { borderTopColor: colors.border },
};

function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;
}

// Admin: full website-parity admin panel.
function AdminApp() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={AdminDashboardScreen} options={{ tabBarIcon: icon('grid-outline') }} />
      <Tab.Screen name="Shipments" component={ShipmentsStack} options={{ tabBarIcon: icon('cube-outline') }} />
      <Tab.Screen name="Menu" component={MenuStack} options={{ title: 'Sections', tabBarIcon: icon('menu-outline') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: icon('person-outline') }} />
    </Tab.Navigator>
  );
}

// Finance: finance dashboard only.
function FinanceApp() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Finance" component={FinanceDashboardScreen} options={{ tabBarIcon: icon('card-outline') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: icon('person-outline') }} />
    </Tab.Navigator>
  );
}

// Driver: collection and delivery runs.
function DriverApp() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Runs" component={DriverDashboardScreen} options={{ tabBarIcon: icon('car-outline') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: icon('person-outline') }} />
    </Tab.Navigator>
  );
}

function NotAuthorized() {
  const { signOut, session } = useAuth();
  return (
    <View style={styles.center}>
      <Ionicons name="lock-closed-outline" size={40} color={colors.textFaint} />
      <Text style={styles.blockTitle}>Access restricted</Text>
      <Text style={styles.blockBody}>
        {session?.user?.email} isn’t set up as a staff account. Ask an admin to grant you access, then sign in again.
      </Text>
      <Pressable style={styles.blockButton} onPress={signOut}>
        <Text style={styles.blockButtonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

function Root() {
  const { loading, session, dashboardRole } = useAuth();

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (!session) return <LoginScreen />;
  if (!dashboardRole) return <NotAuthorized />;

  return (
    <NavigationContainer>
      {dashboardRole === 'admin' && <AdminApp />}
      {dashboardRole === 'finance' && <FinanceApp />}
      {dashboardRole === 'driver' && <DriverApp />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl },
  blockTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  blockBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  blockButton: { marginTop: spacing.xl, borderWidth: 1, borderColor: colors.danger, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 },
  blockButtonText: { color: colors.danger, fontWeight: '700' },
});
