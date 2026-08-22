import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffRole } from '@/hooks/useStaffRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Loader2, MapPin, PackageSearch, Truck } from 'lucide-react';
import StaffDashboardShell, { type ShellNavGroup } from './StaffDashboardShell';
import DriverCollectionsPanel from './driver/DriverCollectionsPanel';
import DriverLoadPanel from './driver/DriverLoadPanel';
import DriverDeliveryRunPanel from './driver/DriverDeliveryRunPanel';
import DriverNotesPanel from './driver/DriverNotesPanel';
import { clockDriver, getAttendance, type Attendance } from '@/lib/driverOps';

// The driver dashboard.
//
// Drivers are specialised: a pickup driver works the shared collection route in
// the UK and Ireland, a delivery driver loads a vehicle at the Zimbabwe depot and
// runs the drops. `profiles.driver_type` decides which sections exist, exactly as
// it does in the staff app, so nobody is shown the half of the journey they do
// not work.

function DutyBar({ attendance, busy, onClock }: {
  attendance: Attendance | null;
  busy: boolean;
  onClock: (action: 'in' | 'out') => void;
}) {
  const onDuty = Boolean(attendance && !attendance.clocked_out_at);
  const worked = attendance && onDuty
    ? (() => {
      const ms = Date.now() - new Date(attendance.clocked_in_at).getTime();
      return `${Math.floor(ms / 36e5)}h ${Math.floor((ms % 36e5) / 6e4)}m`;
    })()
    : null;

  if (attendance?.clocked_out_at) {
    return (
      <Card className="mb-3"><CardContent className="p-3 text-sm">
        <span className="font-semibold">Shift completed.</span>{' '}
        <span className="text-muted-foreground">Great work today — see you tomorrow.</span>
      </CardContent></Card>
    );
  }

  return (
    <Card className={`mb-3 ${onDuty ? 'bg-emerald-600 border-emerald-700 text-white' : ''}`}>
      <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3">
        {onDuty ? (
          <>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-emerald-100 font-semibold">On duty</p>
                <p className="text-lg font-bold">
                  since {new Date(attendance!.clocked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-emerald-100 font-semibold">Worked</p>
                <p className="text-lg font-bold">{worked}</p>
              </div>
            </div>
            <Button size="sm" variant="secondary" className="h-8 text-xs" disabled={busy} onClick={() => onClock('out')}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Clock out'}
            </Button>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-semibold">Ready to work</p>
              <p className="text-xs text-muted-foreground">Clock in to unlock today’s work.</p>
            </div>
            <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => onClock('in')}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Clock in'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function DriverDashboardContent() {
  const { user } = useAuth();
  const { driverType } = useStaffRole();
  const { toast } = useToast();

  const doesCollections = driverType === 'pickup' || driverType === 'both';
  const doesDeliveries = driverType === 'delivery' || driverType === 'both';

  const [activeTab, setActiveTab] = useState(doesCollections ? 'collections' : 'deliveries');
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [clockBusy, setClockBusy] = useState(false);
  // Ticks once a minute purely so the "worked" figure in the duty bar advances
  // without re-querying attendance.
  const [, setTick] = useState(0);

  // Keep the first tab honest if the profile loads after the first render.
  useEffect(() => {
    setActiveTab((current) => {
      if (current === 'collections' && !doesCollections) return 'deliveries';
      if (current === 'deliveries' && !doesDeliveries) return 'collections';
      return current;
    });
  }, [doesCollections, doesDeliveries]);

  const refreshAttendance = useCallback(async () => {
    if (!user?.id) return;
    setAttendance(await getAttendance(user.id));
  }, [user?.id]);

  useEffect(() => { refreshAttendance(); }, [refreshAttendance]);

  // Keeps the "worked" figure moving without re-querying.
  useEffect(() => {
    if (!attendance || attendance.clocked_out_at) return;
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, [attendance]);

  const clock = async (action: 'in' | 'out') => {
    setClockBusy(true);
    try {
      setAttendance(await clockDriver(action));
      toast({ title: action === 'in' ? 'Clocked in' : 'Clocked out' });
    } catch (e: any) {
      toast({ title: `Could not clock ${action}`, description: e?.message, variant: 'destructive' });
    } finally { setClockBusy(false); }
  };

  const onDuty = Boolean(attendance && !attendance.clocked_out_at);

  const navGroups: ShellNavGroup[] = useMemo(() => {
    const groups: ShellNavGroup[] = [];
    if (doesCollections) {
      groups.push({
        key: 'collections',
        label: 'Collections',
        items: [{ value: 'collections', label: "Today's route", icon: MapPin }],
      });
    }
    if (doesDeliveries) {
      groups.push({
        key: 'deliveries',
        label: 'Deliveries',
        items: [
          { value: 'deliveries', label: 'Delivery run', icon: Truck },
          { value: 'load', label: 'Load vehicle', icon: PackageSearch },
          { value: 'notes', label: 'Delivery notes', icon: FileText },
        ],
      });
    }
    return groups;
  }, [doesCollections, doesDeliveries]);

  const renderTab = () => {
    switch (activeTab) {
      case 'collections': return <DriverCollectionsPanel onDuty={onDuty} />;
      case 'deliveries': return <DriverDeliveryRunPanel onDuty={onDuty} onGoToLoad={() => setActiveTab('load')} />;
      case 'load': return <DriverLoadPanel onDuty={onDuty} />;
      case 'notes': return <DriverNotesPanel />;
      default: return null;
    }
  };

  return (
    <StaffDashboardShell
      brandTitle="Driver"
      brandSubtitle={doesCollections && doesDeliveries ? 'Collections & deliveries' : doesDeliveries ? 'Deliveries' : 'Collections'}
      brandIcon={Truck}
      navGroups={navGroups}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <DutyBar attendance={attendance} busy={clockBusy} onClock={clock} />
      {renderTab()}
    </StaffDashboardShell>
  );
}
