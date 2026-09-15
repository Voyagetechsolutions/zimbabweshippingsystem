import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  SLOT_WINDOWS, hhmm, normaliseTime, overridesCustomer, requestedLabel, windowLabel, windowProblem,
  type CollectionSlot, type WindowPick,
} from '@/lib/dispatchCore';

// Small pieces shared by the Runs screens.

export function StatusPill({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold', className)}>
      {label}
    </span>
  );
}

export function StatCard({ label, value, icon, tone = 'text-emerald-700' }: {
  label: string; value: ReactNode; icon: ReactNode; tone?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn('shrink-0', tone)}>{icon}</span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Reload when any of these tables change.
 *
 * One channel per table: a table missing from the realtime publication must
 * not take the others down with it. Bursts (a run of stop updates) collapse
 * into a single reload.
 */
export function useLiveReload(key: string, tables: Array<{ table: string; filter?: string }>, reload: () => void) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const spec = JSON.stringify(tables);
  useEffect(() => {
    let timer: number | undefined;
    const fire = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => reloadRef.current(), 400);
    };
    const stamp = Date.now();
    const channels = (JSON.parse(spec) as Array<{ table: string; filter?: string }>).map(({ table, filter }) =>
      supabase.channel(`${key}-${table}-${stamp}`)
        .on('postgres_changes' as any, { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) } as any, fire)
        .subscribe());
    return () => {
      window.clearTimeout(timer);
      channels.forEach((channel) => { void supabase.removeChannel(channel); });
    };
  }, [key, spec]);
}

/** A collection window: typed times, the two-hour slots, and the customer's own choice starred. */
export function WindowFields({ value, onChange, slot }: {
  value: WindowPick;
  onChange: (next: WindowPick) => void;
  slot?: CollectionSlot | null;
}) {
  const problem = windowProblem(value.from, value.to);
  const asked = Boolean(slot?.requested_at && !slot.requested_flexible);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Collect</span>
        <Input
          aria-label="Window start" value={value.from} maxLength={5} placeholder="09:00"
          className="h-8 w-20 text-center font-semibold" onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          aria-label="Window end" value={value.to} maxLength={5} placeholder="11:00"
          className="h-8 w-20 text-center font-semibold" onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
        {value.from || value.to ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange({ from: '', to: '' })}>
            Clear
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {SLOT_WINDOWS.map((w) => {
          const active = normaliseTime(value.from) === w.start && normaliseTime(value.to) === w.end;
          const theirs = asked && hhmm(slot!.requested_start) === w.start && hhmm(slot!.requested_end) === w.end;
          return (
            <button
              key={w.start}
              type="button"
              onClick={() => onChange({ from: w.start, to: w.end })}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                active
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : theirs
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-gray-200 text-muted-foreground hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800',
              )}
            >
              {theirs ? '★ ' : ''}{windowLabel(w.start, w.end)}
            </button>
          );
        })}
      </div>
      {problem ? <p className="text-xs text-red-600">{problem}</p> : null}
      {!problem && overridesCustomer(slot, value.from, value.to) ? (
        <p className="flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Moves the customer off {requestedLabel(slot)}. They are notified in the app — you still owe them a WhatsApp or a call.
        </p>
      ) : null}
    </div>
  );
}
