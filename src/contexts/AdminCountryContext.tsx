import React, { createContext, useContext, useState, ReactNode } from 'react';

type Country = 'England' | 'Ireland';

interface AdminCountryContextType {
  selectedCountry: Country;
  setSelectedCountry: (country: Country) => void;
}

const AdminCountryContext = createContext<AdminCountryContextType | undefined>(undefined);

export const AdminCountryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>('England');

  return (
    <AdminCountryContext.Provider value={{ selectedCountry, setSelectedCountry }}>
      {children}
    </AdminCountryContext.Provider>
  );
};

export const useAdminCountry = (): AdminCountryContextType => {
  const context = useContext(AdminCountryContext);
  if (!context) {
    throw new Error('useAdminCountry must be used within an AdminCountryProvider');
  }
  return context;
};

export default AdminCountryContext;
