import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../theme';
import { useAppTheme } from '../context/ThemeContext';

export type Suggestion = { key: string; primary: string; secondary?: string };

/**
 * A text field that offers suggestions as you type.
 *
 * Deliberately a plain inline list rather than a floating overlay: inside a
 * ScrollView on a phone, an absolutely-positioned dropdown ends up clipped or
 * unreachable behind the keyboard.
 *
 * `fetcher` is debounced and its result is discarded if the query moved on, so
 * a slow reply can never overwrite newer input.
 */
export function SuggestField({
  label,
  value,
  onChangeText,
  fetcher,
  onPick,
  placeholder,
  autoCapitalize = 'words',
  hint,
  minChars = 3,
  debounceMs = 400,
  icon = 'search',
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  fetcher: (query: string) => Promise<Suggestion[]>;
  onPick: (suggestion: Suggestion) => void;
  placeholder?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences';
  hint?: string;
  minChars?: number;
  debounceMs?: number;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { palette } = useAppTheme();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // A pick sets the text; that must not immediately re-query for it.
  const skipNextRef = useRef(false);

  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    if (value.trim().length < minChars) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const results = await fetcher(value).catch(() => [] as Suggestion[]);
      if (cancelled) return;
      setSuggestions(results);
      setDismissed(false);
      setLoading(false);
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setLoading(false);
    };
    // fetcher is recreated each render by callers; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, minChars, debounceMs]);

  const visible = !dismissed && suggestions.length > 0;

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[styles.label, { color: palette.textMuted }]}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={16} color={palette.textFaint} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
          value={value}
          onChangeText={(next) => {
            setDismissed(false);
            onChangeText(next);
          }}
          placeholder={placeholder}
          placeholderTextColor={palette.textFaint}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={colors.green} style={styles.spinner} />}
      </View>

      {visible && (
        <View style={[styles.list, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.key}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: palette.greenSoft }]}
              onPress={() => {
                skipNextRef.current = true;
                onPick(suggestion);
                setSuggestions([]);
                setDismissed(true);
              }}
            >
              <Ionicons name="location-outline" size={15} color={colors.green} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.primary, { color: palette.text }]} numberOfLines={1}>{suggestion.primary}</Text>
                {Boolean(suggestion.secondary) && (
                  <Text style={[styles.secondary, { color: palette.textMuted }]} numberOfLines={1}>{suggestion.secondary}</Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {Boolean(hint) && !visible && (
        <Text style={[styles.hint, { color: palette.textMuted }]}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', marginBottom: 5 },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  inputIcon: { position: 'absolute', left: 11, zIndex: 1 },
  spinner: { position: 'absolute', right: 11 },
  input: {
    borderWidth: 1, borderRadius: radius.sm,
    paddingLeft: 33, paddingRight: 33, paddingVertical: 10, fontSize: 15,
  },
  list: { marginTop: 5, borderWidth: 1, borderRadius: radius.sm, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11, paddingVertical: 10 },
  primary: { fontSize: 14, fontWeight: '600' },
  secondary: { fontSize: 11.5, marginTop: 1 },
  hint: { fontSize: 11.5, lineHeight: 16, marginTop: 5 },
});
