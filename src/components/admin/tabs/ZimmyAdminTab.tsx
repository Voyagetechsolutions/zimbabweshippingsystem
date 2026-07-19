import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  EyeOff,
  Loader2,
  MessageSquare,
  Package,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  ThumbsUp,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import TabHeader from '@/components/admin/TabHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type AdminMessage = { role: 'user' | 'assistant'; content: string };
type PendingAction = { id: string; summary: string; expires_at: string };

const db = supabase as any;

const quickPrompts = [
  'Give me today’s business overview',
  'What do customers ask Zimmy most?',
  'Show May collections on the London route',
  'Which invoices are overdue?',
];

function routeOf(shipment: any) {
  const metadata = shipment.metadata || {};
  return metadata.collection?.route || metadata.collectionRoute || metadata.sender?.city || 'Unassigned';
}

function customerOf(shipment: any) {
  const sender = shipment.metadata?.sender || shipment.metadata?.senderDetails || {};
  return sender.name || `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || 'Unknown customer';
}

function invoiceBalance(shipment: any) {
  const invoice = shipment.metadata?.invoice;
  if (!invoice) return { currency: 'GBP', balance: 0 };
  const subtotal = Array.isArray(invoice.items)
    ? invoice.items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
    : 0;
  const discounted = Math.max(0, subtotal - Number(invoice.discount || 0));
  const total = discounted + discounted * (Number(invoice.taxRate || 0) / 100);
  const paid = Array.isArray(invoice.payments)
    ? invoice.payments.reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0)
    : invoice.paid ? total : 0;
  return { currency: invoice.currency || 'GBP', balance: Math.max(0, total - paid) };
}

function parseCollectionDate(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  const ukDate = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const normalised = raw.replace(/(\d{1,2})(?:st|nd|rd|th)\b/gi, '$1');
  const parsed = isoDate
    ? new Date(`${isoDate}T12:00:00Z`)
    : ukDate
      ? new Date(`${ukDate[3]}-${ukDate[2].padStart(2, '0')}-${ukDate[1].padStart(2, '0')}T12:00:00Z`)
      : new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatCollectionDate(value: unknown) {
  const parsed = parseCollectionDate(value);
  return parsed ? parsed.toLocaleDateString('en-GB') : String(value || 'To be confirmed');
}

function formatMoneyMap(values: Record<string, number>) {
  const entries = Object.entries(values).filter(([, value]) => value > 0);
  if (!entries.length) return '£0.00';
  return entries.map(([currency, value]) =>
    `${currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ).join(' · ');
}

