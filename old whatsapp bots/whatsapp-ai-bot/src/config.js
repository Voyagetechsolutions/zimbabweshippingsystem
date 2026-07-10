import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  whatsappToken: process.env.WHATSAPP_TOKEN,
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  whatsappAppSecret: process.env.WHATSAPP_APP_SECRET,
  whatsappGraphVersion: process.env.WHATSAPP_GRAPH_VERSION || 'v21.0',
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  businessName: process.env.BUSINESS_NAME || 'Zimbabwe Shipping',
  businessRegion: process.env.BUSINESS_REGION || 'Ireland',
  humanHandoffNumber: process.env.HUMAN_HANDOFF_NUMBER || '',
};

export function assertRuntimeConfig() {
  const missing = [];

  if (!config.whatsappToken) missing.push('WHATSAPP_TOKEN');
  if (!config.whatsappPhoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!config.whatsappVerifyToken) missing.push('WHATSAPP_VERIFY_TOKEN');
  if (!config.openAiApiKey) missing.push('OPENAI_API_KEY');

  if (missing.length) {
    console.warn(`Missing environment variables: ${missing.join(', ')}`);
  }
}
