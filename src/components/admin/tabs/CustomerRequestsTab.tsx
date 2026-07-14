import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock3, ExternalLink, MessageCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type RequestStatus = 'New' | 'Contacted' | 'Resolved';
type CustomerRequest = {
  id: string;
  shipment_id: string | null;
  customer_name: string | null;
  whatsapp_number: string;
  request_type: string;
  message: string | null;
  customer_reference: string | null;
  status: RequestStatus;
  unread: boolean;
  created_at: string;
};

const statusStyles: Record<RequestStatus, string> = {
  New: 'bg-red-100 text-red-700',
  Contacted: 'bg-amber-100 text-amber-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
};

export default function CustomerRequestsTab({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'All' | RequestStatus>('All');
  const db = supabase as any;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db.from('customer_requests').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Could not load customer requests', description: error.message, variant: 'destructive' });
    const rows = (data || []) as CustomerRequest[];
    setRequests(rows);
    onUnreadChange?.(rows.filter((row) => row.unread).length);
    setLoading(false);
  }, [db, onUnreadChange, toast]);

  useEffect(() => {
    load();
    const channel = db.channel('customer-requests-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_requests' }, load)
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [db, load]);

  const updateStatus = async (request: CustomerRequest, status: RequestStatus) => {
    const resolved = status === 'Resolved';
    const { error } = await db.from('customer_requests').update({
      status,
      unread: false,
      handled_at: resolved ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', request.id);
    if (error) return toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    toast({ title: status === 'Resolved' ? 'Request resolved' : 'Customer marked as contacted' });
    load();
  };

  const visible = useMemo(() => filter === 'All' ? requests : requests.filter((r) => r.status === filter), [filter, requests]);
  const phoneLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Customer Requests</h2>
          <p className="text-sm text-muted-foreground">Live requests created by Zimmy, bookings and custom quotes.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['All', 'New', 'Contacted', 'Resolved'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} aria-label="Refresh requests"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? <div className="py-12 text-center text-muted-foreground">Loading requests…</div> : visible.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No customer requests in this view.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((request) => (
            <Card key={request.id} className={request.unread ? 'border-emerald-500 shadow-sm' : ''}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {request.unread && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}
                      {request.customer_name || 'WhatsApp customer'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{request.whatsapp_number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{request.request_type}</Badge>
                    <Badge className={statusStyles[request.status]}>{request.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {request.message && <p className="text-sm rounded-md bg-muted p-3">{request.message}</p>}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{new Date(request.created_at).toLocaleString()}</span>
                  {request.customer_reference && <span>Ref: <strong>{request.customer_reference}</strong></span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <a href={phoneLink(request.whatsapp_number)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 mr-2" />Open WhatsApp</a>
                  </Button>
                  {request.status === 'New' && <Button size="sm" variant="outline" onClick={() => updateStatus(request, 'Contacted')}><ExternalLink className="h-4 w-4 mr-2" />Mark contacted</Button>}
                  {request.status !== 'Resolved' && <Button size="sm" variant="outline" onClick={() => updateStatus(request, 'Resolved')}><CheckCircle2 className="h-4 w-4 mr-2" />Mark as handled</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
