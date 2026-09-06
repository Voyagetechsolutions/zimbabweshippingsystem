import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ViewRoleProvider, useViewRole } from './src/context/ViewRoleContext';
import RoleSelectScreen from './src/screens/RoleSelectScreen';
import LoginScreen from './src/screens/LoginScreen';
import SetPasswordScreen from './src/screens/SetPasswordScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import ShipmentsStack from './src/navigation/ShipmentsStack';
import RunsStack from './src/navigation/RunsStack';
import MenuStack from './src/navigation/MenuStack';
import DriverStack from './src/navigation/DriverStack';
import DriverRunStack from './src/navigation/DriverRunStack';
import DriverMoreStack from './src/navigation/DriverMoreStack';
import DeliveryStack from './src/navigation/DeliveryStack';
import { DriverMessagesScreen } from './src/screens/DriverExperienceScreens';
import FinanceOverviewStack from './src/navigation/FinanceOverviewStack';
import FinanceWorkspaceStack from './src/navigation/FinanceWorkspaceStack';
import FinanceDashboardScreen from './src/screens/FinanceDashboardScreen';
import AccountScreen from './src/screens/AccountScreen';
import DriverRunsScreen from './src/screens/admin/DriverRunsScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import { colors, spacing } from './src/theme';
import MapPreviewScreen from './src/screens/MapPreviewScreen';
import DriverOperationsHomeScreen from './src/screens/DriverOperationsHomeScreen';
import DriverScanScreen from './src/screens/DriverScanScreen';
import DriverHistoryScreen from './src/screens/DriverHistoryScreen';
import { DriverCountryProvider, useDriverCountry } from './src/context/DriverCountryContext';
import { loadStaffBusinessConfig } from './src/lib/businessConfig';

const Tab = createBottomTabNavigator();

function useTabScreenOptions() {
  const insets = useSafeAreaInsets();
  // A fixed tab-bar height overlaps Android's gesture/three-button navigation
  // area on edge-to-edge devices. Add the actual device inset to the visual
  // 60px bar so every dashboard remains fully above the system controls.
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  return React.useMemo(() => ({
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarHideOnKeyboard: true,
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700' as const, marginTop: 0 },
    tabBarItemStyle: { paddingVertical: 0 },
    tabBarStyle: {
      // Padding top and bottom match, so the icon/label pair is centred in the
      // bar instead of being pushed up by a bottom-only inset.
      height: 58 + bottomInset,
      paddingTop: 6,
      paddingBottom: bottomInset + 6,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
      shadowColor: '#0f172a',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: -3 },
      elevation: 8,
    },
  }), [bottomInset]);
}

function icon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;
}

// Admin: operations command centre.
function AdminApp() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={AdminDashboardScreen} options={{ tabBarIcon: icon('home-outline') }} />
      <Tab.Screen name="Shipments" component={ShipmentsStack} options={{ tabBarIcon: icon('cube-outline') }} />
      <Tab.Screen name="Runs" component={RunsStack} options={{ title: 'Runs', tabBarIcon: icon('car-outline') }} />
      <Tab.Screen name="Menu" component={MenuStack} options={{ title: 'More', tabBarIcon: icon('menu-outline') }} />
    </Tab.Navigator>
  );
}

// Finance: finance dashboard only.
function FinanceApp() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Finance" component={FinanceOverviewStack} options={{ title: 'Overview', tabBarIcon: icon('stats-chart-outline') }} />
      <Tab.Screen name="ERP" component={FinanceWorkspaceStack} options={{ title: 'ERP', tabBarIcon: icon('grid-outline') }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: icon('person-outline') }} />
    </Tab.Navigator>
  );
}

// Pickup driver: the shared collection route.
// Dispatcher: the dispatch dashboard was removed. Drivers now see the
// collections scheduled ahead of them and plan their own route, so there is no
// board to assign from — a dispatcher account is left with its own profile.
function DispatcherApp(){return <AccountScreen/>}

function DriverRouteGateway(){const {country}=useDriverCountry();if(country==='Zimbabwe')return <DeliveryStack/>;return <DriverRunStack/>;}

