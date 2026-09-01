// These must be supplied and evidenced by the owner. They are intentionally
// not guessed from a trading name, address or third-party company listing.
export const OWNER_VERIFIED_REGISTRATION = {
  registeredLegalName: import.meta.env.VITE_REGISTERED_LEGAL_NAME || '',
  companyNumber: import.meta.env.VITE_COMPANY_NUMBER || '',
  vatNumber: import.meta.env.VITE_VAT_NUMBER || '',
} as const;
