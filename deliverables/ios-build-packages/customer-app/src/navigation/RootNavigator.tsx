import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Text, Image, ImageBackground, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import HomeScreen from '../screens/HomeScreen';
import ShipmentsScreen from '../screens/ShipmentsScreen';
import ZimmyScreen from '../screens/ZimmyScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import AccountScreen from '../screens/AccountScreen';
import BookScreen from '../screens/BookScreen';
import ShipmentDetailScreen from '../screens/ShipmentDetailScreen';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import BillingScreen from '../screens/BillingScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import QuoteScreen from '../screens/QuoteScreen';
import SavedQuotesScreen from '../screens/SavedQuotesScreen';
import AddressesScreen from '../screens/AddressesScreen';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../context/ThemeContext';
import { IMG } from '../img';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const navRef = createNavigationContainerRef<any>();
const WELCOME_KEY = 'zim-welcome-seen-v1';

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Shipments: 'cube',
  Zimmy: 'chatbubbles',
  Schedule: 'calendar',
  Account: 'person',
};

function Splash() {
  return (
    <ImageBackground source={IMG.splash} style={styles.splash} resizeMode="cover">
      <View style={styles.splashShade} />
      <View style={styles.splashInner}>
        <Image source={IMG.logo} style={styles.splashLogo} resizeMode="contain" />
        <Text style={styles.splashTagline}>Connecting Zimbabwe{'\n'}to the World</Text>
        <ActivityIndicator color={colors.white} style={{ marginTop: 28 }} />
        <Text style={styles.splashLoading}>Loading…</Text>
      </View>
    </ImageBackground>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={(focused ? TAB_ICONS[route.name] : `${TAB_ICONS[route.name]}-outline`) as any} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Shipments" component={ShipmentsScreen} />
      <Tab.Screen name="Zimmy" component={ZimmyScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const {session,profile,loading}=useAuth();const {dark,palette}=useAppTheme();
  const [welcomeSeen, setWelcomeSeen] = useState<boolean | null>(null);
  const startOnAuth = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_KEY).then((v) => setWelcomeSeen(v === '1')).catch(() => setWelcomeSeen(true));
  }, []);

  if (loading || welcomeSeen === null) return <Splash />;
  if (!session && !welcomeSeen) {
    return (
      <WelcomeScreen
        onDone={(startAuth) => {
          startOnAuth.current = startAuth;
          AsyncStorage.setItem(WELCOME_KEY, '1').catch(() => {});
          setWelcomeSeen(true);
        }}
      />
    );
  }
  if(session&&(!profile||!profile.onboarding_completed))return <OnboardingScreen/>;
  return (
    <NavigationContainer ref={navRef} onReady={()=>{if(startOnAuth.current){startOnAuth.current=false;navRef.navigate('Auth');}}} theme={{dark,colors:{primary:palette.green,background:palette.bg,card:palette.surface,text:palette.text,border:palette.border,notification:palette.red},fonts:{regular:{fontFamily:'System',fontWeight:'400'},medium:{fontFamily:'System',fontWeight:'500'},bold:{fontFamily:'System',fontWeight:'700'},heavy:{fontFamily:'System',fontWeight:'800'}}}}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Book" component={BookScreen} />
        <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Billing" component={BillingScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
        <Stack.Screen name="Quote" component={QuoteScreen} />
        <Stack.Screen name="SavedQuotes" component={SavedQuotesScreen} />
        <Stack.Screen name="Addresses" component={AddressesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.ink },
  splashShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6, 14, 9, 0.45)' },
  splashInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  splashLogo: { width: 150, height: 150 },
  splashTagline: { color: colors.white, fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 18, lineHeight: 27 },
  splashLoading: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 10, fontWeight: '600' },
});
