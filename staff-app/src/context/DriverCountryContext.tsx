import React, { createContext, useContext, useMemo, useState } from 'react';

export type DriverCountry = 'United Kingdom' | 'Ireland' | 'Zimbabwe';

type DriverCountryValue = {
  country: DriverCountry | null;
  chooseCountry: (country: DriverCountry) => void;
  clearCountry: () => void;
};

const DriverCountryContext = createContext<DriverCountryValue | undefined>(undefined);

// Kept in memory on purpose: a driver confirms the operating country at the
// start of each app session/shift instead of silently inheriting yesterday's.
export function DriverCountryProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountry] = useState<DriverCountry | null>(null);
  const value = useMemo(() => ({ country, chooseCountry: setCountry, clearCountry: () => setCountry(null) }), [country]);
  return <DriverCountryContext.Provider value={value}>{children}</DriverCountryContext.Provider>;
}

export function useDriverCountry() {
  const value = useContext(DriverCountryContext);
  if (!value) throw new Error('useDriverCountry must be used inside DriverCountryProvider');
  return value;
}
