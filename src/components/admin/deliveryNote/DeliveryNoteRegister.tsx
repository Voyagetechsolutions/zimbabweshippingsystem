import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { listRegister, type RegisterEntry } from '@/lib/deliveryNote/ledger';

// The register of issued delivery notes.
//
// It exists first as the duplicate check the generator runs before writing a
// file, but it is also the queryable record the business never had — what went
// out, to whom, under which invoice, and whether it left unpaid.

interface Props {
  /** Changing this reloads the list, e.g. after a note is issued. */
  refreshKey?: number;
}

const DeliveryNoteRegister: React.FC<Props> = ({ refreshKey = 0 }) => {
  const [entries, setEntries] = useState<RegisterEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (term: string) => {
    setLoading(true);
    setError('');
    try {
      setEntries(await listRegister(term));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the register.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(''); }, [load, refreshKey]);

  // Typing filters server-side, debounced so a search does not fire per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => load(search), 350);
    return () => window.clearTimeout(timer);
  }, [search, load]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-base">Delivery note register</CardTitle>
            <CardDescription className="text-xs">
              Every note issued from a source invoice. Checked automatically before a new note is generated.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => load(search)} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by reference, invoice #, shipper or recipient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {search ? 'Nothing matches that search.' : 'No notes issued yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Shipper</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs font-medium whitespace-nowrap">
                      {entry.reference}
                      {entry.load_suffix && (
                        <Badge variant="outline" className="ml-1.5 text-[10px]">load {entry.load_suffix}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{entry.invoice_number}</TableCell>
                    <TableCell className="text-xs">{entry.shipper_name || '—'}</TableCell>
                    <TableCell className="text-xs">{entry.recipient_name || '—'}</TableCell>
                    <TableCell className="text-xs">{entry.recipient_city || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {entry.unpaid_hold ? (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Unpaid — hold</Badge>
                      ) : entry.paid ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Paid</Badge>
                      ) : (
                        <Badge variant="outline">Unstamped</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {format(new Date(entry.created_at), 'dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryNoteRegister;
