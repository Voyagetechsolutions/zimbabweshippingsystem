import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, spacing } from '../../theme';
import type { MenuStackParams } from '../../navigation/types';

type Props = NativeStackScreenProps<MenuStackParams, 'Placeholder'>;

export default function PlaceholderScreen({ route }: Props) {
  return (
    <View style={styles.center}>
      <Ionicons name="construct-outline" size={40} color={colors.textFaint} />
      <Text style={styles.title}>{route.params.title}</Text>
      <Text style={styles.body}>This section is being ported from the website. It will appear here soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  body: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
});
