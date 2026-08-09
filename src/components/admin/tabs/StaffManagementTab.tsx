import React, { useCallback, useEffect, useMemo, useState } from 'react';
import TabHeader from '../TabHeader';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

import {
  Users, UserPlus, RefreshCcw, Loader2, Truck, Calculator, ShieldCheck,
  KeyRound, Plane, Ban, RotateCcw, AlertCircle,
} from 'lucide-react';

/**
 * Staff Management — invite and administer staff from the website admin.
 *
 * Mirrors the staff app's Staff Control Centre so an admin can do the same job
 * from a desktop. Both surfaces call the same server-side routines:
 *   - admin_staff_records()          read the directory (admin-gated)
 *   - admin_update_staff(id, patch)  change role / vehicle / leave / active
 *   - staff-ops { invite_staff }     create the account via a Supabase Auth
 *                                    email invite
 *
 * No password is ever entered or stored here: the invited person sets their own
 * from the email link.
 */

interface StaffRecord {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isAdmin: boolean;
  driverType: string | null;
  vehicle: string | null;
  onLeave: boolean;
  active: boolean;
  createdAt: string;
  attendanceToday: { clockedInAt: string; clockedOutAt: string | null } | null;
  lastAttendance: string | null;
  runStats: { runs: number; completedStops: number; failedStops: number; lastRunDate: string | null } | null;
}

// The roles an admin can assign. 'driver' and 'finance' are the two the business
// hires for; the rest already existed in the schema.
const ROLES = ['driver', 'finance', 'dispatcher', 'logistics', 'admin'] as const;
type Role = (typeof ROLES)[number];

const ROLE_FILTERS = [
  { value: 'all', label: 'All staff' },
  { value: 'driver', label: 'Drivers' },
  { value: 'finance', label: 'Finance' },
  { value: 'dispatcher', label: 'Dispatchers' },
  { value: 'admin', label: 'Admins' },
] as const;

const ROLE_ICON: Record<string, React.ElementType> = {
  driver: Truck,
  finance: Calculator,
  admin: ShieldCheck,
};

const safeDate = (value: string | null | undefined, pattern = 'd MMM yyyy') => {
  if (!value) return '—';
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, pattern) : '—';
};

