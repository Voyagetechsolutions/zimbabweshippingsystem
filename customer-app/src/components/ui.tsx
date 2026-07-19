import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors, radius, spacing, FLAG } from '../theme';
import { useAppTheme } from '../context/ThemeContext';

export function FlagStripe({ height = 4 }: { height?: number }) {
  return (
    <View style={{ flexDirection: 'row', height }}>
      {FLAG.map((c) => <View key={c} style={{ flex: 1, backgroundColor: c }} />)}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const {palette}=useAppTheme();return <View style={[styles.card,{backgroundColor:palette.surface,borderColor:palette.border}, style]}>{children}</View>;
}

export function Button({
  title, onPress, busy, variant = 'primary', disabled, style,
}: {
  title: string; onPress: () => void; busy?: boolean;
  variant?: 'primary' | 'outline' | 'ghost'; disabled?: boolean; style?: ViewStyle;
}) {
  const {palette}=useAppTheme();
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.btn,
        isPrimary && { backgroundColor: colors.green },
        variant === 'outline' && [styles.btnOutline,{backgroundColor:palette.surface}],
        variant === 'ghost' && { backgroundColor: 'transparent' },
        (disabled || busy) && { opacity: 0.55 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {busy
        ? <ActivityIndicator color={isPrimary ? colors.white : colors.green} size="small" />
        : <Text style={[styles.btnText, !isPrimary && { color: colors.green }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({
  label, value, onChangeText, placeholder, keyboardType, autoCapitalize, secureTextEntry, multiline,
}: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'words' | 'sentences'; secureTextEntry?: boolean; multiline?: boolean;
}) {
  const {palette}=useAppTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[styles.label,{color:palette.textMuted}]}>{label}</Text>
      <TextInput
        style={[styles.input,{backgroundColor:palette.surface,borderColor:palette.border,color:palette.text}, multiline && { minHeight: 72, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textFaint}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
      />
    </View>
  );
}

export function Pill({ text, bg = colors.greenSoft, fg = colors.greenDark }: { text: string; bg?: string; fg?: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function SectionTitle({ text }: { text: string }) {
  const {palette}=useAppTheme();return <Text style={[styles.sectionTitle,{color:palette.textMuted}]}>{text}</Text>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md,
  },
  btn: {
    borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center', justifyContent: 'center',
  },
  btnOutline: { borderWidth: 1.5, borderColor: colors.green, backgroundColor: colors.white },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 5 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.text, backgroundColor: colors.white,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.5, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
});
