import React, { useSyncExternalStore } from 'react';
import { Alert as NativeAlert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { alertSurface, createAlertQueue } from './alertQueue';
import { colors, spacing } from '../theme';

const queue = createAlertQueue();

/** Keep native mobile dialogs; web and long Android menus need a visible sheet. */
export const Alert = {
  prompt: NativeAlert.prompt,
  alert: ((title, message, buttons, options) => {
    if (alertSurface(Platform.OS, buttons?.length || 0) === 'native') {
      NativeAlert.alert(title, message, buttons, options);
      return;
    }
    queue.push({ title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }], ...options });
  }) as typeof NativeAlert.alert,
};

export function AppAlertHost() {
  const alert = useSyncExternalStore(queue.subscribe, queue.current, queue.current);
  if (!alert) return null;
  const dismiss = () => {
    if (alert.cancelable && queue.take(alert)) alert.onDismiss?.();
  };
  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Dismiss dialog" />
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">{alert.title}</Text>
          {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}
          <ScrollView style={styles.options}>
            {alert.buttons.map((button, index) => (
              <Pressable key={index} accessibilityRole="button" style={styles.button}
                onPress={() => {
                  if (!queue.take(alert)) return;
                  // Dismiss first so callbacks can safely show another dialog.
                  Promise.resolve().then(() => button.onPress?.()).catch((error) => {
                    Alert.alert('Action failed', error instanceof Error ? error.message : 'Please try again.');
                  });
                }}>
                <Text style={[styles.label, button.style === 'destructive' && { color: colors.danger }]}>{button.text || 'OK'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  dialog: { width: '100%', maxWidth: 440, maxHeight: '85%', padding: spacing.lg, borderRadius: 16, backgroundColor: colors.surface },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  message: { fontSize: 14, lineHeight: 21, color: colors.textMuted, marginTop: spacing.sm },
  options: { flexGrow: 0, marginTop: spacing.md },
  button: { minHeight: 48, justifyContent: 'center', padding: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  label: { fontSize: 15, fontWeight: '600', color: colors.primary },
});
