import React, { useCallback, useEffect, useState } from 'react';
import TabHeader from '../TabHeader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Store, Plus, RefreshCcw, Loader2, AlertCircle, Trash2, MapPin,
} from 'lucide-react';

/**
 * Collection Points — the Zimbabwe depots offered for free self-collection.
 *
 * Self-collection is the free alternative to door-to-door delivery, so whatever
 * is entered here is shown to customers at booking and printed on their receipt.
 * Door-to-door pricing is unrelated and unaffected.
 */

interface Depot {
  id: string;
  name: string;
  city: string;
  address_line1: string;
  address_line2: string | null;
  province: string | null;
  country: string;
  phone: string | null;
  opening_hours: string | null;
  notes: string | null;
  active: boolean;
  sort_order: number;
}

type DepotForm = Omit<Depot, 'id'>;

const BLANK: DepotForm = {
  name: '',
  city: '',
  address_line1: '',
  address_line2: '',
  province: '',
  country: 'Zimbabwe',
  phone: '',
  opening_hours: '',
  notes: '',
  active: true,
  sort_order: 0,
};

// The seeded Bulawayo row ships with this placeholder so booking has something
// to offer on day one. It must be replaced before customers are sent there.
const PLACEHOLDER_ADDRESS = 'Address to be confirmed';

