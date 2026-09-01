import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useBusinessConfig } from './src/lib/businessConfig';

function ThemedApp(){const {dark}=useAppTheme();useBusinessConfig();return <><StatusBar style={dark?'light':'dark'} /><RootNavigator /></>}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider><AuthProvider><ThemedApp /></AuthProvider></ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
