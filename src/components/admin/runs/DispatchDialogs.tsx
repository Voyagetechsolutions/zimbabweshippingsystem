import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, ChevronRight, Loader2, Search } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Dialogs shared by the Runs screens. Confirmation goes through these rather
// than window.confirm, which embedded browsers and pop-up blockers can swallow
// silently — the same failure that once stopped drivers clocking in.

export type PickerDriver = { id: string; name: string; meta?: string; current?: boolean };

export function DriverPickerDialog({ open, onOpenChange, title, description, drivers, busy, loading, onPick, header, footer }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  drivers: PickerDriver[];
  busy?: boolean;
  loading?: boolean;
  onPick: (driver: PickerDriver) => void;
  header?: ReactNode;
  footer?: ReactNode;
}) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (!open) setQuery(''); }, [open]);
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return text ? drivers.filter((d) => `${d.name} ${d.meta || ''}`.toLowerCase().includes(text)) : drivers;
  }, [drivers, query]);

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {header}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a driver" />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-1 divide-y">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" /></div>
          ) : visible.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No drivers match.</p>
          ) : visible.map((driver) => (
            <button
              key={driver.id}
              type="button"
              disabled={busy}
              onClick={() => onPick(driver)}
              className="flex w-full items-center gap-3 px-2 py-2.5 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                {driver.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{driver.name}</span>
                {driver.meta ? <span className="block truncate text-xs text-muted-foreground">{driver.meta}</span> : null}
              </span>
              {driver.current
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          ))}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {footer}
          <Button variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{busy ? 'Working…' : 'Cancel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel = 'Cancel', destructive, busy, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild><div className="text-sm text-muted-foreground">{description}</div></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{cancelLabel}</AlertDialogCancel>
          {/* A plain button, not AlertDialogAction: the action closes the dialog
              before an async confirm has finished or failed. */}
          <Button
            variant={destructive ? 'destructive' : 'default'}
            className={destructive ? undefined : 'bg-emerald-600 hover:bg-emerald-700'}
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