const CollectionPointsTab: React.FC = () => {
  const { toast } = useToast();
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string | null; values: DepotForm } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: queryError } = await supabase
      .from('delivery_depots' as any)
      .select('*')
      .order('sort_order', { ascending: true });
    if (queryError) {
      setError(queryError.message);
      return;
    }
    setDepots((data || []) as unknown as Depot[]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    const values = editing.values;
    if (!values.name.trim() || !values.city.trim() || !values.address_line1.trim()) {
      toast({
        title: 'Missing details',
        description: 'A collection point needs at least a name, city and street address.',
        variant: 'destructive',
      });
      return;
    }

    setBusy(true);
    try {
      const record = {
        name: values.name.trim(),
        city: values.city.trim(),
        address_line1: values.address_line1.trim(),
        address_line2: values.address_line2?.trim() || null,
        province: values.province?.trim() || null,
        country: values.country.trim() || 'Zimbabwe',
        phone: values.phone?.trim() || null,
        opening_hours: values.opening_hours?.trim() || null,
        notes: values.notes?.trim() || null,
        active: values.active,
        sort_order: Number(values.sort_order) || 0,
        updated_at: new Date().toISOString(),
      };

      const { error: writeError } = editing.id
        ? await supabase.from('delivery_depots' as any).update(record).eq('id', editing.id)
        : await supabase.from('delivery_depots' as any).insert(record);
      if (writeError) throw writeError;

      toast({
        title: editing.id ? 'Collection point updated' : 'Collection point added',
        description: `${record.name} — ${record.city}`,
      });
      setEditing(null);
      await load();
    } catch (e: any) {
      toast({ title: 'Could not save', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (depot: Depot) => {
    setBusy(true);
    try {
      const { error: writeError } = await supabase
        .from('delivery_depots' as any)
        .update({ active: !depot.active, updated_at: new Date().toISOString() })
        .eq('id', depot.id);
      if (writeError) throw writeError;
      await load();
    } catch (e: any) {
      toast({ title: 'Could not update', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (depot: Depot) => {
    // Deactivating is almost always what's wanted — past bookings reference the
    // depot, so deleting one loses the record of where goods were sent.
    const confirmed = window.confirm(
      `Delete “${depot.name}”?\n\nBookings that chose this collection point keep a copy of its details, but it will disappear from the list customers pick from. Deactivating it instead is usually safer.`,
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      const { error: deleteError } = await supabase.from('delivery_depots' as any).delete().eq('id', depot.id);
      if (deleteError) throw deleteError;
      toast({ title: 'Collection point deleted', description: depot.name });
      await load();
    } catch (e: any) {
      toast({ title: 'Could not delete', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const needsAttention = depots.filter((depot) => depot.address_line1 === PLACEHOLDER_ADDRESS && depot.active);

  const field = (key: keyof DepotForm, label: string, extra?: { placeholder?: string; type?: string }) => (
    <div>
      <Label htmlFor={`depot-${key}`}>{label}</Label>
      <Input
        id={`depot-${key}`}
        type={extra?.type || 'text'}
        placeholder={extra?.placeholder}
        value={String(editing?.values[key] ?? '')}
        onChange={(event) => setEditing((current) => current && ({
          ...current,
          values: { ...current.values, [key]: event.target.value },
        }))}
      />
    </div>
  );

  return (
    <div>
      <TabHeader
        title="Collection Points"
        description="Zimbabwe depots offered for free self-collection at booking."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading || busy}>
              <RefreshCcw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              className="bg-zim-green hover:bg-zim-green/90"
              onClick={() => setEditing({ id: null, values: { ...BLANK, sort_order: depots.length + 1 } })}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add collection point
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-4 flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Could not load collection points</p>
              <p className="text-xs mt-0.5">{error}</p>
              <p className="text-xs mt-1">
                If this says the table does not exist, the self-collection migration has not been applied yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {needsAttention.length > 0 && (
        <Card className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-4 flex items-start gap-2 text-sm text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                {needsAttention.length === 1 ? 'A collection point still has a placeholder address' : `${needsAttention.length} collection points still have placeholder addresses`}
              </p>
              <p className="text-xs mt-0.5">
                {needsAttention.map((depot) => depot.name).join(', ')} — customers are being offered this at booking.
                Set the real street address and opening hours before pointing anyone there.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading collection points…
            </div>
          ) : depots.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Store className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-gray-600 dark:text-gray-300">No collection points yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Until one is added, customers choosing self-collection are told we'll confirm their
                nearest point after booking.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="hidden md:table-cell">Opening hours</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead>Offered</TableHead>
                    <TableHead className="text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depots.map((depot) => (
                    <TableRow key={depot.id}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-zim-green" />
                          {depot.name}
                        </div>
                        <div className="text-xs text-gray-500">{depot.city}{depot.province ? `, ${depot.province}` : ''}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {[depot.address_line1, depot.address_line2].filter(Boolean).join(', ')}
                        {depot.address_line1 === PLACEHOLDER_ADDRESS && (
                          <Badge className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-100">placeholder</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{depot.opening_hours || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">{depot.phone || '—'}</TableCell>
                      <TableCell>
                        <Switch
                          checked={depot.active}
                          disabled={busy}
                          onCheckedChange={() => toggleActive(depot)}
                          aria-label={`${depot.active ? 'Stop offering' : 'Offer'} ${depot.name}`}
                        />
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditing({ id: depot.id, values: { ...depot } })}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 ml-1"
                          disabled={busy}
                          onClick={() => remove(depot)}
                          aria-label={`Delete ${depot.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit collection point' : 'Add collection point'}</DialogTitle>
            <DialogDescription>
              Customers see this when they choose free self-collection, and it appears on their receipt.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-3">
              {field('name', 'Name', { placeholder: 'Bulawayo Depot' })}
              <div className="grid grid-cols-2 gap-3">
                {field('city', 'City', { placeholder: 'Bulawayo' })}
                {field('province', 'Province (optional)', { placeholder: 'Bulawayo' })}
              </div>
              {field('address_line1', 'Street address', { placeholder: '12 Fife Street' })}
              {field('address_line2', 'Address line 2 (optional)', { placeholder: 'Unit 4, Belmont Industrial' })}
              <div className="grid grid-cols-2 gap-3">
                {field('phone', 'Phone (optional)', { placeholder: '+263 …' })}
                {field('sort_order', 'Order in list', { type: 'number' })}
              </div>
              {field('opening_hours', 'Opening hours', { placeholder: 'Mon–Fri 09:00–17:00, Sat 09:00–13:00' })}
              {field('notes', 'Internal notes (optional)', { placeholder: 'Not shown to customers' })}

              <div className="flex items-center gap-2 pt-1">
                <Switch
                  id="depot-active"
                  checked={editing.values.active}
                  onCheckedChange={(checked) => setEditing((current) => current && ({
                    ...current,
                    values: { ...current.values, active: checked },
                  }))}
                />
                <Label htmlFor="depot-active" className="cursor-pointer">
                  Offer this collection point to customers at booking
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
            <Button className="bg-zim-green hover:bg-zim-green/90" onClick={save} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectionPointsTab;
