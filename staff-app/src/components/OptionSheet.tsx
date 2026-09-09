import React from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

/**
 * A list of choices the user can actually see all of.
 *
 * This exists because `Alert.alert` cannot do the job. Android renders at most
 * three buttons and silently drops the rest — so a picker offering eight routes
 * showed three, and the Cancel button, being last, was one of the ones thrown
 * away. That is why moving a shipment to a route "did not work" and why there
 * was no way back out of the dialog. `Alert` is also a no-op on React Native
 * Web, so none of those paths could be tested in the preview at all.
 *
 * A sheet has none of those limits: every option is listed, the list scrolls
 * when it is long, and Cancel is always there.
 */

export type SheetOption = {
  /** Stable identity, returned to `onSelect`. */
  key: string;
  label: string;
  /** Second line — a date, a count, whatever distinguishes two similar rows. */
  detail?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Destructive options are red and sorted nowhere special; they read as red. */
  tone?: 'default' | 'danger';
  /** Shows a tick, for pickers where one value is already set. */
  selected?: boolean;
};

export function OptionSheet({
  visible, title, subtitle, options, onSelect, onClose, busy = false, emptyText,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: SheetOption[];
  onSelect: (key: string) => void;
  onClose: () => void;
  busy?: boolean;
  emptyText?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Tapping the dimmed area closes, which is what every sheet on both
          platforms does; Cancel below is for people who look for a button. */}
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {busy ? <ActivityIndicator color={colors.primary} /> : null}
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listBody}>
          {options.length === 0 ? (
            <Text style={styles.empty}>{emptyText || 'Nothing to choose from.'}</Text>
          ) : options.map((option) => {
            const danger = option.tone === 'danger';
            return (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
                disabled={busy}
                onPress={() => onSelect(option.key)}
              >
                {option.icon ? (
                  <Ionicons
                    name={option.icon}
                    size={19}
                    color={danger ? colors.danger : colors.textMuted}
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionLabel, danger && { color: colors.danger }]}>
                    {option.label}
                  </Text>
                  {option.detail ? <Text style={styles.optionDetail}>{option.detail}</Text> : null}
                </View>
                {option.selected ? (
                  <Ionicons name="checkmark" size={19} color={colors.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          style={styles.cancel}
          disabled={busy}
          onPress={onClose}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

/**
 * Yes/no, where "yes" may be destructive.
 *
 * Same reasoning as above: this replaces the two-button `Alert.alert`, so that
 * confirming a delete behaves identically on Android, iOS and web instead of
 * doing nothing at all on the last of those.
 */
export function ConfirmSheet({
  visible, title, message, confirmLabel, destructive = false, busy = false, onConfirm, onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} />
      <View style={styles.dialogWrap} pointerEvents="box-none">
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.dialogMessage}>{message}</Text> : null}
          <View style={styles.dialogActions}>
            <Pressable style={[styles.dialogBtn, styles.dialogGhost]} disabled={busy} onPress={onClose}>
              <Text style={styles.dialogGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.dialogBtn, destructive ? styles.dialogDanger : styles.dialogPrimary, busy && { opacity: 0.6 }]}
              disabled={busy}
              onPress={onConfirm}
            >
              {busy ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.dialogPrimaryText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    paddingBottom: spacing.lg, maxHeight: '80%',
  },
  grabber: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, marginTop: spacing.sm,
  },
  head: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  list: { flexGrow: 0 },
  listBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 2 },
  empty: { padding: spacing.lg, color: colors.textMuted, textAlign: 'center' },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 13, paddingHorizontal: spacing.md, borderRadius: radius.sm,
  },
  optionPressed: { backgroundColor: colors.primarySoft },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  optionDetail: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  cancel: {
    marginHorizontal: spacing.md, marginTop: spacing.sm,
    height: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  cancelText: { fontSize: 15, fontWeight: '800', color: colors.textMuted },

  dialogWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  dialog: {
    width: '100%', maxWidth: 420, backgroundColor: colors.surface,
    borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm,
  },
  dialogMessage: { fontSize: 13.5, color: colors.textMuted, lineHeight: 19 },
  dialogActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  dialogBtn: { flex: 1, height: 46, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  dialogGhost: { backgroundColor: colors.bg },
  dialogGhostText: { fontSize: 14.5, fontWeight: '800', color: colors.textMuted },
  dialogPrimary: { backgroundColor: colors.primary },
  dialogDanger: { backgroundColor: colors.danger },
  dialogPrimaryText: { fontSize: 14.5, fontWeight: '800', color: colors.white },
});
