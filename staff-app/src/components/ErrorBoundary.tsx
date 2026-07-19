import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

// Catches render/runtime errors so a crash shows a readable message on screen
// instead of Expo Go's blank "Something went wrong" screen.
interface State { error: Error | null }

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('App crashed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView contentContainerStyle={styles.wrap}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something crashed</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          {this.state.error.stack ? (
            <Text style={styles.stack}>{this.state.error.stack.split('\n').slice(0, 6).join('\n')}</Text>
          ) : null}
          <Pressable style={styles.button} onPress={() => this.setState({ error: null })}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.bg, gap: spacing.sm },
  emoji: { fontSize: 40 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  message: { fontSize: 14, color: colors.danger, textAlign: 'center', fontWeight: '600' },
  stack: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace', marginTop: spacing.sm },
  button: { marginTop: spacing.lg, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
