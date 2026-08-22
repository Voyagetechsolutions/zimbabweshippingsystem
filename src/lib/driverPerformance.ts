import { supabase } from '@/integrations/supabase/client';

export type DriverPerformance = {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  onLeave: boolean;
  claimed: number;
  completed: number;
  issues: number;
  activeCollections: number;
  successRate: number;
  averageMinutes: number;
  daysWorked: number;
};

export async function loadDriverPerformance(days = 30): Promise<DriverPerformance[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id,full_name,email,phone,staff_active,on_leave')
    .eq('role', 'driver')
    .order('full_name');
  if (error) throw error;

  return Promise.all((profiles || []).map(async (profile: any) => {
    const { data, error: summaryError } = await (supabase.rpc as any)('driver_performance_summary', {
      p_driver_id: profile.id,
      p_days: days,
    });
    if (summaryError) throw summaryError;
    const summary = data || {};
    return {
      id: profile.id,
      name: profile.full_name || profile.email || 'Driver',
      email: profile.email || '',
      phone: profile.phone || '',
      active: profile.staff_active !== false,
      onLeave: Boolean(profile.on_leave),
      claimed: Number(summary.claimed || 0),
      completed: Number(summary.completed || 0),
      issues: Number(summary.issues || 0),
      activeCollections: Number(summary.active || 0),
      successRate: Number(summary.successRate || 0),
      averageMinutes: Number(summary.averageMinutes || 0),
      daysWorked: Number(summary.daysWorked || 0),
    };
  }));
}
