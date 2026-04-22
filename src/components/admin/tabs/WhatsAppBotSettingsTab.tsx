import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, RefreshCcw, MessageSquare } from 'lucide-react';

interface BotSetting {
  key: string;
  value: number;
  label: string;
  description: string;
}

const SETTING_GROUPS = [
  {
    title: 'Drum Pricing (€ per drum)',
    description: 'Prices charged per drum based on quantity booked',
    keys: ['drum_price_1', 'drum_price_2_4', 'drum_price_5_plus'],
  },
  {
    title: 'Box / Trunk Pricing (€ per box)',
    description: 'Prices charged per box/trunk based on quantity booked',
    keys: ['box_price_1', 'box_price_2_4', 'box_price_5_plus'],
  },
  {
    title: 'Additional Services',
    description: 'Add-on charges applied during booking',
    keys: ['seal_price', 'door_to_door_price'],
  },
];

const WhatsAppBotSettingsTab = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, BotSetting>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bot_settings')
        .select('key, value, label, description');

      if (error) throw error;

      const map: Record<string, BotSetting> = {};
      for (const row of data || []) {
        map[row.key] = row as BotSetting;
      }
      setSettings(map);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to load bot settings', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, raw: string) => {
    const value = parseFloat(raw);
    if (isNaN(value)) return;
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value },
    }));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const rows = Object.values(settings).map(s => ({
        key: s.key,
        value: s.value,
        label: s.label,
        description: s.description,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('bot_settings')
        .upsert(rows, { onConflict: 'key' });

      if (error) throw error;

      toast({ title: 'Saved', description: 'Bot settings updated successfully.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-zim-green" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-zim-green" />
            <CardTitle>WhatsApp Bot Settings</CardTitle>
          </div>
          <CardDescription>
            Manage pricing and configuration for the WhatsApp booking bot. Changes take effect within 5 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {SETTING_GROUPS.map(group => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-foreground mb-1">{group.title}</h3>
              <p className="text-xs text-muted-foreground mb-4">{group.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.keys.map(key => {
                  const s = settings[key];
                  if (!s) return null;
                  return (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={key}>{s.label}</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                        <Input
                          id={key}
                          type="number"
                          min={0}
                          step={1}
                          value={s.value}
                          onChange={e => handleChange(key, e.target.value)}
                          className="pl-7"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                  );
                })}
              </div>
              <Separator className="mt-6" />
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={fetchSettings} disabled={loading || saving}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={saveAll} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Pricing Preview</CardTitle>
          <CardDescription>How the current prices appear to customers in the bot</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="font-medium mb-2">🥁 Drum Shipping</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>1 drum — €{settings['drum_price_1']?.value ?? '—'} per drum</li>
                <li>2–4 drums — €{settings['drum_price_2_4']?.value ?? '—'} per drum</li>
                <li>5+ drums — €{settings['drum_price_5_plus']?.value ?? '—'} per drum</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">📦 Box / Trunk Shipping</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>1 box — €{settings['box_price_1']?.value ?? '—'} per box</li>
                <li>2–4 boxes — €{settings['box_price_2_4']?.value ?? '—'} per box</li>
                <li>5+ boxes — €{settings['box_price_5_plus']?.value ?? '—'} per box</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-2">➕ Add-ons</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>🔒 Metal seal — €{settings['seal_price']?.value ?? '—'} per item</li>
                <li>🚪 Door-to-door — €{settings['door_to_door_price']?.value ?? '—'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppBotSettingsTab;
