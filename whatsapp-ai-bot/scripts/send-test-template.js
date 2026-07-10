import dotenv from 'dotenv';

dotenv.config();

const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || 'v21.0';
const token = process.env.WHATSAPP_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const to = process.env.WHATSAPP_TEST_RECIPIENT;

if (!token || !phoneNumberId || !to) {
  console.error('Missing WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, or WHATSAPP_TEST_RECIPIENT in .env');
  process.exit(1);
}

const url = `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`;

const response = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: 'en_US' },
    },
  }),
});

const body = await response.text();

if (!response.ok) {
  console.error(`Meta test send failed (${response.status}):`);
  console.error(body);
  process.exit(1);
}

console.log('Meta test template sent successfully:');
console.log(body);
