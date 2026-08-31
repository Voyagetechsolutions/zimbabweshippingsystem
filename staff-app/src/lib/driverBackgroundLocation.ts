import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabase';

export const DRIVER_LOCATION_TASK = 'zimbabwe-shipping-driver-location';
const TRACKING_STATE = 'driver-operational-tracking-v1';

type TrackingState = { enabled: boolean; routeId: string | null };

if (Platform.OS !== 'web' && !TaskManager.isTaskDefined(DRIVER_LOCATION_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(DRIVER_LOCATION_TASK, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const stateRaw = await AsyncStorage.getItem(TRACKING_STATE).catch(() => null);
    const state = stateRaw ? JSON.parse(stateRaw) as TrackingState : null;
    if (!state?.enabled) return;
    const latest = data.locations[data.locations.length - 1];
    await supabase.rpc('update_driver_operational_location', {
      p_latitude: latest.coords.latitude,
      p_longitude: latest.coords.longitude,
      p_accuracy_m: latest.coords.accuracy ?? null,
      p_speed_mps: latest.coords.speed ?? null,
      p_route_id: state.routeId,
    });
  });
}

export async function startOperationalTracking(routeId: string | null) {
  await AsyncStorage.setItem(TRACKING_STATE, JSON.stringify({ enabled: true, routeId } satisfies TrackingState));
  if (Platform.OS === 'web') return { background: false };
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return { background: false };
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') return { background: false };
  const registered = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK);
  if (!registered) await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 100,
    timeInterval: 60_000,
    deferredUpdatesDistance: 250,
    deferredUpdatesInterval: 120_000,
    pausesUpdatesAutomatically: true,
    activityType: Location.ActivityType.AutomotiveNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Zimbabwe Shipping route active',
      notificationBody: 'Location is shared with dispatch while you are online.',
      killServiceOnDestroy: true,
    },
  });
  return { background: true };
}

export async function stopOperationalTracking() {
  await AsyncStorage.setItem(TRACKING_STATE, JSON.stringify({ enabled: false, routeId: null } satisfies TrackingState));
  if (Platform.OS === 'web') return;
  if (await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK)) await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK);
}
