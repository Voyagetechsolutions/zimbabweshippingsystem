import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';

function ThemedApp(){const {dark}=useAppTheme();return <><StatusBar style={dark?'light':'dark'} /><RootNavigator /></>}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider><AuthProvider><ThemedApp /></AuthProvider></ThemeProvider>
    </SafeAreaProvider>
  );
}