const StaffManagementTab: React.FC = () => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>('driver');

  // Detail dialog
  const [detail, setDetail] = useState<StaffRecord | null>(null);
  const [vehicleInput, setVehicleInput] = useState('');

  const load = useCallback(async () => {
    setError(null);
    // Cast: the generated Database types are stale and don't list this RPC.
    const { data, error: rpcError } = await (supabase.rpc as any)('admin_staff_records');
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setStaff((data || []) as StaffRecord[]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staff.filter((member) => {
      const roleMatch =
        filter === 'all' ||
        (filter === 'admin' ? member.isAdmin || member.role === 'admin' : member.role === filter);
      const searchMatch =
        !query ||
        [member.fullName, member.email, member.phone, member.vehicle]
          .some((field) => String(field || '').toLowerCase().includes(query));
      return roleMatch && searchMatch;
    });
  }, [staff, filter, search]);

  const counts = useMemo(() => ({
    total: staff.length,
    drivers: staff.filter((member) => member.role === 'driver').length,
    finance: staff.filter((member) => member.role === 'finance').length,
    onDuty: staff.filter((member) => member.attendanceToday && !member.attendanceToday.clockedOutAt).length,
  }), [staff]);

  const update = async (id: string, patch: Record<string, unknown>, successMessage?: string) => {
    setBusy(true);
    try {
      const { error: rpcError } = await (supabase.rpc as any)('admin_update_staff', {
        p_user_id: id,
        p_patch: patch,
      });
      if (rpcError) throw rpcError;
      await load();
      // Keep the open dialog in step with what was just saved.
      setDetail((current) => {
        if (!current || current.id !== id) return current;
        return {
          ...current,
          ...('role' in patch ? { role: String(patch.role), isAdmin: patch.role === 'admin' } : {}),
          ...('onLeave' in patch ? { onLeave: Boolean(patch.onLeave) } : {}),
          ...('active' in patch ? { active: Boolean(patch.active) } : {}),
          ...('vehicle' in patch ? { vehicle: (String(patch.vehicle || '') || null) } : {}),
          ...('driverType' in patch ? { driverType: (String(patch.driverType || '') || null) } : {}),
        };
      });
      if (successMessage) toast({ title: 'Staff updated', description: successMessage });
    } catch (e: any) {
      toast({ title: 'Update failed', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      toast({
        title: 'Missing details',
        description: 'Enter at least a full name and an email address.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('staff-ops', {
        body: {
          action: 'invite_staff',
          email: newEmail.trim(),
          fullName: newName.trim(),
          phone: newPhone.trim(),
          role: newRole,
        },
      });
      if (fnError) throw fnError;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({
        title: 'Invitation sent',
        description: `${newEmail.trim()} has been invited as ${newRole}. They set their own password from the email.`,
      });
      setInviteOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewRole('driver');
      await load();
    } catch (e: any) {
      toast({
        title: 'Could not send the invitation',
        description: e?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const resetAccess = async (member: StaffRecord) => {
    if (!member.email) {
      toast({ title: 'No email address', description: 'This account has no email to send a reset to.', variant: 'destructive' });
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(member.email);
    if (resetError) {
      toast({ title: 'Could not send reset', description: resetError.message, variant: 'destructive' });
    } else {
      toast({ title: 'Reset email sent', description: `${member.email} can now set a new password.` });
    }
  };

  const statusBadge = (member: StaffRecord) => {
    if (!member.active) return <Badge variant="outline" className="text-gray-600">Inactive</Badge>;
    if (member.onLeave) return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">On leave</Badge>;
    if (member.attendanceToday && !member.attendanceToday.clockedOutAt) {
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">On duty</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Active</Badge>;
  };

  return (
    <div>
      <TabHeader
        title="Staff Management"
        description="Invite finance and driver staff, set roles, vehicles and leave."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={load} disabled={loading || busy}>
              <RefreshCcw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            <Button size="sm" className="bg-zim-green hover:bg-zim-green/90" onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add staff
            </Button>
          </>
        }
      />

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-4 flex items-start gap-2 text-sm text-red-800 dark:text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Could not load the staff directory</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total staff', value: counts.total, icon: Users },
          { label: 'Drivers', value: counts.drivers, icon: Truck },
          { label: 'Finance', value: counts.finance, icon: Calculator },
          { label: 'On duty today', value: counts.onDuty, icon: ShieldCheck },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zim-green/10">
                <stat.icon className="h-4 w-4 text-zim-green" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="Search name, email, phone or vehicle…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Directory */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading staff…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Users className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-gray-600 dark:text-gray-300">No staff match this view</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {staff.length === 0
                  ? 'Use “Add staff” to invite your first driver or finance user.'
                  : 'Try a different role filter or search term.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead className="hidden lg:table-cell">Vehicle</TableHead>
                    <TableHead className="hidden lg:table-cell">Runs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((member) => {
                    const RoleIcon = ROLE_ICON[member.isAdmin ? 'admin' : member.role] || Users;
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="font-medium">{member.fullName || member.email || 'Staff member'}</div>
                          <div className="text-xs text-gray-500">Joined {safeDate(member.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-sm capitalize">
                            <RoleIcon className="h-3.5 w-3.5 text-zim-green" />
                            {member.isAdmin ? 'admin' : member.role}
                          </span>
                          {member.role === 'driver' && member.driverType && (
                            <div className="text-xs text-gray-500 capitalize">{member.driverType}</div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          <div className="truncate max-w-[200px]">{member.email || '—'}</div>
                          <div className="text-xs text-gray-500">{member.phone || '—'}</div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{member.vehicle || '—'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {member.runStats?.runs ?? 0}
                          {member.runStats?.failedStops
                            ? <span className="text-xs text-amber-600"> · {member.runStats.failedStops} exc.</span>
                            : null}
                        </TableCell>
                        <TableCell>{statusBadge(member)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setDetail(member);
                              setVehicleInput(member.vehicle || '');
                            }}
                          >
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a staff member</DialogTitle>
            <DialogDescription>
              They receive an email invitation and choose their own password. No password is stored here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label htmlFor="staff-name">Full name</Label>
              <Input id="staff-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Tendai Moyo" />
            </div>
            <div>
              <Label htmlFor="staff-email">Email</Label>
              <Input id="staff-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="tendai@example.com" />
            </div>
            <div>
              <Label htmlFor="staff-phone">Phone (optional)</Label>
              <Input id="staff-phone" type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+44 7…" />
            </div>
            <div>
              <Label htmlFor="staff-role">Role</Label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as Role)}>
                <SelectTrigger id="staff-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Drivers get the run and scanning screens; finance gets invoicing and payments.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={busy}>Cancel</Button>
            <Button className="bg-zim-green hover:bg-zim-green/90" onClick={invite} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <UserPlus className="h-4 w-4 mr-1.5" />}
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / manage dialog */}
      <Dialog open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.fullName || detail.email}</DialogTitle>
                <DialogDescription>
                  {detail.email}{detail.phone ? ` · ${detail.phone}` : ''} · joined {safeDate(detail.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Runs', value: detail.runStats?.runs ?? 0 },
                    { label: 'Stops', value: detail.runStats?.completedStops ?? 0 },
                    { label: 'Exceptions', value: detail.runStats?.failedStops ?? 0 },
                    { label: 'Last run', value: detail.runStats?.lastRunDate ? safeDate(detail.runStats.lastRunDate, 'd MMM') : '—' },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2">
                      <p className="text-[10px] uppercase tracking-wide text-gray-500">{stat.label}</p>
                      <p className="text-sm font-semibold">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div>
                  <Label>Role</Label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {ROLES.map((role) => {
                      const active = (detail.isAdmin ? 'admin' : detail.role) === role;
                      return (
                        <Button
                          key={role}
                          size="sm"
                          variant={active ? 'default' : 'outline'}
                          className={active ? 'bg-zim-green hover:bg-zim-green/90 capitalize' : 'capitalize'}
                          disabled={busy}
                          onClick={() => update(detail.id, { role }, `Role changed to ${role}.`)}
                        >
                          {role}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {detail.role === 'driver' && (
                  <div>
                    <Label>Driver type</Label>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {(['pickup', 'delivery', 'both'] as const).map((type) => {
                        const active = (detail.driverType || 'both') === type;
                        return (
                          <Button
                            key={type}
                            size="sm"
                            variant={active ? 'default' : 'outline'}
                            className={active ? 'bg-zim-green hover:bg-zim-green/90 capitalize' : 'capitalize'}
                            disabled={busy}
                            onClick={() => update(detail.id, { driverType: type })}
                          >
                            {type}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="staff-vehicle">Assigned vehicle</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      id="staff-vehicle"
                      value={vehicleInput}
                      onChange={(event) => setVehicleInput(event.target.value)}
                      placeholder="e.g. Luton van AB12 CDE"
                    />
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => update(detail.id, { vehicle: vehicleInput.trim() }, 'Vehicle updated.')}
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => update(detail.id, { onLeave: !detail.onLeave }, detail.onLeave ? 'Leave ended.' : 'Placed on leave.')}
                  >
                    <Plane className="h-4 w-4 mr-1.5" />
                    {detail.onLeave ? 'End leave' : 'Place on leave'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    className={detail.active ? 'text-red-600 hover:text-red-700' : ''}
                    onClick={() => update(
                      detail.id,
                      { active: !detail.active },
                      detail.active ? 'Account deactivated.' : 'Account reactivated.',
                    )}
                  >
                    {detail.active ? <Ban className="h-4 w-4 mr-1.5" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}
                    {detail.active ? 'Deactivate' : 'Reactivate'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => resetAccess(detail)}>
                    <KeyRound className="h-4 w-4 mr-1.5" />
                    Send password reset
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManagementTab;
