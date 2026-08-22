import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';

// In a release build a render error normally closes the app with no message
// ("loads then crashes"). This catches JS render errors and shows the reason
// on screen so crashes are diagnosable on-device instead of silent.
type Props = { children: React.ReactNode };
type State = { error: Error | null; info: string | null };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Also logged to adb logcat / Metro for good measure.
    console.error('App crashed:', error, info.componentStack);
    this.setState({ info: info.componentStack });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.inner}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>The app hit an error while starting.</Text>
          <Text style={styles.label}>Error</Text>
          <Text style={styles.mono}>{error.message || String(error)}</Text>
          {error.stack ? (
            <>
              <Text style={styles.label}>Stack</Text>
              <Text style={styles.monoSmall}>{error.stack}</Text>
            </>
          ) : null}
          {info ? (
            <>
              <Text style={styles.label}>Component tree</Text>
              <Text style={styles.monoSmall}>{info}</Text>
            </>
          ) : null}
          <Pressable style={styles.btn} onPress={() => this.setState({ error: null, info: null })}>
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08110c' },
  inner: { padding: 24, paddingTop: 72 },
  title: { color: '#f4f7f4', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#a9b6ac', fontSize: 14, marginTop: 6, marginBottom: 18 },
  label: { color: '#54d68f', fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 6, letterSpacing: 1 },
  mono: { color: '#f1f5f2', fontSize: 14, fontFamily: 'monospace' },
  monoSmall: { color: '#a9b6ac', fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  btn: { backgroundColor: '#20b86a', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 28 },
  btnText: { color: '#ffffff', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
});
