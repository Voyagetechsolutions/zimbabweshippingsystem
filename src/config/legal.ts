export const PUBLIC_BUSINESS_INFORMATION = {
  tradingName: 'Zimbabwe Shipping Services',
  founderAndDirector: 'Mr Tshakalisa Moyo',
  operatingAddress: [
    'Pastures Lodge Farm',
    'Chelveston Road',
    'Wellingborough NN9 6AA',
    'United Kingdom',
  ],
  email: 'info@zimbabweshipping.com',
  ukBookingsPhone: '+44 7584 100552',
  irelandBookingsPhone: '+353 87 195 4910',
  accountsPhone: '+44 7770 761266',
} as const;

// These must be supplied and evidenced by the owner. They are intentionally
// not guessed from a trading name, address or third-party company listing.
export const OWNER_VERIFIED_REGISTRATION = {
  registeredLegalName: import.meta.env.VITE_REGISTERED_LEGAL_NAME || '',
  companyNumber: import.meta.env.VITE_COMPANY_NUMBER || '',
  vatNumber: import.meta.env.VITE_VAT_NUMBER || '',
} as const;
