import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sparkles, CheckCircle2, Trash2, Loader2, AlertCircle, CalendarClock, Globe,
} from 'lucide-react';

/**
 * Generate → review → approve for collection schedules.
 *
 * The website, both mobile apps and the WhatsApp/AI bot all read
 * `collection_schedules` directly, so a row written there is immediately public.
 * Generated dates are therefore inserted unapproved and stay invisible to
 * customers until an admin approves them here — approving is the publish step.
 */

interface Draft {
  id: string;
  route: string;
  pickup_date: string;
  country: string | null;
  areas: string[] | null;
  generated_at: string | null;
}

interface Props {
  /** Lets the parent schedule tab refresh its own list after a publish. */
  onPublished?: () => void;
}

const ScheduleGenerateApprove: React.FC<Props> = ({ onPublished }) => {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | 'generate' | 'approve' | 'discard'>(null);
  const [intervalDays, setIntervalDays] = useState('28');
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('collection_schedules')
      .select('id, route, pickup_date, country, areas, generated_at')
      .eq('approved' as never, false as never)
      .order('route', { ascending: true });

    if (error) {
      // Before the migration is applied there is no `approved` column at all.
      const missing = /approved|column/i.test(error.message);
      setUnavailable(missing
        ? 'The generate/approve migration has not been applied yet, so there is nothing to review. Existing schedules are unaffected and stay published.'
        : error.message);
      setDrafts([]);
      return;
    }
    setUnavailable(null);
    const rows = (data || []) as unknown as Draft[];
    setDrafts(rows);
    setSelected(new Set(rows.map((row) => row.id)));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const generate = async () => {
    const days = Number(intervalDays);
    if (!Number.isFinite(days) || days < 1 || days > 120) {
      toast({ title: 'Check the interval', description: 'Enter a cycle length between 1 and 120 days.', variant: 'destructive' });
      return;
    }
    setBusy('generate');
    try {
      const { data, error } = await (supabase.rpc as any)('generate_collection_schedules', {
        p_interval_days: days,
        p_from_date: null,
      });
      if (error) throw error;
      const created = Number((data as any)?.created || 0);
      const skipped = Number((data as any)?.skipped || 0);
      toast({
        title: created > 0 ? `${created} date${created === 1 ? '' : 's'} proposed` : 'Nothing new to propose',
        description: created > 0
          ? 'Review them below, then approve to publish to the website, apps and the bot.'
          : skipped > 0
            ? `${skipped} route${skipped === 1 ? '' : 's'} already have a draft waiting for approval.`
            : 'No approved routes were found to base new dates on.',
      });
      await load();
    } catch (e: any) {
      toast({ title: 'Could not generate', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const approve = async () => {
    if (selected.size === 0) return;
    setBusy('approve');
    try {
      const { data, error } = await (supabase.rpc as any)('approve_collection_schedules', {
        p_ids: [...selected],
      });
      if (error) throw error;
      const count = Number((data as any)?.approved || 0);
      toast({
        title: `${count} schedule${count === 1 ? '' : 's'} published`,
        description: 'Live now on the website, in the customer and staff apps, and to the WhatsApp assistant.',
      });
      await load();
      onPublished?.();
    } catch (e: any) {
      toast({ title: 'Could not approve', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const discard = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Discard ${selected.size} proposed date${selected.size === 1 ? '' : 's'}? The currently published dates are not affected.`)) return;
    setBusy('discard');
    try {
      const { error } = await (supabase.rpc as any)('discard_collection_schedule_drafts', { p_ids: [...selected] });
      if (error) throw error;
      toast({ title: 'Drafts discarded' });
      await load();
    } catch (e: any) {
      toast({ title: 'Could not discard', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const toggle = (id: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const allSelected = drafts.length > 0 && selected.size === drafts.length;

  return (
    <Card className="mb-4 border-zim-green/40">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-zim-green" />
              Generate next collection dates
            </CardTitle>
            <CardDescription>
              Proposes the next date for every route, then publishes on approval. Nothing reaches
              customers until you approve.
            </CardDescription>
          </div>
          <div className="flex items-end gap-2 shrink-0">
            <div>
              <Label htmlFor="cycle-days" className="text-xs">Cycle (days)</Label>
              <Input
                id="cycle-days"
                type="number"
                min={1}
                max={120}
                value={intervalDays}
                onChange={(event) => setIntervalDays(event.target.value)}
                className="w-24 mt-1"
              />
            </div>
            <Button
              className="bg-zim-green hover:bg-zim-green/90"
              onClick={generate}
              disabled={busy !== null || Boolean(unavailable)}
            >
              {busy === 'generate'
                ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                : <Sparkles className="h-4 w-4 mr-1.5" />}
              Generate schedule
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {unavailable ? (
          <div className="flex items-start gap-2 text-sm rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>{unavailable}</p>
          </div>
        ) : loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking for proposed dates…
          </div>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
            No dates are awaiting approval. Everything currently listed below is already published.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => setSelected(allSelected ? new Set() : new Set(drafts.map((d) => d.id)))}
                />
                <span>
                  {selected.size} of {drafts.length} selected
                </span>
              </label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={discard} disabled={busy !== null || selected.size === 0}>
                  {busy === 'discard'
                    ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    : <Trash2 className="h-4 w-4 mr-1.5" />}
                  Discard
                </Button>
                <Button
                  size="sm"
                  className="bg-zim-green hover:bg-zim-green/90"
                  onClick={approve}
                  disabled={busy !== null || selected.size === 0}
                >
                  {busy === 'approve'
                    ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                  Approve &amp; publish
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {drafts.map((draft) => (
                <label
                  key={draft.id}
                  className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
                >
                  <Checkbox checked={selected.has(draft.id)} onCheckedChange={() => toggle(draft.id)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{draft.route}</span>
                      <Badge variant="outline" className="text-xs">{draft.country || 'England'}</Badge>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">awaiting approval</Badge>
                    </div>
                    {Array.isArray(draft.areas) && draft.areas.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {draft.areas.slice(0, 5).join(', ')}
                        {draft.areas.length > 5 ? ` +${draft.areas.length - 5} more` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{draft.pickup_date}</p>
                    <p className="text-xs text-gray-500">proposed</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-start gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
              <Globe className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <p>
                Approving replaces each route's previous date and publishes immediately to the public
                collection schedule page, the customer app, the staff app and the WhatsApp assistant —
                they all read the same table.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ScheduleGenerateApprove;
