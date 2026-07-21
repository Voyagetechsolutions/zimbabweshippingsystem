import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';

// Lightweight month-grid date picker (no native dependency) used by the
// Driver Runs and Reports date selectors.

function iso(d: Date) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export default function CalendarModal({ visible, initial, onClose, onSelect }: {
  visible: boolean; initial?: string; onClose: () => void; onSelect: (isoDate: string) => void;
}) {
  const start = initial ? new Date(`${initial}T12:00:00`) : new Date();
  const [year, setYear] = useState(start.getFullYear());
  const [month, setMonth] = useState(start.getMonth());

  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7; // Monday-first grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayIso = iso(new Date());

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.shade} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.head}>
            <Pressable onPress={() => shift(-1)} hitSlop={10}><Ionicons name="chevron-back" size={20} color={colors.text} /></Pressable>
            <Text style={styles.title}>{new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
            <Pressable onPress={() => shift(1)} hitSlop={10}><Ionicons name="chevron-forward" size={20} color={colors.text} /></Pressable>
          </View>
          <View style={styles.week}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <Text key={i} style={styles.weekDay}>{d}</Text>)}
          </View>
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day == null) return <View key={i} style={styles.cell} />;
              const dateIso = iso(new Date(year, month, day));
              const selected = dateIso === initial;
              const isToday = dateIso === todayIso;
              return (
                <Pressable key={i} style={[styles.cell, selected && styles.cellSelected, !selected && isToday && styles.cellToday]}
                  onPress={() => { onSelect(dateIso); onClose(); }}>
                  <Text style={[styles.cellText, selected && { color: colors.white }, !selected && isToday && { color: colors.primary }]}>{day}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable style={styles.cancel} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, width: '100%', maxWidth: 360 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { fontSize: 15, fontWeight: '800', color: colors.text },
  week: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '800', color: colors.textFaint },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1.15, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  cellSelected: { backgroundColor: colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: colors.primary },
  cellText: { fontSize: 13, fontWeight: '600', color: colors.text },
  cancel: { alignItems: 'center', paddingTop: spacing.md },
  cancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