const ZimmyAdminTab = () => {
  const { toast } = useToast();
  const conversationId = useRef(`admin-${crypto.randomUUID()}`).current;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shipments, setShipments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [chatEvents, setChatEvents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [moderating, setModerating] = useState(false);
  const [reviewActionId, setReviewActionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([{
    role: 'assistant',
    content: 'I’m Admin Zimmy. Ask me about business performance, collection schedules, pickup lists, tracking, invoices or delivery notes. I will always ask for confirmation before changing live data.',
  }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [plannerMonth, setPlannerMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [plannerRoute, setPlannerRoute] = useState('');

  const fetchAnalytics = useCallback(async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    try {
      const [shipmentResult, paymentResult, requestResult, chatResult, scheduleResult, reviewResult] = await Promise.all([
        db.from('shipments').select('*').order('created_at', { ascending: false }).limit(1000),
        db.from('payments').select('*').order('created_at', { ascending: false }).limit(1000),
        db.from('customer_requests').select('*').order('created_at', { ascending: false }).limit(1000),
        db.from('zimmy_chat_events').select('*').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(1000),
        db.from('collection_schedules').select('*').limit(200),
        db.from('reviews').select('id, rating, comment, created_at, moderation_status, moderation_sentiment, moderation_reason, profiles(full_name)').order('created_at', { ascending: false }).limit(300),
      ]);
      const firstError = [shipmentResult, paymentResult, requestResult, chatResult, scheduleResult].find((result) => result.error)?.error;
      if (firstError) throw firstError;
      setShipments(shipmentResult.data || []);
      setPayments(paymentResult.data || []);
      setRequests(requestResult.data || []);
      setChatEvents(chatResult.data || []);
      // Reviews moderation columns may not exist until the moderate-review
      // function's setup has run; treat that as an empty list, not a failure.
      setReviews(reviewResult.error ? [] : (reviewResult.data || []));
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      setSchedules((scheduleResult.data || [])
        .filter((schedule: any) => {
          const date = parseCollectionDate(schedule.pickup_date);
          return date && date.getTime() >= startOfToday.getTime();
        })
        .sort((left: any, right: any) =>
          (parseCollectionDate(left.pickup_date)?.getTime() || 0) -
          (parseCollectionDate(right.pickup_date)?.getTime() || 0)
        ));
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Could not load Zimmy analytics.';
      toast({ title: 'Analytics unavailable', description, variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnalytics();
    const channel = supabase.channel('admin-zimmy-analytics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'zimmy_chat_events' }, () => fetchAnalytics(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_requests' }, () => fetchAnalytics(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => fetchAnalytics(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAnalytics]);

  const analytics = useMemo(() => {
    const activeStatuses = new Set(['Booking Confirmed', 'Ready for Pickup', 'Collected', 'In Transit', 'InTransit to Zimbabwe', 'Goods Arrived in Zimbabwe', 'Processing in ZW Warehouse', 'Out for Delivery']);
    const revenue = payments.reduce((acc: Record<string, number>, payment) => {
      const status = String(payment.payment_status || '').toLowerCase();
      if (status === 'paid' || status === 'completed') {
        const currency = payment.currency || 'GBP';
        acc[currency] = (acc[currency] || 0) + Number(payment.amount || 0);
      }
      return acc;
    }, {});
    const outstanding = shipments.reduce((acc: Record<string, number>, shipment) => {
      const invoice = invoiceBalance(shipment);
      acc[invoice.currency] = (acc[invoice.currency] || 0) + invoice.balance;
      return acc;
    }, {});
    const intentCounts = chatEvents.reduce((acc: Record<string, number>, event) => {
      const intent = event.intent || 'general';
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {});
    const routeCounts = shipments.reduce((acc: Record<string, number>, shipment) => {
      const route = routeOf(shipment);
      acc[route] = (acc[route] || 0) + 1;
      return acc;
    }, {});
    return {
      active: shipments.filter((shipment) => activeStatuses.has(shipment.status)).length,
      delivered: shipments.filter((shipment) => shipment.status === 'Delivered').length,
      newRequests: requests.filter((request) => request.status === 'New').length,
      revenue,
      outstanding,
      intents: Object.entries(intentCounts).sort((a, b) => b[1] - a[1]),
      routes: Object.entries(routeCounts).sort((a, b) => b[1] - a[1]),
    };
  }, [shipments, payments, requests, chatEvents]);

  const plannedPickups = useMemo(() => {
    const routeNeedle = plannerRoute.trim().toLowerCase();
    return shipments.filter((shipment) => {
      const metadata = shipment.metadata || {};
      const collectionDate = String(metadata.collection?.date || shipment.created_at || '').slice(0, 7);
      const route = routeOf(shipment).toLowerCase();
      return (!plannerMonth || collectionDate === plannerMonth) && (!routeNeedle || route.includes(routeNeedle));
    });
  }, [shipments, plannerMonth, plannerRoute]);

  const sendMessage = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || sending) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setSending(true);
    setPendingAction(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-zimmy', {
        body: { conversationId, messages: next.slice(-16) },
      });
      if (error) throw error;
      const reply = data?.reply || 'I could not prepare a response.';
      setMessages((current) => [...current, { role: 'assistant', content: reply }]);
      setPendingAction(data?.requiresConfirmation ? data.pendingAction : null);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Admin Zimmy could not respond.';
      setMessages((current) => [...current, { role: 'assistant', content: `I could not complete that request: ${description}` }]);
    } finally {
      setSending(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction || confirming) return;
    setConfirming(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-zimmy', {
        body: { conversationId, confirmActionId: pendingAction.id },
      });
      if (error) throw error;
      setMessages((current) => [...current, { role: 'assistant', content: data?.reply || 'The action was completed.' }]);
      setPendingAction(null);
      toast({ title: 'Zimmy action completed', description: 'The live system has been updated.' });
      fetchAnalytics(true);
    } catch (error) {
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'The action could not be completed.',
        variant: 'destructive',
      });
    } finally {
      setConfirming(false);
    }
  };

  const reviewStats = useMemo(() => ({
    pending: reviews.filter((review) => (review.moderation_status || 'pending') === 'pending').length,
    flagged: reviews.filter((review) => review.moderation_status === 'flagged'),
    published: reviews.filter((review) => review.moderation_status === 'published').length,
  }), [reviews]);

  const runReviewModeration = async () => {
    if (moderating) return;
    setModerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('moderate-review', {
        body: { action: 'moderate' },
      });
      if (error) throw error;
      toast({
        title: 'Zimmy moderation complete',
        description: `${data?.moderated ?? 0} review(s) checked. Positive and okay reviews are now live; bad ones are flagged below.`,
      });
      fetchAnalytics(true);
    } catch (error) {
      toast({
        title: 'Moderation failed',
        description: error instanceof Error ? error.message : 'Zimmy could not moderate the reviews.',
        variant: 'destructive',
      });
    } finally {
      setModerating(false);
    }
  };

  const updateFlaggedReview = async (reviewId: string, status: 'published' | 'hidden') => {
    if (reviewActionId) return;
    setReviewActionId(reviewId);
    try {
      const { error } = await supabase.functions.invoke('moderate-review', {
        body: { action: 'admin_update', reviewId, status },
      });
      if (error) throw error;
      toast({
        title: status === 'published' ? 'Review published' : 'Review kept hidden',
        description: status === 'published'
          ? 'The review is now visible on the public reviews page.'
          : 'The review stays off the public page.',
      });
      fetchAnalytics(true);
    } catch (error) {
      toast({
        title: 'Action failed',
        description: error instanceof Error ? error.message : 'The review could not be updated.',
        variant: 'destructive',
      });
    } finally {
      setReviewActionId(null);
    }
  };

  const maxIntent = Number(analytics.intents[0]?.[1] || 1);

  return (
    <div className="space-y-5">
      <TabHeader
        title="Zimmy — AI Operations Centre"
        description="Live business intelligence, collection planning and permission-controlled admin assistance."
        actions={
          <Button variant="outline" size="sm" onClick={() => fetchAnalytics(true)} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Total shipments', value: shipments.length, icon: Package, detail: `${analytics.active} active` },
          { label: 'Revenue recorded', value: formatMoneyMap(analytics.revenue), icon: TrendingUp, detail: 'Paid transactions' },
          { label: 'Outstanding invoices', value: formatMoneyMap(analytics.outstanding), icon: Wallet, detail: 'Across currencies' },
          { label: 'New customer requests', value: analytics.newRequests, icon: MessageSquare, detail: `${requests.length} total requests` },
          { label: 'Zimmy conversations', value: chatEvents.length, icon: Bot, detail: 'Last 30 days' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{loading ? '—' : stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
                </div>
                <span className="rounded-xl bg-zim-green/10 p-2 text-zim-green"><stat.icon className="h-5 w-5" /></span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-zim-green/10 via-transparent to-zim-yellow/10 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-zim-green" /> Ask Admin Zimmy</CardTitle>
            <p className="text-sm text-muted-foreground">Reads are immediate. Every change to live data requires your confirmation.</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[390px] space-y-3 overflow-y-auto bg-muted/20 p-4">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${message.role === 'user' ? 'rounded-br-sm bg-zim-green text-white' : 'rounded-bl-sm border bg-background text-foreground'}`}>
                    {message.content}
                  </div>
                </div>
              ))}
              {sending && <div className="flex justify-start"><div className="rounded-2xl border bg-background p-3"><Loader2 className="h-4 w-4 animate-spin" /></div></div>}
            </div>

            {pendingAction && (
              <div className="border-y border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-amber-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">Confirmation required</p>
                    <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{pendingAction.summary}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={confirmAction} disabled={confirming} className="bg-amber-600 hover:bg-amber-700">
                        {confirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Confirm change
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPendingAction(null)} disabled={confirming}>Cancel</Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t p-3">
              <div className="mb-3 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button key={prompt} onClick={() => sendMessage(prompt)} disabled={sending} className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:border-zim-green hover:text-zim-green disabled:opacity-50">
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') sendMessage(); }}
                  placeholder="Ask about May London pickups, overdue invoices, schedules…"
                  disabled={sending}
                />
                <Button onClick={() => sendMessage()} disabled={sending || !input.trim()} className="bg-zim-green hover:bg-zim-green-dark" aria-label="Send to Admin Zimmy">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4 text-zim-green" /> What customers request most</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {analytics.intents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Zimmy demand analytics will appear as customers chat.</p>
              ) : analytics.intents.slice(0, 8).map(([intent, count]) => (
                <div key={intent}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="capitalize">{intent.replaceAll('_', ' ')}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-zim-green" style={{ width: `${Math.max(8, (Number(count) / maxIntent) * 100)}%` }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-zim-green" /> Upcoming collection schedules</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {schedules.slice(0, 6).map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div><p className="text-sm font-semibold">{schedule.route}</p><p className="text-xs text-muted-foreground">{schedule.country || 'UK'} · {Array.isArray(schedule.areas) ? schedule.areas.slice(0, 3).join(', ') : String(schedule.areas || '')}</p></div>
                  <Badge variant="outline" className="whitespace-nowrap">{formatCollectionDate(schedule.pickup_date)}</Badge>
                </div>
              ))}
              {!schedules.length && <p className="text-sm text-muted-foreground">No upcoming schedules found.</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg"><Star className="h-5 w-5 text-zim-green" /> Review moderation</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Zimmy publishes positive and okay reviews automatically. Bad reviews are held here for your decision.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary">{reviewStats.published} live</Badge>
                <Badge variant="outline">{reviewStats.pending} pending</Badge>
                <Badge variant="destructive">{reviewStats.flagged.length} flagged</Badge>
              </div>
              <Button size="sm" variant="outline" onClick={runReviewModeration} disabled={moderating || !reviewStats.pending}>
                {moderating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Run Zimmy moderation
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewStats.flagged.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No flagged reviews right now. {reviewStats.pending > 0 ? `${reviewStats.pending} review(s) are waiting for Zimmy — run moderation above.` : 'Zimmy is keeping the public page clean.'}
            </p>
          ) : reviewStats.flagged.map((review: any) => (
            <div key={review.id} className="rounded-lg border border-red-200 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{review.profiles?.full_name || 'Anonymous'}</span>
                    <span className="flex items-center gap-0.5 text-sm font-medium text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-current" /> {review.rating}/5
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString('en-GB')}</span>
                  </div>
                  <p className="mt-1 text-sm">{review.comment || '(no comment)'}</p>
                  {review.moderation_reason && (
                    <p className="mt-1 text-xs text-red-700 dark:text-red-400">Zimmy: {review.moderation_reason}</p>
                  )}
                </div>
                <div className="flex flex-none gap-2">
                  <Button size="sm" variant="outline" disabled={reviewActionId === review.id} onClick={() => updateFlaggedReview(review.id, 'published')}>
                    {reviewActionId === review.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />}
                    Publish anyway
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={reviewActionId === review.id} onClick={() => updateFlaggedReview(review.id, 'hidden')}>
                    <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                    Keep hidden
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5 text-zim-green" /> Collection-period pickup planner</CardTitle>
          <p className="text-sm text-muted-foreground">Filter the live booking list by collection month and route before assigning drivers or exporting delivery notes.</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <Input type="month" value={plannerMonth} onChange={(event) => setPlannerMonth(event.target.value)} className="sm:w-48" />
            <Input value={plannerRoute} onChange={(event) => setPlannerRoute(event.target.value)} placeholder="Route, e.g. London" className="sm:max-w-xs" />
            <Badge variant="secondary" className="w-fit self-center">{plannedPickups.length} pickups</Badge>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Reference</th><th className="p-3">Customer</th><th className="p-3">Route</th><th className="p-3">Collection address</th><th className="p-3">Status</th></tr></thead>
              <tbody>
                {plannedPickups.slice(0, 100).map((shipment) => (
                  <tr key={shipment.id} className="border-t"><td className="p-3 font-mono">{shipment.customer_reference || shipment.tracking_number}</td><td className="p-3 font-medium">{customerOf(shipment)}</td><td className="p-3">{routeOf(shipment)}</td><td className="max-w-sm truncate p-3 text-muted-foreground">{shipment.metadata?.sender?.address || shipment.origin}</td><td className="p-3"><Badge variant="outline">{shipment.status}</Badge></td></tr>
                ))}
                {!plannedPickups.length && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No pickups match this month and route.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZimmyAdminTab;
