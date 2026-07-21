import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing } from '../../theme';
import { shortDate } from '../../lib/format';
import { ScreenHeader, StatCard, Segmented, Badge, BADGE, Avatar, SkeletonList, EmptyState, ErrorState, SectionLabel, Card } from '../../components/adminui';

// Staff Control Centre: role-filtered staff directory with attendance,
// performance, vehicle and leave management, plus admin-only invitations
// (accounts are created by Supabase Auth email invite — no passwords here).

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

const ROLE_FILTERS = ['all', 'drivers', 'dispatchers', 'finance', 'admins'] as const;
const ROLES = ['driver', 'dispatcher', 'logistics', 'finance', 'admin'] as const;

function matchesRole(record: StaffRecord, filter: (typeof ROLE_FILTERS)[number]) {
  if (filter === 'all') return true;
  if (filter === 'drivers') return record.role === 'driver';
  if (filter === 'dispatchers') return ['dispatcher', 'logistics'].includes(record.role);
  if (filter === 'finance') return record.role === 'finance';
  return record.isAdmin || record.role === 'admin';
}

export default function StaffRecordsScreen() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof ROLE_FILTERS)[number]>('all');
  const [detail, setDetail] = useState<StaffRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  // Add-staff form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<(typeof ROLES)[number]>('driver');
  // Edit fields
  const [vehicleInput, setVehicleInput] = useState('');

  const load = useCallback(async () => {
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('admin_staff_records');
    if (rpcError) { setError(rpcError.message); return; }
    setStaff((data || []) as StaffRecord[]);
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);

  const filtered = useMemo(() => staff.filter((s) => matchesRole(s, filter)), [filter, staff]);
  const activeToday = staff.filter((s) => s.attendanceToday && !s.attendanceToday.clockedOutAt).length;
  const onLeave = staff.filter((s) => s.onLeave).length;
  const inactive = staff.filter((s) => !s.active).length;

  const update = async (id: string, patch: Record<string, unknown>, message?: string) => {
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('admin_update_staff', { p_user_id: id, p_patch: patch });
      if (rpcError) throw rpcError;
      if (message) Alert.alert('Updated', message);
      await load();
      setDetail((d) => d && d.id === id ? {
        ...d,
        ...('role' in patch ? { role: String(patch.role), isAdmin: patch.role === 'admin' } : {}),
        ...('onLeave' in patch ? { onLeave: Boolean(patch.onLeave) } : {}),
        ...('active' in patch ? { active: Boolean(patch.active) } : {}),
        ...('vehicle' in patch ? { vehicle: String(patch.vehicle || '') || null } : {}),
        ...('driverType' in patch ? { driverType: String(patch.driverType || '') || null } : {}),
      } : d);
    } catch (e: any) {
      Alert.alert('Update failed', e?.message || 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const invite = async () => {
    if (!newEmail.trim() || !newName.trim()) { Alert.alert('Missing details', 'Enter at least a name and email address.'); return; }
    setBusy(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('staff-ops', {
        body: { action: 'invite_staff', email: newEmail.trim(), fullName: newName.trim(), phone: newPhone.trim(), role: newRole },
      });
      if (fnError) throw fnError;
      if ((data as any)?.error) throw new Error((data as any).error);
      Alert.alert('Invitation sent', `${newEmail.trim()} has been invited as ${newRole}. They set their own password from the email.`);
      setAdding(false); setNewName(''); setNewEmail(''); setNewPhone(''); setNewRole('driver');
      await load();
    } catch (e: any) {
      Alert.alert('Could not invite', e?.message || 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const resetAccess = async (record: StaffRecord) => {
    if (!record.email) { Alert.alert('No email', 'This account has no email to send a reset to.'); return; }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(record.email);
    if (resetError) Alert.alert('Could not send reset', resetError.message);
    else Alert.alert('Reset sent', `${record.email} has been sent a password-reset email.`);
  };

  const staffBadge = (s: StaffRecord) =>
    !s.active ? { label: 'Inactive', tone: BADGE.grey }
      : s.onLeave ? { label: 'On leave', tone: BADGE.purple }
      : { label: 'Active', tone: BADGE.green };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
        <ScreenHeader title="Staff Control Centre" subtitle={`${staff.length} staff accounts`}
          right={
            <Pressable style={styles.addButton} onPress={() => setAdding(true)}>
              <Ionicons name="person-add-outline" size={15} color={colors.white} />
              <Text style={styles.addText}>Add Staff</Text>
            </Pressable>
          } />

        <Segmented options={ROLE_FILTERS} value={filter} onChange={setFilter}
          labels={{ all: 'All', drivers: 'Drivers', dispatchers: 'Dispatchers', finance: 'Finance', admins: 'Admins' }} />

        {error ? <ErrorState message={error} onRetry={load} /> : null}
        {loading ? <SkeletonList rows={6} /> : (
          <>
            <View style={styles.statRow}>
              <StatCard label="Total staff" value={staff.length} icon="people-outline" />
              <StatCard label="Active today" value={activeToday} icon="time-outline" tone={colors.blue} toneSoft={colors.blueSoft} />
            </View>
            <View style={styles.statRow}>
              <StatCard label="On leave" value={onLeave} icon="airplane-outline" tone={colors.purple} toneSoft={colors.purpleSoft} />
              <StatCard label="Inactive" value={inactive} icon="close-circle-outline" tone={colors.orange} toneSoft={colors.orangeSoft} />
            </View>

            <SectionLabel text={filter === 'all' ? 'All staff' : filter} />
            {filtered.length === 0 ? (
              <EmptyState icon="people-outline" title="No staff in this group" />
            ) : filtered.map((s) => {
              const badge = staffBadge(s);
              return (
                <Pressable key={s.id} style={styles.staffRow} onPress={() => { setDetail(s); setVehicleInput(s.vehicle || ''); }}>
                  <Avatar name={s.fullName || s.email} size={42} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowTop}>
                      <Text style={styles.staffName} numberOfLines={1}>{s.fullName || s.email || 'Staff member'}</Text>
                      <Badge text={badge.label} tone={badge.tone} />
                    </View>
                    <Text style={styles.staffMeta}>
                      ID {s.id.slice(0, 8).toUpperCase()} · {s.isAdmin ? 'admin' : s.role}
                      {s.role === 'driver' && s.driverType ? ` · ${s.driverType}` : ''}
                      {s.vehicle ? ` · ${s.vehicle}` : ''}
                    </Text>
                    <Text style={styles.staffMeta}>
                      {s.attendanceToday
                        ? s.attendanceToday.clockedOutAt ? 'Clocked out today' : `Clocked in ${new Date(s.attendanceToday.clockedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : s.lastAttendance ? `Last active ${shortDate(s.lastAttendance)}` : 'No attendance yet'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Staff detail */}
      <Modal visible={Boolean(detail)} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {detail ? (
                <>
                  <View style={styles.detailHead}>
                    <Avatar name={detail.fullName || detail.email} size={52} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailName}>{detail.fullName || detail.email}</Text>
                      <Text style={styles.staffMeta}>{detail.email}{detail.phone ? ` · ${detail.phone}` : ''}</Text>
                      <Text style={styles.staffMeta}>Staff ID {detail.id.slice(0, 8).toUpperCase()} · joined {shortDate(detail.createdAt)}</Text>
                    </View>
                    <Badge text={staffBadge(detail).label} tone={staffBadge(detail).tone} />
                  </View>

                  <Card style={{ marginTop: spacing.md }}>
                    <Text style={styles.blockLabel}>PERFORMANCE</Text>
                    <View style={styles.perfRow}>
                      <Perf label="Runs" value={String(detail.runStats?.runs ?? 0)} />
                      <Perf label="Stops done" value={String(detail.runStats?.completedStops ?? 0)} />
                      <Perf label="Exceptions" value={String(detail.runStats?.failedStops ?? 0)} />
                      <Perf label="Last run" value={detail.runStats?.lastRunDate ? shortDate(detail.runStats.lastRunDate) : '—'} />
                    </View>
                  </Card>

                  <Text style={styles.blockLabel}>ROLE</Text>
                  <View style={styles.chipWrap}>
                    {ROLES.map((role) => (
                      <Pressable key={role} style={[styles.chip, (detail.isAdmin ? 'admin' : detail.role) === role && styles.chipActive]}
                        onPress={() => update(detail.id, { role }, `Role changed to ${role}.`)}>
                        <Text style={[styles.chipText, (detail.isAdmin ? 'admin' : detail.role) === role && { color: colors.white }]}>{role}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {detail.role === 'driver' ? (
                    <>
                      <Text style={styles.blockLabel}>DRIVER TYPE</Text>
                      <View style={styles.chipWrap}>
                        {(['pickup', 'delivery', 'both'] as const).map((t) => (
                          <Pressable key={t} style={[styles.chip, (detail.driverType || 'both') === t && styles.chipActive]}
                            onPress={() => update(detail.id, { driverType: t })}>
                            <Text style={[styles.chipText, (detail.driverType || 'both') === t && { color: colors.white }]}>{t}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  ) : null}

                  <Text style={styles.blockLabel}>ASSIGNED VEHICLE</Text>
                  <View style={styles.vehicleRow}>
                    <TextInput style={[styles.input, { flex: 1 }]} value={vehicleInput} onChangeText={setVehicleInput}
                      placeholder="e.g. Luton van AB12 CDE" placeholderTextColor={colors.textFaint} />
                    <Pressable style={[styles.saveVehicle, busy && { opacity: 0.5 }]} disabled={busy}
                      onPress={() => update(detail.id, { vehicle: vehicleInput.trim() }, 'Vehicle updated.')}>
                      <Text style={styles.saveVehicleText}>Save</Text>
                    </Pressable>
                  </View>

                  <View style={styles.actionGrid}>
                    <ActionChip icon={detail.onLeave ? 'play-outline' : 'airplane-outline'}
                      label={detail.onLeave ? 'End leave' : 'Place on leave'}
                      onPress={() => update(detail.id, { onLeave: !detail.onLeave })} />
                    <ActionChip icon={detail.active ? 'ban-outline' : 'refresh-circle-outline'}
                      label={detail.active ? 'Deactivate' : 'Activate'} danger={detail.active}
                      onPress={() => update(detail.id, { active: !detail.active }, detail.active ? 'Account deactivated.' : 'Account reactivated.')} />
                    <ActionChip icon="key-outline" label="Reset access" onPress={() => resetAccess(detail)} />
                  </View>
                </>
              ) : null}
              <Pressable style={styles.modalCancel} onPress={() => setDetail(null)}><Text style={styles.modalCancelText}>Close</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add staff */}
      <Modal visible={adding} transparent animationType="slide" onRequestClose={() => setAdding(false)}>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.detailName}>Add staff member</Text>
              <Text style={styles.staffMeta}>They receive an email invitation and set their own password — nothing is stored here.</Text>
              <Text style={styles.blockLabel}>FULL NAME</Text>
              <TextInput style={styles.input} value={newName} onChangeText={setNewName} autoCapitalize="words" />
              <Text style={styles.blockLabel}>EMAIL</Text>
              <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
              <Text style={styles.blockLabel}>PHONE (OPTIONAL)</Text>
              <TextInput style={styles.input} value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
              <Text style={styles.blockLabel}>ROLE</Text>
              <View style={styles.chipWrap}>
                {ROLES.map((role) => (
                  <Pressable key={role} style={[styles.chip, newRole === role && styles.chipActive]} onPress={() => setNewRole(role)}>
                    <Text style={[styles.chipText, newRole === role && { color: colors.white }]}>{role}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={[styles.inviteButton, busy && { opacity: 0.5 }]} disabled={busy} onPress={invite}>
                <Text style={styles.inviteText}>Send invitation</Text>
              </Pressable>
              <Pressable style={styles.modalCancel} onPress={() => setAdding(false)}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Perf({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.perfLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.perfValue}>{value}</Text>
    </View>
  );
}

function ActionChip({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={[styles.action, danger && { backgroundColor: colors.redSoft }]} onPress={onPress}>
      <Ionicons name={icon} size={15} color={danger ? colors.danger : colors.primaryDark} />
      <Text style={[styles.actionLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 56, gap: spacing.sm },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  addText: { fontSize: 11.5, fontWeight: '800', color: colors.white },
  statRow: { flexDirection: 'row', gap: spacing.sm },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  staffName: { fontSize: 14, fontWeight: '800', color: colors.text, flexShrink: 1 },
  staffMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  modalShade: { flex: 1, backgroundColor: 'rgba(15,23,42,.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg, maxHeight: '90%' },
  detailHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  detailName: { fontSize: 17, fontWeight: '800', color: colors.text },
  blockLabel: { fontSize: 9.5, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5, marginTop: spacing.md, marginBottom: 6 },
  perfRow: { flexDirection: 'row', gap: spacing.sm },
  perfLabel: { fontSize: 8, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 },
  perfValue: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 11.5, fontWeight: '700', color: colors.textMuted, textTransform: 'capitalize' },
  vehicleRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 13.5 },
  saveVehicle: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 11 },
  saveVehicleText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  actionLabel: { fontSize: 11.5, fontWeight: '800', color: colors.primaryDark },
  inviteButton: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: 13, alignItems: 'center', marginTop: spacing.lg },
  inviteText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  modalCancel: { alignItems: 'center', paddingVertical: 12 },
  modalCancelText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
});
