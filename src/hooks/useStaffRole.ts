import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Which dashboard a signed-in account gets on the website.
//
// This deliberately mirrors staff-app/src/context/AuthContext.tsx: the same
// profile fields decide the same thing, so a finance user sees finance whether
// they open the phone app or the website, and neither surface can drift into
// showing someone the customer dashboard by accident.
//
//   admin / logistics -> admin dashboard
//   finance           -> finance dashboard
//   driver            -> driver dashboard
//   anything else     -> customer dashboard

export type StaffRole = 'admin' | 'finance' | 'driver' | 'customer';
export type DriverType = 'pickup' | 'delivery' | 'both';

export type StaffRoleState = {
  staffRole: StaffRole;
  driverType: DriverType;
  fullName: string | null;
  loading: boolean;
};

export function useStaffRole(): StaffRoleState {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [profile, setProfile] = useState<{ role: string | null; is_admin: boolean | null; driver_type: string | null; full_name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) { if (active) { setProfile(null); setLoading(false); } return; }
      const { data } = await (supabase as any)
        .from('profiles')
        .select('role,is_admin,driver_type,full_name')
        .eq('id', user.id)
        .maybeSingle();
      if (active) { setProfile(data || null); setLoading(false); }
    })();
    return () => { active = false; };
  }, [user]);

  const role = String(profile?.role || '').toLowerCase();
  let staffRole: StaffRole = 'customer';
  if (isAdmin || profile?.is_admin === true || role === 'admin' || role === 'logistics') staffRole = 'admin';
  else if (role === 'finance') staffRole = 'finance';
  else if (role === 'driver') staffRole = 'driver';

  const savedType = String(profile?.driver_type || '').toLowerCase();
  const driverType: DriverType = savedType === 'pickup' || savedType === 'delivery' ? savedType : 'both';

  return { staffRole, driverType, fullName: profile?.full_name ?? null, loading: loading || authLoading };
}
