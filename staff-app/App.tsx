import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ViewRoleProvider, useViewRole } from './src/context/ViewRoleContext';
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import LoginScreen from './src/screens/LoginScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import QuickCreateScreen from './src/screens/QuickCreateScreen';
import ShipmentsStack from './src/navigation/ShipmentsStack';
import RunsStack from './src/navigation/RunsStack';
import MenuStack from './src/navigation/MenuStack';
import DriverStack from './src/navigation/DriverStack';
import DriverRunStack from './src/navigation/DriverRunStack';
import DriverMoreStack from './src/navigation/DriverMoreStack';
import { DriverMessagesScreen } from './src/screens/DriverExperienceScreens';
import FinanceOverviewStack from './src/navigation/FinanceOverviewStack';
import FinancePaymentsStack from './src/navigation/FinancePaymentsStack';
import FinanceBooksStack from './src/navigation/FinanceBooksStack';
import FinanceDashboardScreen from './src/screens/FinanceDashboardScreen';
import AccountScreen from './src/screens/AccountScreen';
import PaymentsScreen from './src/screens/admin/PaymentsScreen';
import InvoicesScreen from './src/screens/admin/InvoicesScreen';
import DriverRunsScreen from './src/screens/admin/DriverRunsScreen';
import FinanceBooksScreen from './src/screens/FinanceBooksScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { colors, spacing } from './src/theme';

const Tab = createBottomTabNavigator();

const tabScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarHideOnKeyboard: true,
  tabBarLabelStyle: { fontSize: 10, fontWeight: '700' as const, marginTop: 2 },
  tabBarItemStyle: { paddingTop: 5 },
  tabBarStyle: {
    height: 68,
    paddingBottom: 8,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
};

function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;
}

// Centre FAB for the admin tab bar — the "new booking" affordance.
function FabButton({ children, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={styles.fabWrap}>
      <View style={styles.fab}>{children}</View>
    </Pressable>
  );
}

// Admin: operations command centre.
function AdminApp() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={AdminDashboardScreen} options={{ tabBarIcon: icon('home-outline') }} />
      <Tab.Screen name="Shipments" component={ShipmentsStack} options={{ tabBarIcon: icon('cube-outline') }} />
      <Tab.Screen
        name="Create"
        component={QuickCreateScreen}
        options={{
          title: '',
          tabBarIcon: () => <Ionicons name="add" size={30} color={colors.white} />,
          tabBarButton: (props) => <FabButton {...props} />,
        }}
      />
      <Tab.Screen name="Runs" component={RunsStack} options={{ title: 'Runs', tabBarIcon: icon('car-outline') }} />
      <Tab.Screen name="Menu" component={MenuStack} options={{ title: 'More', tabBarIcon: icon('menu-outline') }} />
    </Tab.Navigator>
  );
}

// Finance: finance dashboard only.
function FinanceApp() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Finance" component={FinanceOverviewStack} options={{ title: 'Overview', tabBarIcon: icon('stats-chart-outline') }} />
      <Tab.Screen name="Payments" component={FinancePaymentsStack} options={{ tabBarIcon: icon('card-outline') }} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} options={{ tabBarIcon: icon('receipt-outline') }} />
      <Tab.Screen name="Books" component={FinanceBooksStack} options={{ title: 'Books', tabBarIcon: icon('book-outline') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: icon('person-outline') }} />
    </Tab.Navigator>
  );
}

// Driver: collection and delivery runs.
function DriverApp() {
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={DriverStack} options={{ tabBarIcon: icon('home-outline') }} />
      <Tab.Screen name="My Run" component={DriverRunStack} options={{ tabBarIcon: icon('map-outline') }} />
      <Tab.Screen name="Messages" component={DriverMessagesScreen} options={{ tabBarIcon: icon('chatbubble-ellipses-outline') }} />
      <Tab.Screen name="More" component={DriverMoreStack} options={{ tabBarIcon: icon('menu-outline') }} />
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
  const { viewRole, ready } = useViewRole();

  if (loading || !ready) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (!session) return <LoginScreen />;
  if (!dashboardRole) return <NotAuthorized />;

  // Admins choose which dashboard to work in; everyone else goes straight
  // to the dashboard their role allows.
  const effectiveRole = dashboardRole === 'admin' ? viewRole : dashboardRole;
  if (dashboardRole === 'admin' && !effectiveRole) return <RoleSelectScreen />;

  return (
    <NavigationContainer>
      {effectiveRole === 'admin' && <AdminApp />}
      {effectiveRole === 'finance' && <FinanceApp />}
      {effectiveRole === 'driver' && <DriverApp />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <ViewRoleProvider>
            <StatusBar style="dark" />
            <Root />
          </ViewRoleProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  fabWrap: { top: -12, justifyContent: 'center', alignItems: 'center' },
  fab: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryDark, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl },
  blockTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  blockBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  blockButton: { marginTop: spacing.xl, borderWidth: 1, borderColor: colors.danger, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 },
  blockButtonText: { color: colors.danger, fontWeight: '700' },
});
