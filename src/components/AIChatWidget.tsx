import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, RotateCcw, Send, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm Zimmy, the Zimbabwe Shipping assistant. How can I help you today?",
};

const STORAGE_KEY = 'zimmy-ai-chat';

const quickPrompts = [
  'How much is a drum?',
  'Where do you collect?',
  'I want to book',
  'Track a shipment',
];

function loadSavedMessages(): ChatMessage[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [GREETING];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.length) return [GREETING];

    return parsed
      .filter((message) =>
        (message?.role === 'user' || message?.role === 'assistant') &&
        typeof message?.content === 'string'
      )
      .slice(-30);
  } catch {
    return [GREETING];
  }
}

const AIChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadSavedMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    const openFromAnnouncement = () => {
      setOpen(true);
      window.dispatchEvent(new Event('zimmy:opened'));
    };

    window.addEventListener('zimmy:open', openFromAnnouncement);
    return () => window.removeEventListener('zimmy:open', openFromAnnouncement);
  }, []);

  const openChat = () => {
    setOpen(true);
    window.dispatchEvent(new Event('zimmy:opened'));
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const payload = next.filter((_, index) => index !== 0).slice(-20);
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: payload.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        },
      });

      if (error) throw error;

      const reply = (data as { reply?: string } | null)?.reply ||
        'Sorry, I had a problem replying. Please try again, or reach us on WhatsApp.';

      setMessages((previous) => [...previous, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('ai-chat failed:', err);
      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble right now. Please try again shortly, or contact us on WhatsApp.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([GREETING]);
    setInput('');
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={openChat}
          className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Open Zimmy chat assistant"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-[60] flex h-[72vh] max-h-[600px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl sm:bottom-6 sm:right-6">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold leading-tight">Zimmy</p>
                <p className="text-[11px] leading-tight opacity-80">Zimbabwe Shipping AI assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={resetChat} aria-label="Reset chat" className="rounded p-1 hover:bg-white/15">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} aria-label="Close chat" className="rounded p-1 hover:bg-white/15">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'rounded-br-sm bg-primary text-primary-foreground'
                      : 'rounded-bl-sm border border-border bg-background text-foreground'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {messages.length === 1 && !loading && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="min-h-9 rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-border bg-background px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border bg-background p-2">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Type your question..."
              className="h-10 flex-1 rounded-full border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
