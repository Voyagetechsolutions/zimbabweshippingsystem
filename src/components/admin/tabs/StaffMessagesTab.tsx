import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, MessageSquare, RefreshCcw, Send, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import TabHeader from '../TabHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type StaffProfile = { id: string; full_name: string | null; email: string | null };
type StaffMessage = { id: string; sender_id: string; recipient_id: string | null; audience_role: string; subject: string | null; body: string; priority: string; read_at: string | null; created_at: string };

export default function StaffMessagesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [drivers, setDrivers] = useState<StaffProfile[]>([]);
  const [recipient, setRecipient] = useState('all');
  const [subject, setSubject] = useState('Dispatch update');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const db = supabase as any;
    const [messageResult, driverResult] = await Promise.all([
      db.from('staff_messages').select('id,sender_id,recipient_id,audience_role,subject,body,priority,read_at,created_at').order('created_at', { ascending: false }).limit(100),
      db.from('profiles').select('id,full_name,email').eq('role', 'driver').order('full_name'),
    ]);
    setLoading(false);
    if (messageResult.error) toast({ title: 'Could not load staff messages', description: messageResult.error.message, variant: 'destructive' });
    else setMessages(messageResult.data || []);
    if (!driverResult.error) setDrivers(driverResult.data || []);
  }, [toast]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel(`website-staff-messages-${Date.now()}`).on('postgres_changes', { event: '*', schema: 'public', table: 'staff_messages' }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const profileById = useMemo(() => new Map(drivers.map((driver) => [driver.id, driver])), [drivers]);
  const send = async () => {
    if (!user?.id || !body.trim()) return;
    setSending(true);
    const { error } = await (supabase as any).from('staff_messages').insert({
      sender_id: user.id,
      recipient_id: recipient === 'all' ? null : recipient,
      audience_role: 'driver',
      subject: subject.trim() || 'Dispatch update',
      body: body.trim(),
      priority,
    });
    setSending(false);
    if (error) { toast({ title: 'Message was not sent', description: error.message, variant: 'destructive' }); return; }
    setBody('');
    toast({ title: recipient === 'all' ? 'Announcement sent' : 'Message sent', description: recipient === 'all' ? 'Every active driver can see it in the staff app.' : 'The driver can see it in Messages.' });
    void load();
  };

  return (
    <div className="space-y-5">
      <TabHeader title="Staff Messages" description="Send dispatch instructions and read driver replies from the shared staff inbox." actions={<Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>} />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-emerald-700" />New message</CardTitle><CardDescription>Send to every driver or choose one person.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Recipient</Label><Select value={recipient} onValueChange={setRecipient}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all"><span className="flex items-center gap-2"><Users className="h-4 w-4" />All drivers</span></SelectItem>{drivers.map((driver) => <SelectItem key={driver.id} value={driver.id}>{driver.full_name || driver.email || 'Driver'}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label htmlFor="staff-message-subject">Subject</Label><Input id="staff-message-subject" value={subject} maxLength={120} onChange={(event) => setSubject(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="staff-message-body">Message</Label><Textarea id="staff-message-body" value={body} maxLength={2000} rows={7} placeholder="Route change, collection instruction or reply…" onChange={(event) => setBody(event.target.value)} /></div>
            <div className="space-y-2"><Label>Priority</Label><Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select></div>
            <Button className="w-full bg-emerald-700 hover:bg-emerald-800" onClick={() => void send()} disabled={!body.trim() || sending}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send message</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-emerald-700" />Latest activity</CardTitle><CardDescription>Driver replies and dispatch messages update in real time.</CardDescription></CardHeader>
          <CardContent>
            {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : messages.length === 0 ? <div className="rounded-xl border border-dashed py-14 text-center text-muted-foreground">No staff messages yet.</div> : (
              <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                {messages.map((message) => {
                  const outgoing = message.sender_id === user?.id;
                  const other = profileById.get(outgoing ? message.recipient_id || '' : message.sender_id);
                  const audience = outgoing ? (message.recipient_id ? other?.full_name || other?.email || 'Driver' : 'All drivers') : other?.full_name || other?.email || 'Driver';
                  return <div key={message.id} className={`rounded-xl border p-4 ${message.priority === 'urgent' ? 'border-red-200 bg-red-50' : 'bg-white'}`}><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{message.subject || (outgoing ? 'Dispatch message' : 'Driver message')}</p>{message.priority === 'urgent' ? <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Urgent</Badge> : null}</div><p className="mt-1 text-xs text-muted-foreground">{outgoing ? `To ${audience}` : `From ${audience}`} · {new Date(message.created_at).toLocaleString('en-GB')}</p></div>{message.recipient_id && !message.read_at ? <Badge variant="outline">Unread</Badge> : null}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p></div>;
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
