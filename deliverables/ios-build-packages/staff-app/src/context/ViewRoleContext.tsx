import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DashboardRole } from './AuthContext';

// Admins can work as any role — this remembers which dashboard they picked
// and lets them switch from the Account tab. Non-admins never see the picker.
interface ViewRoleValue {
  viewRole: DashboardRole | null;
  ready: boolean;
  chooseRole: (role: DashboardRole) => void;
  clearRole: () => void;
}

const KEY = 'staff-view-role-v1';
const ViewRoleContext = createContext<ViewRoleValue | undefined>(undefined);

export function ViewRoleProvider({ children }: { children: React.ReactNode }) {
  const [viewRole, setViewRole] = useState<DashboardRole | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((saved) => {
        if (saved === 'admin' || saved === 'finance' || saved === 'driver') setViewRole(saved);
      })
      .finally(() => setReady(true));
  }, []);

  const chooseRole = useCallback((role: DashboardRole) => {
    setViewRole(role);
    AsyncStorage.setItem(KEY, role).catch(() => {});
  }, []);

  const clearRole = useCallback(() => {
    setViewRole(null);
    AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  return (
    <ViewRoleContext.Provider value={{ viewRole, ready, chooseRole, clearRole }}>
      {children}
    </ViewRoleContext.Provider>
  );
}

export function useViewRole(): ViewRoleValue {
  const ctx = useContext(ViewRoleContext);
  if (!ctx) throw new Error('useViewRole must be used inside ViewRoleProvider');
  return ctx;
}
