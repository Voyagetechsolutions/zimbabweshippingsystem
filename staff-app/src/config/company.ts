export const COMPANY = {
  name: 'Zimbabwe Shipping',
  websiteLabel: 'zimbabweshipping.com',
  websiteUrl: 'https://zimbabweshipping.com',
  supportEmail: 'info@zimbabweshipping.com',
  supportPhone: '+44 7584 100552',
} as const;

export const COMPANY_WHATSAPP_URL = `https://wa.me/${COMPANY.supportPhone.replace(/\D/g, '')}`;
