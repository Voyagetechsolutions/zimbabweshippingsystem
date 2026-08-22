import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, shadow, type as typeScale } from '../theme';

// The centre "+" tab: one tap away from every create action.
export default function QuickCreateScreen() {
  const navigation = useNavigation<any>();

  const actions: Array<{ icon: keyof typeof Ionicons.glyphMap; title: string; text: string; onPress: () => void }> = [
    { icon: 'add-circle', title: 'New booking', text: 'Capture a shipment for a customer', onPress: () => navigation.navigate('Menu', { screen: 'ManualBooking' }) },
    { icon: 'car', title: 'Driver run', text: 'Plan a pickup or delivery route', onPress: () => navigation.navigate('Runs') },
    { icon: 'pricetag', title: 'Quote', text: 'Open pending quote requests', onPress: () => navigation.navigate('Menu', { screen: 'CustomQuotes' }) },
    { icon: 'person-add', title: 'Customer', text: 'Find or manage customers', onPress: () => navigation.navigate('Menu', { screen: 'Customers' }) },
    { icon: 'cash', title: 'Payment', text: 'Record and reconcile payments', onPress: () => navigation.navigate('Menu', { screen: 'Payments' }) },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>Quick create</Text>
        <Text style={styles.sub}>What are we doing?</Text>
        {actions.map((action) => (
          <Pressable key={action.title} style={styles.card} onPress={action.onPress}>
            <View style={styles.icon}><Ionicons name={action.icon} size={22} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{action.title}</Text>
              <Text style={styles.cardText}>{action.text}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.sm },
  title: { fontSize: typeScale.heading, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  sub: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, ...shadow },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: typeScale.cardTitle, fontWeight: '800', color: colors.text },
  cardText: { fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
});