function PickupDriverApp() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={DriverOperationsHomeScreen} options={{ tabBarIcon: icon('home-outline') }} />
      <Tab.Screen name="Route" component={DriverRouteGateway} options={{ tabBarIcon: icon('map-outline') }} />
      <Tab.Screen name="Scan" component={DriverScanScreen} options={{ title: 'Scan', tabBarIcon: icon('scan-outline') }} />
      <Tab.Screen name="History" component={DriverHistoryScreen} options={{ tabBarIcon: icon('time-outline') }} />
      <Tab.Screen name="Profile" component={DriverMoreStack} options={{ tabBarIcon: icon('person-outline') }} />
      <Tab.Screen name="Messages" component={DriverMessagesScreen} options={{
        // `tabBarButton: () => null` renders nothing but still leaves the
        // item in the row, so the five visible tabs were laid out as six and
        // sat off-centre with a gap on the right. Taking it out of the flex
        // row as well is what actually hides it.
        tabBarButton: () => null, tabBarItemStyle: { display: 'none' },
      }} />
    </Tab.Navigator>
  );
}

// Delivery driver: a vehicle they load themselves at the depot, then run. They
// never see the collection route — it is the other half of the journey and on
// another continent.
function DeliveryDriverApp() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={DriverOperationsHomeScreen} options={{ tabBarIcon: icon('home-outline') }} />
      <Tab.Screen name="Route" component={DeliveryStack} options={{ tabBarIcon: icon('map-outline') }} />
      <Tab.Screen name="Scan" component={DriverScanScreen} options={{ title: 'Scan', tabBarIcon: icon('scan-outline') }} />
      <Tab.Screen name="History" component={DriverHistoryScreen} options={{ tabBarIcon: icon('time-outline') }} />
      <Tab.Screen name="Profile" component={DriverMoreStack} options={{ tabBarIcon: icon('person-outline') }} />
      <Tab.Screen name="Messages" component={DriverMessagesScreen} options={{
        // `tabBarButton: () => null` renders nothing but still leaves the
        // item in the row, so the five visible tabs were laid out as six and
        // sat off-centre with a gap on the right. Taking it out of the flex
        // row as well is what actually hides it.
        tabBarButton: () => null, tabBarItemStyle: { display: 'none' },
      }} />
    </Tab.Navigator>
  );
}

// Which driver experience this account gets. Admin sets the specialism in the
// Staff Control Centre; an unset one means the driver does both.
function DriverApp({ driverType }: { driverType: 'pickup' | 'delivery' | 'both' }) {
  return <DriverCountryProvider>{driverType === 'delivery' ? <DeliveryDriverApp /> : <PickupDriverApp />}</DriverCountryProvider>;
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
  const { loading, session, dashboardRole, driverType, roleReady } = useAuth();
  const { viewRole, ready } = useViewRole();
  const [configReady,setConfigReady]=useState(false);
  useEffect(()=>{if(!session){setConfigReady(false);return;}loadStaffBusinessConfig().then(()=>setConfigReady(true)).catch(()=>setConfigReady(false));},[session?.user.id]);

  if (loading || !ready) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (!session) return <LoginScreen />;
  if (!configReady) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.blockBody}>Loading current business settings…</Text></View>;
  // Staff created by an admin start on a temporary password that was read out to
  // them. This stands in front of everything — including the role check — until
  // they have replaced it.
  if (session.user?.user_metadata?.must_change_password) return <SetPasswordScreen />;
  // The role lookup is a second round trip after the session restores. Holding
  // the spinner for it stops a driver being told, every single cold start, that
  // their account is not a staff account.
  if (!roleReady) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (!dashboardRole) return <NotAuthorized />;
  const showMapPreview = __DEV__ && Platform.OS === 'web'
    && new URLSearchParams(window.location?.search ?? '').has('mapPreview');
  if (showMapPreview) return <MapPreviewScreen />;

  // Admins choose which dashboard to work in; everyone else goes straight
  // to the dashboard their role allows.
  const effectiveRole = dashboardRole === 'admin' ? viewRole : dashboardRole;
  if (dashboardRole === 'admin' && !effectiveRole) return <RoleSelectScreen />;

  return (
    <NavigationContainer>
      {effectiveRole === 'admin' && <AdminApp />}
      {effectiveRole === 'finance' && <FinanceApp />}
      {effectiveRole === 'driver' && <DriverApp driverType={driverType} />}
      {effectiveRole === 'dispatcher' && <DispatcherApp />}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl },
  blockTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  blockBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  blockButton: { marginTop: spacing.xl, borderWidth: 1, borderColor: colors.danger, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 },
  blockButtonText: { color: colors.danger, fontWeight: '700' },
});
