import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius } from '../theme';
import { FlagStripe } from '../components/ui';
import { useAppTheme } from '../context/ThemeContext';

// Same Zimmy brain as the website — the ai-chat edge function handles pricing,
// coverage, schedules, tracking, bookings, quotes and Mr Moyo leads.
type ChatMessage = { role: 'user' | 'assistant'; content: string };

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm Zimmy, the Zimbabwe Shipping assistant. Ask me about prices, collection dates, tracking — or let me book your shipment right here.",
};

const STORAGE_KEY = 'zimmy-app-chat';
const CONVERSATION_KEY = 'zimmy-app-conversation-id';

const quickPrompts = [
  'What can I ship and what does it cost?',
  'When is the next collection?',
  'Book my shipment',
  'Track a shipment',
];

function newConversationId() {
  return `app-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ZimmyScreen() {
  const route = useRoute<any>();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const conversationId = useRef<string>('');
  const listRef = useRef<FlatList>(null);
  const {palette}=useAppTheme();

  useEffect(() => {
    (async () => {
      try {
        const savedId = await AsyncStorage.getItem(CONVERSATION_KEY);
        conversationId.current = savedId || newConversationId();
        if (!savedId) await AsyncStorage.setItem(CONVERSATION_KEY, conversationId.current);
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length) setMessages(parsed.slice(-30));
        }
      } catch { /* fresh chat */ }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))).catch(() => {});
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const payload = next.filter((m, i) => i !== 0).slice(-20);
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { conversationId: conversationId.current, messages: payload },
      });
      if (error) throw error;
      const reply = (data as { reply?: string } | null)?.reply ||
        'Sorry, I had a problem replying. Please try again, or reach us on WhatsApp +44 7584 100552.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble right now. Please try again shortly, or contact us on WhatsApp +44 7584 100552.",
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  // Quick actions elsewhere in the app can hand Zimmy an opening message.
  useEffect(() => {
    const prefill = route.params?.prefill;
    if (prefill) send(String(prefill));
  }, [route.params?.prefill]);

  const reset = async () => {
    conversationId.current = newConversationId();
    await AsyncStorage.multiSet([[CONVERSATION_KEY, conversationId.current], [STORAGE_KEY, '[]']]).catch(() => {});
    setMessages([GREETING]);
  };

  return (
    <SafeAreaView style={[styles.safe,{backgroundColor:palette.bg}]} edges={['top']}>
      <FlagStripe />
      <View style={[styles.header,{backgroundColor:palette.surface,borderColor:palette.border}]}>
        <View style={styles.avatar}><Ionicons name="chatbubbles" size={18} color={colors.white} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle,{color:palette.text}]}>Zimmy</Text>
          <Text style={[styles.headerSub,{color:palette.textMuted}]}>Zimbabwe Shipping AI assistant</Text>
        </View>
        <Pressable onPress={reset} hitSlop={12}><Ionicons name="refresh" size={19} color={colors.textMuted} /></Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.bubbleRow, item.role === 'user' && { justifyContent: 'flex-end' }]}>
              <View style={[styles.bubble, item.role === 'user' ? [styles.bubbleUser,{backgroundColor:palette.green}] : [styles.bubbleBot,{backgroundColor:palette.surface,borderColor:palette.border}]]}>
                <Text style={[styles.bubbleText,{color:item.role==='user'?palette.white:palette.text}]}>{item.content}</Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            <View>
              {messages.length === 1 && !loading && (
                <View style={styles.prompts}>
                  {quickPrompts.map((p) => (
                    <Pressable key={p} style={[styles.prompt,{backgroundColor:palette.surface,borderColor:palette.border}]} onPress={() => send(p)}>
                      <Text style={[styles.promptText,{color:palette.text}]}>{p}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {loading && (
                <View style={styles.bubbleRow}>
                  <View style={[styles.bubble, styles.bubbleBot]}><ActivityIndicator size="small" color={colors.green} /></View>
                </View>
              )}
            </View>
          }
        />
        <View style={[styles.inputRow,{backgroundColor:palette.surface,borderColor:palette.border}]}>
          <TextInput
            style={[styles.input,{backgroundColor:palette.bg,borderColor:palette.border,color:palette.text}]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Zimmy anything…"
            placeholderTextColor={colors.textFaint}
            onSubmitEditing={() => send()}
            returnKeyType="send"
          />
          <Pressable style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.5 }]} onPress={() => send()} disabled={!input.trim() || loading}>
            <Ionicons name="send" size={17} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  headerSub: { fontSize: 11, color: colors.textMuted },
  list: { padding: spacing.lg, gap: spacing.sm },
  bubbleRow: { flexDirection: 'row', marginBottom: 2 },
  bubble: { maxWidth: '85%', borderRadius: radius.lg, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleUser: { backgroundColor: colors.green, borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  prompt: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 8 },
  promptText: { fontSize: 12.5, color: colors.text, fontWeight: '600' },
  inputRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: colors.text, backgroundColor: colors.bg },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
});
