import 'react-native-gesture-handler';
import React from 'react';
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
import QuickCreateScreen from './src/screens/QuickCreateScreen';
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
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700' as const, marginTop: 2 },
    tabBarItemStyle: { paddingTop: 5 },
    tabBarStyle: {
      height: 60 + bottomInset,
      paddingBottom: bottomInset,
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
  const tabScreenOptions = useTabScreenOptions();
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
function DriverScanButton({ children, onPress }: any) {
  return <Pressable onPress={onPress} style={styles.driverScanWrap}><View style={styles.driverScanButton}>{children}</View></Pressable>;
}

function DispatcherApp(){const tabScreenOptions=useTabScreenOptions();return <Tab.Navigator screenOptions={tabScreenOptions}><Tab.Screen name="Dispatch" component={RunsStack} options={{tabBarIcon:icon('map-outline')}}/><Tab.Screen name="Account" component={AccountScreen} options={{tabBarIcon:icon('person-outline')}}/></Tab.Navigator>}

function DriverRouteGateway(){const {country}=useDriverCountry();if(country==='Zimbabwe')return <DeliveryStack/>;return <DriverRunStack/>;}

function PickupDriverApp() {
  const tabScreenOptions = useTabScreenOptions();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions}>
      <Tab.Screen name="Home" component={DriverOperationsHomeScreen} options={{ tabBarIcon: icon('home-outline') }} />
      <Tab.Screen name="Route" component={DriverRouteGateway} options={{ tabBarIcon: icon('map-outline') }} />
      <Tab.Screen name="Scan" component={DriverScanScreen} options={{ title: 'Scan', tabBarLabel: 'Scan', tabBarIcon: () => <Ionicons name="scan" size={27} color={colors.white} />, tabBarButton: (props) => <DriverScanButton {...props} /> }} />
      <Tab.Screen name="History" component={DriverHistoryScreen} options={{ tabBarIcon: icon('time-outline') }} />
      <Tab.Screen name="Profile" component={DriverMoreStack} options={{ tabBarIcon: icon('person-outline') }} />
      <Tab.Screen name="Messages" component={DriverMessagesScreen} options={{ tabBarButton: () => null }} />
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
      <Tab.Screen name="Scan" component={DriverScanScreen} options={{ title: 'Scan', tabBarLabel: 'Scan', tabBarIcon: () => <Ionicons name="scan" size={27} color={colors.white} />, tabBarButton: (props) => <DriverScanButton {...props} /> }} />
      <Tab.Screen name="History" component={DriverHistoryScreen} options={{ tabBarIcon: icon('time-outline') }} />
      <Tab.Screen name="Profile" component={DriverMoreStack} options={{ tabBarIcon: icon('person-outline') }} />
      <Tab.Screen name="Messages" component={DriverMessagesScreen} options={{ tabBarButton: () => null }} />
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

  if (loading || !ready) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (!session) return <LoginScreen />;
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
  fabWrap: { top: -12, justifyContent: 'center', alignItems: 'center' },
  fab: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primaryDark, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  driverScanWrap: { top: -13, justifyContent: 'center', alignItems: 'center' },
  driverScanButton: {
    width: 54, height: 54, borderRadius: 18, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.surface,
    shadowColor: colors.primaryDark, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 7,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl },
  blockTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  blockBody: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  blockButton: { marginTop: spacing.xl, borderWidth: 1, borderColor: colors.danger, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 32 },
  blockButtonText: { color: colors.danger, fontWeight: '700' },
});
