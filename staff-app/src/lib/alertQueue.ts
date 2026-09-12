export type AppAlertButton = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => unknown };
export type AppAlert = { title: string; message?: string; buttons: AppAlertButton[]; onDismiss?: () => void; cancelable?: boolean };

/** Dialogs are queued, never silently replaced by a second notification. */
export function createAlertQueue() {
  let queue: AppAlert[] = [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    current: () => queue[0] || null,
    push(alert: AppAlert) { queue = [...queue, alert]; notify(); },
    take(expected: AppAlert) {
      if (queue[0] !== expected) return false;
      queue = queue.slice(1); notify(); return true;
    },
  };
}

/**
 * Where a dialog has to be drawn.
 *
 * Two platform facts decide it, and both have bitten this app:
 *  - React Native Web turns `Alert.alert` into a no-op, so on web a dialog is
 *    not "ugly", it is absent — the button appears to do nothing.
 *  - A native Android alert shows at most three buttons and silently drops the
 *    rest. The driver's "Can't complete this stop?" menu is built from the
 *    12 configured failed-stop reasons, so ten of them were unreachable.
 *
 * iOS has no such cap, so it keeps its native dialog however long the menu.
 */
export function alertSurface(platform: string, buttonCount: number): 'native' | 'sheet' {
  if (platform === 'web') return 'sheet';
  if (platform === 'android' && buttonCount > 3) return 'sheet';
  return 'native';
}
