import * as Location from 'expo-location';

/**
 * The driver's current position, used to order the day's collections by
 * distance.
 *
 * Location is a convenience, never a requirement: a refused permission, a
 * disabled GPS or a device that simply cannot get a fix must still leave the
 * driver with a usable list of addresses. Every failure resolves to null.
 */

export type Point = { latitude: number; longitude: number };

export type LocationOutcome =
  | { point: Point; status: 'ok' }
  | { point: null; status: 'denied' | 'unavailable' | 'error' };

export async function getDriverLocation(): Promise<LocationOutcome> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { point: null, status: 'denied' };

    const enabled = await Location.hasServicesEnabledAsync();
    if (!enabled) return { point: null, status: 'unavailable' };

    // Balanced accuracy is plenty for ranking addresses a street apart, and it
    // is far kinder to the battery over a full shift than high accuracy.
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      point: { latitude: position.coords.latitude, longitude: position.coords.longitude },
      status: 'ok',
    };
  } catch {
    return { point: null, status: 'error' };
  }
}

export function describeLocationStatus(status: LocationOutcome['status']): string {
  if (status === 'denied') return 'Location permission is off, so stops are not sorted by distance.';
  if (status === 'unavailable') return 'Location services are switched off, so stops are not sorted by distance.';
  if (status === 'error') return 'Could not get your location, so stops are not sorted by distance.';
  return '';
}
