import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TabHeader from '../TabHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Save, RefreshCcw, MessageSquare, DollarSign, Info } from 'lucide-react';

interface BotSetting {
  key: string;
  value: number;
  label: string;
  description: string;
}

interface BotMessage {
  key: string;
  label: string;
  message: string;
  description: string;
}

const SETTING_GROUPS = [
  {
    title: 'Drum Pricing (€ per drum)',
    description: 'Price per drum based on quantity booked',
    keys: ['drum_price_1', 'drum_price_2_4', 'drum_price_5_plus'],
  },
  {
    title: 'Box / Trunk Pricing (€ per box)',
    description: 'Price per box/trunk based on quantity booked',
    keys: ['box_price_1', 'box_price_2_4', 'box_price_5_plus'],
  },
  {
    title: 'Additional Services',
    description: 'Add-on charges during booking',
    keys: ['seal_price', 'door_to_door_price'],
  },
];

const WhatsAppBotSettingsTab = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, BotSetting>>({});
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMessages, setSavingMessages] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchMessages();
  }, []);

  const fetchSettings = async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase.from('bot_settings').select('key, value, label, description');
      if (error) throw error;
      const map: Record<string, BotSetting> = {};
      const rows = (data ?? []) as unknown as BotSetting[];
      for (const row of rows) map[row.key] = row;
      setSettings(map);
    } catch {
      toast({ title: 'Error', description: 'Failed to load pricing settings', variant: 'destructive' });
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('bot_messages')
        .select('key, label, message, description')
        .order('key');
      if (error) throw error;
      setMessages((data ?? []) as unknown as BotMessage[]);
    } catch {
      toast({ title: 'Error', description: 'Failed to load bot messages', variant: 'destructive' });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSettingChange = (key: string, raw: string) => {
    const value = parseFloat(raw);
    if (isNaN(value)) return;
    setSettings(prev => ({ ...prev, [key]: { ...prev[key], value } }));
  };

  const handleMessageChange = (key: string, message: string) => {
    setMessages(prev => prev.map(m => m.key === key ? { ...m, message } : m));
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const rows = (Object.values(settings) as BotSetting[]).map(s => ({
        key: s.key, value: s.value, label: s.label,
        description: s.description, updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('bot_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      toast({ title: 'Saved', description: 'Pricing settings updated. Bot picks up changes within 5 minutes.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const saveMessages = async () => {
    setSavingMessages(true);
    try {
      const rows = messages.map(m => ({
        key: m.key, label: m.label, message: m.message,
        description: m.description, updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('bot_messages').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      toast({ title: 'Saved', description: 'Bot messages updated. Changes take effect within 5 minutes.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to save messages', variant: 'destructive' });
    } finally {
      setSavingMessages(false);
    }
  };

  return (
    <div className="space-y-4">
      <TabHeader
        title="WhatsApp Bot Settings"
        description="Manage all pricing and messages sent by the WhatsApp booking bot. Changes take effect within 5 minutes."
      />

      <Tabs defaultValue="pricing">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="pricing" className="flex items-center gap-1.5">
            <DollarSign className="h-4 w-4" /> Pricing
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4" /> Messages
          </TabsTrigger>
        </TabsList>

        {/* ── PRICING TAB ── */}
        <TabsContent value="pricing" className="space-y-6 mt-4">
          {loadingSettings ? (
            <div className="flex justify-center p-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green" />
            </div>
          ) : (
            <>
              {SETTING_GROUPS.map(group => (
                <Card key={group.title}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">{group.title}</CardTitle>
                    <CardDescription className="text-xs">{group.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.keys.map(key => {
                        const s = settings[key];
                        if (!s) return null;
                        return (
                          <div key={key} className="space-y-1.5">
                            <Label htmlFor={key} className="text-xs font-medium">{s.label}</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                              <Input
                                id={key} type="number" min={0} step={1}
                                value={s.value}
                                onChange={e => handleSettingChange(key, e.target.value)}
                                className="pl-7"
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pricing preview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Live Preview</CardTitle>
                  <CardDescription className="text-xs">How prices appear to customers in the bot</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium mb-1.5">🥁 Drums</p>
                      <ul className="space-y-0.5 text-muted-foreground text-xs">
                        <li>1 drum — €{settings['drum_price_1']?.value ?? '—'}/drum</li>
                        <li>2–4 drums — €{settings['drum_price_2_4']?.value ?? '—'}/drum</li>
                        <li>5+ drums — €{settings['drum_price_5_plus']?.value ?? '—'}/drum</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium mb-1.5">📦 Boxes</p>
                      <ul className="space-y-0.5 text-muted-foreground text-xs">
                        <li>1 box — €{settings['box_price_1']?.value ?? '—'}/box</li>
                        <li>2–4 boxes — €{settings['box_price_2_4']?.value ?? '—'}/box</li>
                        <li>5+ boxes — €{settings['box_price_5_plus']?.value ?? '—'}/box</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium mb-1.5">➕ Add-ons</p>
                      <ul className="space-y-0.5 text-muted-foreground text-xs">
                        <li>🔒 Metal seal — €{settings['seal_price']?.value ?? '—'} per item</li>
                        <li>🚪 Door-to-door — €{settings['door_to_door_price']?.value ?? '—'}</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={fetchSettings} disabled={loadingSettings}>
                  <RefreshCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
                <Button onClick={saveSettings} disabled={savingSettings}>
                  <Save className="h-4 w-4 mr-2" />
                  {savingSettings ? 'Saving…' : 'Save Pricing'}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── MESSAGES TAB ── */}
        <TabsContent value="messages" className="space-y-4 mt-4">
          {loadingMessages ? (
            <div className="flex justify-center p-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zim-green" />
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Use <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{tracking_number}'}</code>,{' '}
                  <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{status}'}</code>,{' '}
                  <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{'{email}'}</code> as dynamic placeholders where applicable.
                  WhatsApp formatting: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">*bold*</code>{' '}
                  <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">_italic_</code>
                </span>
              </div>

              <div className="space-y-4">
                {messages.map(msg => (
                  <Card key={msg.key}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-semibold">{msg.label}</CardTitle>
                        <Badge variant="outline" className="text-xs font-mono"><span>{msg.key}</span></Badge>
                      </div>
                      {msg.description && (
                        <CardDescription className="text-xs">{msg.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={msg.message}
                        onChange={e => handleMessageChange(msg.key, e.target.value)}
                        rows={Math.min(10, msg.message.split('\n').length + 2)}
                        className="font-mono text-xs resize-y"
                        placeholder="Enter message text..."
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={fetchMessages} disabled={loadingMessages}>
                  <RefreshCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
                <Button onClick={saveMessages} disabled={savingMessages}>
                  <Save className="h-4 w-4 mr-2" />
                  {savingMessages ? 'Saving…' : 'Save Messages'}
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppBotSettingsTab;
